import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'

const MedicalDashboard = () => {
  const { user, logout } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const downloadPdf = async (pdfUrl, fileName) => {
    try {
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      // Ensure .pdf extension is always present
      const fileNameWithExt = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
      anchor.download = fileNameWithExt
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download failed:', error)
      toast.error('Failed to download PDF')
    }
  }

  const viewPdf = async (pdfUrl) => {
    try {
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch PDF')
      }

      // Get the blob and ensure it has the correct MIME type
      const blob = await response.blob()
      
      // Check Content-Type header first
      const contentType = response.headers.get('content-type') || ''
      
      // If blob doesn't have PDF MIME type, create new blob with correct type
      let pdfBlob = blob
      if (!blob.type.includes('pdf') && !contentType.includes('pdf')) {
        // Check first few bytes to verify it's actually a PDF
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const isPdf = uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46
        
        if (!isPdf) {
          // Check if it's HTML error page
          const text = new TextDecoder().decode(uint8Array.slice(0, 100))
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            toast.error('PDF not found. Please try downloading instead.')
            return
          }
        }
        
        // Create new blob with explicit PDF MIME type
        pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })
      }
      
      const url = window.URL.createObjectURL(pdfBlob)
      
      // Open in new tab with proper PDF viewer
      const newWindow = window.open('', '_blank')
      
      if (!newWindow) {
        toast.error('Please allow popups to view PDF')
        window.URL.revokeObjectURL(url)
        return
      }
      
      // Set the location to the blob URL
      newWindow.location.href = url
      
      // Clean up after a longer delay to ensure PDF loads
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (error) {
      console.error('PDF view failed:', error)
      toast.error('Failed to view PDF. Please try downloading instead.')
    }
  }

  const handleViewPrescription = async (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available')
        return
      }

      // First try to get the stored PDF URL
      const pdfUrl = patient.prescription.pdfPath ? getPDFUrl(patient.prescription.pdfPath) : null
      
      if (pdfUrl) {
        // Use the stored PDF
        viewPdf(pdfUrl)
      } else {
        // Generate PDF on the fly if no stored PDF exists
        try {
          const doctorInfo = patient.doctor || {}
          const pdfBase64 = generatePrescriptionPDF(patient, doctorInfo, patient.prescription)
          
          // Convert base64 to blob and open in new tab
          const base64Data = pdfBase64.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'application/pdf' })
          
          const url = window.URL.createObjectURL(blob)
          
          // Open in new tab with proper PDF viewer
          const newWindow = window.open(url, '_blank')
          
          if (!newWindow) {
            toast.error('Please allow popups to view PDF')
            return
          }
          
          // Clean up after a longer delay to ensure PDF loads
          setTimeout(() => window.URL.revokeObjectURL(url), 5000)
        } catch (err) {
          console.error('PDF generation failed:', err)
          toast.error('Failed to generate PDF. Please try again.')
        }
      }
    } catch (e) {
      console.error('View failed:', e)
      toast.error('Failed to view PDF')
    }
  }

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const res = await api.get('/patient')
      const withRx = (res.data.data || []).filter(p => p.prescription)
      setPatients(withRx)
    } catch (e) {
      toast.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const getPDFUrl = (pdfPath) => {
    if (!pdfPath) return null
    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      return pdfPath
    }
    const baseURL = api.defaults.baseURL || (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
    const backendBase = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL
    const cleanPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`
    return `${backendBase}${cleanPath}`
  }

  const handleDownload = async (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available')
        return
      }

      // First try to get the stored PDF URL
      const pdfUrl = patient.prescription.pdfPath ? getPDFUrl(patient.prescription.pdfPath) : null
      
      if (pdfUrl) {
        // Use the stored PDF - ensure .pdf extension in filename
        const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber}`
        downloadPdf(pdfUrl, fileName) // downloadPdf will ensure .pdf extension
      } else {
        // Generate PDF on the fly if no stored PDF exists
        try {
          const doctorInfo = patient.doctor || {}
          const pdfBase64 = generatePrescriptionPDF(patient, doctorInfo, patient.prescription)
          
          // Convert base64 to blob and download
          const base64Data = pdfBase64.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'application/pdf' })
          
          const url = window.URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          // Ensure .pdf extension is always present
          const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber}.pdf`
          anchor.download = fileName
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
          window.URL.revokeObjectURL(url)
          
          // Save PDF to backend so it's available for viewing
          try {
            await api.put(`/prescription/${patient._id}`, {
              diagnosis: patient.prescription.diagnosis,
              medicines: patient.prescription.medicines,
              notes: patient.prescription.notes || '',
              pdfData: pdfBase64
            })
            
            // Refresh the patient list to show the updated PDF path
            await fetchPatients()
            
            toast.success('Prescription downloaded and saved successfully')
          } catch (saveError) {
            console.error('Failed to save PDF to backend:', saveError)
            toast.success('Prescription downloaded successfully (not saved)')
          }
        } catch (err) {
          console.error('PDF generation failed:', err)
          toast.error('Failed to generate PDF. Please try again.')
        }
      }
    } catch (e) {
      console.error('Download failed:', e)
      toast.error('Failed to download PDF')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-purple-600">Tekisky</span>
                <span className="text-2xl sm:text-3xl font-semibold text-slate-800">Hospital</span>
              </div>
              <p className="mt-1 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 rounded-full">Medical Records Team</p>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">Secure, view-only access to doctor-issued prescriptions and patient history.</p>
            </div>
            <button onClick={logout} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">Logout</button>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-600">Total Prescriptions</p>
              <p className="text-xl font-bold text-purple-700">{patients.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 border border-green-100">
              <p className="text-xs text-green-600">Today</p>
              <p className="text-xl font-bold text-green-700">{patients.filter(p => new Date(p.prescription?.createdAt || p.createdAt).toDateString() === new Date().toDateString()).length}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600">Logged in</p>
              <p className="text-sm font-semibold text-blue-700 truncate">{user?.fullName || 'Medical Staff'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-600 shadow">Loading...</div>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by patient name or mobile..."
                className="w-full sm:w-96 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              />
            </div>
            <div className="space-y-4">
              {patients
                .filter((p) => {
                  const q = query.trim().toLowerCase()
                  if (!q) return true
                  return (
                    p.fullName?.toLowerCase().includes(q) ||
                    p.mobileNumber?.toLowerCase().includes(q)
                  )
                })
                .map((p, index) => {
                  const pdfUrl = p.prescription?.pdfPath && getPDFUrl(p.prescription.pdfPath)
                  return (
                    <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-semibold flex items-center justify-center">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900">{p.fullName}</h3>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-semibold">Token {p.tokenNumber}</span>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Age {p.age}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                              <span className="font-medium text-gray-700">Mobile:</span>
                              <span>{p.mobileNumber || 'Not provided'}</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                              <span className="font-medium text-gray-700">Issue:</span>
                              <span className="capitalize">{p.disease || '—'}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Prescribed on {new Date(p.prescription?.createdAt || p.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewPrescription(p)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <span role="img" aria-label="view">📄</span>
                            View Prescription
                          </button>
                          <button
                            onClick={() => handleDownload(p)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <span role="img" aria-label="download">📥</span>
                            Download PDF
                          </button>
                        </div>
                      </div>

                      {p.prescription?.medicines && p.prescription.medicines.length > 0 && (
                        <div className="mt-4 overflow-hidden border border-gray-200 rounded-xl">
                          <table className="w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                              <tr>
                                <th className="px-4 py-3">Medicine</th>
                                <th className="px-4 py-3">Dosage</th>
                                <th className="px-4 py-3">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.prescription.medicines.map((med, medIndex) => (
                                <tr key={`${p._id}-${medIndex}`} className="border-t border-gray-100">
                                  <td className="px-4 py-3 font-medium text-gray-900">{med.name || '—'}</td>
                                  <td className="px-4 py-3 text-gray-700">{med.dosage || '—'}</td>
                                  <td className="px-4 py-3 text-gray-700">{med.duration || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {p.prescription?.notes && (
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h4>
                          <p className="mt-1 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                            {p.prescription.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}

              {patients.length === 0 && (
                <div className="bg-white p-10 rounded-xl text-center text-gray-600 border">No prescriptions available</div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default MedicalDashboard




import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'

const MedicalDashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('prescriptions') // 'prescriptions' or 'medicines'
  const [patients, setPatients] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMedicines, setLoadingMedicines] = useState(false)
  const [query, setQuery] = useState('')
  const [medicineQuery, setMedicineQuery] = useState('')
  const [stats, setStats] = useState({ totalPrescriptions: 0, todayPrescriptions: 0 })
  const [medicineStats, setMedicineStats] = useState({ total: 0, lowStock: 0, expiringSoon: 0, expired: 0 })
  const [medicinePage, setMedicinePage] = useState(1)
  const [medicinePagination, setMedicinePagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

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

      const pdfUrl = patient.prescription.pdfPath ? getPDFUrl(patient.prescription.pdfPath) : null
      
      if (pdfUrl) {
        // Open PDF in new browser tab for viewing
        await viewPdf(pdfUrl)
      } else {
        toast.error('PDF not available for this prescription')
      }
    } catch (e) {
      console.error('View failed:', e)
      toast.error('Failed to view PDF')
    }
  }

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const res = await api.get('/medical-records/prescriptions')
      setPatients(res.data.data || [])
    } catch (e) {
      toast.error('Failed to load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/medical-records/stats')
      return res.data.data
    } catch (e) {
      console.error('Failed to load stats:', e)
      return { totalPrescriptions: 0, todayPrescriptions: 0 }
    }
  }

  const fetchMedicines = async (page = 1, search = '', sortField = 'name', sortDir = 'asc') => {
    try {
      setLoadingMedicines(true)
      const params = {
        page,
        limit: 50,
        sortBy: sortField,
        sortOrder: sortDir,
        ...(search && { search })
      }
      const res = await api.get('/inventory/medicines', { params })
      if (res.data.success) {
        setMedicines(res.data.data || [])
        setMedicineStats(res.data.stats || { total: 0, lowStock: 0, expiringSoon: 0, expired: 0 })
        setMedicinePagination(res.data.pagination || { page: 1, limit: 50, total: 0, pages: 1 })
      } else {
        throw new Error(res.data.message || 'Failed to load medicines')
      }
    } catch (e) {
      console.error('Error fetching medicines:', e)
      toast.error(e.response?.data?.message || 'Failed to load medicines. Please try again.')
      setMedicines([])
      setMedicineStats({ total: 0, lowStock: 0, expiringSoon: 0, expired: 0 })
    } finally {
      setLoadingMedicines(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await fetchPatients()
      const statsData = await fetchStats()
      setStats(statsData)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'medicines') {
      fetchMedicines(medicinePage, medicineQuery, sortBy, sortOrder)
    }
  }, [activeTab, medicinePage, medicineQuery, sortBy, sortOrder])

  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      setSortOrder(newOrder)
    } else {
      // Set new sort field with ascending order
      setSortBy(field)
      setSortOrder('asc')
    }
    setMedicinePage(1) // Reset to first page when sorting
  }

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return (
        <span className="text-gray-400 ml-1">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      )
    }
    return sortOrder === 'asc' ? (
      <span className="text-purple-600 ml-1">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </span>
    ) : (
      <span className="text-purple-600 ml-1">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    )
  }

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
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'prescriptions'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setActiveTab('medicines')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'medicines'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Medicines
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeTab === 'prescriptions' ? (
              <>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <p className="text-xs text-purple-600">Total Prescriptions</p>
                  <p className="text-xl font-bold text-purple-700">{stats.totalPrescriptions}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-xs text-green-600">Today</p>
                  <p className="text-xl font-bold text-green-700">{stats.todayPrescriptions}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600">Logged in</p>
                  <p className="text-sm font-semibold text-blue-700 truncate">{user?.fullName || 'Medical Staff'}</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <p className="text-xs text-purple-600">Total Medicines</p>
                  <p className="text-xl font-bold text-purple-700">{medicineStats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <p className="text-xs text-orange-600">Low Stock</p>
                  <p className="text-xl font-bold text-orange-700">{medicineStats.lowStock}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs text-red-600">Expiring Soon</p>
                  <p className="text-xl font-bold text-red-700">{medicineStats.expiringSoon}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {activeTab === 'prescriptions' ? (
          <>
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
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.feeStatus === 'paid'
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-orange-100 text-orange-700 border border-orange-200'
                              }`}>
                                {p.feeStatus === 'paid' ? '✓ Fees Paid' : '⏳ Pending'}
                              </span>
                            </div>
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
          </>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                value={medicineQuery}
                onChange={(e) => {
                  setMedicineQuery(e.target.value)
                  setMedicinePage(1)
                }}
                placeholder="Search medicines by name, generic name, or brand..."
                className="w-full sm:w-96 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              />
            </div>
            {loadingMedicines ? (
              <div className="bg-white rounded-xl p-8 text-center shadow">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600">Loading medicines...</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {medicines.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-700">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center">
                                  Name
                                  {getSortIcon('name')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('genericName')}
                              >
                                <div className="flex items-center">
                                  Generic Name
                                  {getSortIcon('genericName')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('manufacturer')}
                              >
                                <div className="flex items-center">
                                  Manufacturer
                                  {getSortIcon('manufacturer')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('form')}
                              >
                                <div className="flex items-center">
                                  Form
                                  {getSortIcon('form')}
                                </div>
                              </th>
                              <th className="px-4 py-3">Strength</th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('price')}
                              >
                                <div className="flex items-center">
                                  Price (₹)
                                  {getSortIcon('price')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('stockQuantity')}
                              >
                                <div className="flex items-center">
                                  Stock
                                  {getSortIcon('stockQuantity')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('category')}
                              >
                                <div className="flex items-center">
                                  Category
                                  {getSortIcon('category')}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicines.map((med) => (
                              <tr key={med._id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{med.name || '—'}</td>
                                <td className="px-4 py-3 text-gray-700">{med.genericName || '—'}</td>
                                <td className="px-4 py-3 text-gray-700">{med.manufacturer || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                    {med.form || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{med.strength || '—'}</td>
                                <td className="px-4 py-3 text-gray-700 font-medium">
                                  {med.price ? `₹${med.price.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    med.stockQuantity <= med.minStockLevel
                                      ? 'bg-red-100 text-red-700'
                                      : med.stockQuantity <= med.minStockLevel * 2
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {med.stockQuantity || 0}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{med.category || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {medicinePagination.pages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Showing {((medicinePagination.page - 1) * medicinePagination.limit) + 1} to{' '}
                            {Math.min(medicinePagination.page * medicinePagination.limit, medicinePagination.total)} of{' '}
                            {medicinePagination.total} medicines
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setMedicinePage(p => Math.max(1, p - 1))}
                              disabled={medicinePage === 1}
                              className="px-3 py-1 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setMedicinePage(p => Math.min(medicinePagination.pages, p + 1))}
                              disabled={medicinePage === medicinePagination.pages}
                              className="px-3 py-1 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-10 text-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">No medicines found</p>
                      {medicineQuery && (
                        <p className="text-sm text-gray-500 mt-1">
                          Try adjusting your search: "{medicineQuery}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default MedicalDashboard




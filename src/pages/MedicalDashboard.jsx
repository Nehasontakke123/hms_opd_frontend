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
      anchor.download = `${fileName}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download failed:', error)
      toast.error('Failed to download PDF')
    }
  }

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/patient')
        const withRx = (res.data.data || []).filter(p => p.prescription)
        setPatients(withRx)
      } catch (e) {
        toast.error('Failed to load patients')
      } finally {
        setLoading(false)
      }
    }
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

  const handleDownload = (patient) => {
    try {
      // Use the actual prescribing doctor's details if available
      const pdfUrl = getPDFUrl(patient.prescription.pdfPath)
      if (pdfUrl) {
        downloadPdf(pdfUrl, `prescription_${patient.fullName}_${patient.tokenNumber}`)
      } else {
        toast.error('PDF not available')
      }
    } catch (e) {
      toast.error('Failed to generate PDF')
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
                          {pdfUrl ? (
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                            >
                              <span role="img" aria-label="view">📄</span>
                              View Prescription
                            </a>
                          ) : (
                            <button
                              onClick={() => handleDownload(p)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
                            >
                              <span role="img" aria-label="download">⬇️</span>
                              Download Prescription
                            </button>
                          )}
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




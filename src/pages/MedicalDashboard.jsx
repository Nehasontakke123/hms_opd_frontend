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
    const cleanPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`
    // Derive backend root from axios baseURL (which points to /api)
    const baseURL = api.defaults.baseURL || (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
    const backendBase = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL
    return `${backendBase}${cleanPath}`
  }

  const handleDownload = (patient) => {
    try {
      // Use the actual prescribing doctor's details if available
      const docInfo = {
        fullName: patient?.doctor?.fullName || 'Doctor',
        specialization: patient?.doctor?.specialization || ''
      }
      generatePrescriptionPDF(patient, docInfo, patient.prescription)
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
              <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
              <p className="text-sm text-gray-600">View-only access to prescriptions</p>
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
                .filter(p => {
                  const q = query.trim().toLowerCase()
                  if (!q) return true
                  return (
                    p.fullName?.toLowerCase().includes(q) ||
                    p.mobileNumber?.toLowerCase().includes(q)
                  )
                })
                .map((p) => (
                  <div key={p._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{p.fullName}</h3>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-semibold">Token {p.tokenNumber}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Age {p.age} • {p.mobileNumber || '—'} • {p.disease}</p>
                        <p className="text-xs text-gray-500 mt-1">Prescribed on {new Date(p.prescription?.createdAt || p.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        {p.prescription?.pdfPath && getPDFUrl(p.prescription.pdfPath) ? (
                          <a
                            href={getPDFUrl(p.prescription.pdfPath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            <span role="img" aria-label="pdf">📄</span> View Prescription
                          </a>
                        ) : (
                          <button
                            onClick={() => handleDownload(p)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                          >
                            <span role="img" aria-label="download">⬇️</span> Download Prescription
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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




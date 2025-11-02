import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'
import PatientLimitModal from '../components/PatientLimitModal'
import DoctorStatsNotification from '../components/DoctorStatsNotification'

const DoctorDashboard = () => {
  const { user, logout } = useAuth()
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

  const viewPdf = async (pdfUrl) => {
    try {
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Clean up after a delay to allow the window to load
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('PDF view failed:', error)
      toast.error('Failed to view PDF')
    }
  }

  const [activeTab, setActiveTab] = useState('today') // 'today', 'history', or 'medical'
  const [patients, setPatients] = useState([])
  const [patientHistory, setPatientHistory] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingMedical, setLoadingMedical] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showStatsNotification, setShowStatsNotification] = useState(true)
  const [doctorStats, setDoctorStats] = useState(null)
  const [searchToday, setSearchToday] = useState('')
  const [searchHistory, setSearchHistory] = useState('')
  const [searchMedical, setSearchMedical] = useState('')
  const [prescriptionData, setPrescriptionData] = useState({
    diagnosis: '',
    medicines: [{
      name: '',
      dosage: '',
      duration: '',
      times: { morning: false, afternoon: false, night: false },
      dosageNotes: ''
    }],
    notes: ''
  })
  const [medicineSuggestions, setMedicineSuggestions] = useState([[]])
  const suggestionTimers = useRef({})

  useEffect(() => {
    fetchTodayPatients()
    fetchDoctorStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPatientHistory()
    } else if (activeTab === 'medical') {
      fetchMedicalRecords()
    }
  }, [activeTab])

  const fetchTodayPatients = async () => {
    try {
      const response = await api.get(`/patient/today/${user?.id}`)
      setPatients(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Failed to fetch patients')
      setLoading(false)
    }
  }

  const fetchDoctorStats = async () => {
    try {
      const response = await api.get(`/doctor/${user?.id}/stats`)
      setDoctorStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch doctor stats:', error)
    }
  }

  const handleToggleAvailability = async () => {
    try {
      const response = await api.put(`/doctor/${user?.id}/availability`, {
        isAvailable: !doctorStats?.isAvailable
      })
      toast.success(response.data.message)
      await fetchDoctorStats() // Refresh stats
      fetchTodayPatients() // Refresh today's patients
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update availability')
    }
  }

  const fetchPatientHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await api.get('/patient')
      const allPatients = response.data.data || []
      // Filter only this doctor's patients
      const myPatients = allPatients.filter(p => p.doctor?._id === user?.id || p.doctor === user?.id)
      // Sort by most recent first
      myPatients.sort((a, b) => new Date(b.createdAt || b.registrationDate) - new Date(a.createdAt || a.registrationDate))
      setPatientHistory(myPatients)
    } catch (error) {
      console.error('Error fetching patient history:', error)
      toast.error('Failed to fetch patient history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchMedicalRecords = async () => {
    setLoadingMedical(true)
    try {
      const response = await api.get('/patient')
      const allPatients = response.data.data || []
      // Filter only this doctor's patients with prescriptions
      const recordsWithPrescriptions = allPatients.filter(
        p => (p.doctor?._id === user?.id || p.doctor === user?.id) && p.prescription
      )
      // Sort by most recent first
      recordsWithPrescriptions.sort((a, b) => 
        new Date(b.prescription?.createdAt || b.createdAt) - new Date(a.prescription?.createdAt || a.createdAt)
      )
      setMedicalRecords(recordsWithPrescriptions)
    } catch (error) {
      console.error('Error fetching medical records:', error)
      toast.error('Failed to fetch medical records')
    } finally {
      setLoadingMedical(false)
    }
  }

  const filterPatients = (list, query) => {
    if (!query) return list
    const q = query.toLowerCase()
    return list.filter((patient) => {
      const nameMatch = patient.fullName?.toLowerCase().includes(q)
      const mobileMatch = patient.mobileNumber?.toLowerCase().includes(q)
      const tokenMatch = patient.tokenNumber?.toString().includes(q)
      const issueMatch = patient.disease?.toLowerCase().includes(q)
      return nameMatch || mobileMatch || tokenMatch || issueMatch
    })
  }

  const handleDownloadPrescription = (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available to download')
        return
      }

      const pdfUrl = getPDFUrl(patient.prescription.pdfPath)

      if (pdfUrl) {
        downloadPdf(pdfUrl, `prescription_${patient.fullName}_${patient.tokenNumber}`)
      } else {
        toast.error('PDF not available')
      }
    } catch (e) {
      console.error('Failed to download PDF:', e)
      toast.error('Failed to download PDF')
    }
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

  const ensureTimesShape = (medicine) => ({
    morning: medicine?.times?.morning || false,
    afternoon: medicine?.times?.afternoon || false,
    night: medicine?.times?.night || false
  })

  const formatDosage = (times, notes) => {
    const selected = []
    if (times.morning) selected.push('Morning')
    if (times.afternoon) selected.push('Afternoon')
    if (times.night) selected.push('Night')
    let result = selected.join(', ')
    if (notes && notes.trim()) {
      result = result ? `${result} | ${notes.trim()}` : notes.trim()
    }
    return result
  }

  const updateMedicineSuggestions = (index, suggestions) => {
    setMedicineSuggestions((prev) => {
      const updated = [...prev]
      updated[index] = suggestions
      return updated
    })
  }

  const fetchMedicineSuggestions = async (query, index) => {
    if (!query || query.length < 2) {
      updateMedicineSuggestions(index, [])
      return
    }

    try {
      const response = await fetch(
        `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(query)}&ef=STRENGTHS_AND_FORMS`
      )
      if (!response.ok) throw new Error('Network error')

      const data = await response.json()
      const terms = Array.isArray(data?.[1]) ? data[1] : []
      const strengths = Array.isArray(data?.[2]?.STRENGTHS_AND_FORMS)
        ? data[2].STRENGTHS_AND_FORMS.map((item) => item?.join(' ').trim())
        : []

      const combined = [...terms, ...strengths].filter(Boolean)
      const unique = Array.from(new Set(combined))
      const list = unique.slice(0, 10)
      updateMedicineSuggestions(index, list)
    } catch (error) {
      console.error('Failed to fetch medicine suggestions', error)
      updateMedicineSuggestions(index, [])
    }
  }

  const handleMedicineChange = (index, field, value, options = {}) => {
    const updatedMedicines = [...prescriptionData.medicines]
    const target = { ...updatedMedicines[index] }
    target[field] = value

    if (!target.times) {
      target.times = ensureTimesShape(target)
    }

    if (field === 'dosageNotes') {
      target.dosage = formatDosage(target.times, value)
    }

    updatedMedicines[index] = target
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines })

    if (field === 'name') {
      if (suggestionTimers.current[index]) {
        clearTimeout(suggestionTimers.current[index])
      }

      if (options.skipLookup) {
        updateMedicineSuggestions(index, [])
      } else {
        suggestionTimers.current[index] = setTimeout(() => {
          fetchMedicineSuggestions(value, index)
        }, 300)
      }
    }
  }

  const handleDosageToggle = (index, timeKey) => {
    const updatedMedicines = [...prescriptionData.medicines]
    const target = { ...updatedMedicines[index] }
    target.times = ensureTimesShape(target)
    target.times[timeKey] = !target.times[timeKey]
    target.dosage = formatDosage(target.times, target.dosageNotes)
    updatedMedicines[index] = target
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines })
  }

  const addMedicineField = () => {
    setPrescriptionData({
      ...prescriptionData,
      medicines: [
        ...prescriptionData.medicines,
        {
          name: '',
          dosage: '',
          duration: '',
          times: { morning: false, afternoon: false, night: false },
          dosageNotes: ''
        }
      ]
    })
    setMedicineSuggestions((prev) => [...prev, []])
  }

  const removeMedicineField = (index) => {
    if (prescriptionData.medicines.length > 1) {
      const updatedMedicines = prescriptionData.medicines.filter((_, i) => i !== index)
      setPrescriptionData({
        ...prescriptionData,
        medicines: updatedMedicines
      })
      setMedicineSuggestions((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleOpenPrescriptionModal = (patient) => {
    setSelectedPatient(patient)
    setPrescriptionData({
      diagnosis: '',
      medicines: [{
        name: '',
        dosage: '',
        duration: '',
        times: { morning: false, afternoon: false, night: false },
        dosageNotes: ''
      }],
      notes: ''
    })
    setMedicineSuggestions([[]])
    setShowPrescriptionModal(true)
  }

  const handleSubmitPrescription = async () => {
    // Validate medicines
    const validMedicines = prescriptionData.medicines.filter(
      med => med.name.trim() && med.dosage.trim() && med.duration.trim()
    )

    if (!prescriptionData.diagnosis.trim() || validMedicines.length === 0) {
      toast.error('Please provide diagnosis and at least one complete medicine')
      return
    }

    try {
      // First, generate PDF to get base64 data
      // Use selectedPatient data for PDF generation
      const tempPrescription = {
        diagnosis: prescriptionData.diagnosis,
        medicines: validMedicines,
        notes: prescriptionData.notes || '',
        createdAt: new Date()
      }

      // Generate PDF and get base64 (also downloads locally)
      const pdfBase64 = generatePrescriptionPDF(
        selectedPatient,
        { fullName: user.fullName, specialization: user.specialization },
        tempPrescription
      )

      // Save prescription with PDF data in one call
      const response = await api.put(`/prescription/${selectedPatient._id}`, {
        diagnosis: prescriptionData.diagnosis,
        medicines: validMedicines,
        notes: prescriptionData.notes,
        pdfData: pdfBase64 // Send PDF as base64
      })

      toast.success(response.data.message || 'Prescription saved, PDF generated and stored in medical section!')
      setShowPrescriptionModal(false)
      fetchTodayPatients()
      // Always refresh medical records so the badge count is updated
      fetchMedicalRecords()
      if (activeTab === 'history') {
        fetchPatientHistory()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save prescription')
    }
  }

  const filteredTodayPatients = filterPatients(patients, searchToday)
  const filteredHistoryPatients = filterPatients(patientHistory, searchHistory)
  const filteredMedicalRecords = filterPatients(medicalRecords, searchMedical)
  const limitedHistoryPatients = filteredHistoryPatients.slice(0, 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-purple-600">Tekisky</span>
                <span className="text-2xl sm:text-3xl font-semibold text-slate-800">Hospital</span>
              </div>
              <p className="mt-1 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 rounded-full">
                Doctor Dashboard • {user?.fullName}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">Track patient rounds, craft prescriptions, and review medical records in one place.</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {doctorStats && (
                <button
                  onClick={handleToggleAvailability}
                  className={`px-4 sm:px-5 py-2.5 rounded-lg transition-all text-sm whitespace-nowrap font-bold border shadow-md ${
                    doctorStats.isAvailable
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-300 hover:border-amber-400'
                      : 'bg-green-600 text-white hover:bg-green-700 border-green-700 hover:border-green-800'
                  }`}
                >
                  {doctorStats.isAvailable ? '⛔ Mark Unavailable' : '✓ Mark Available'}
                </button>
              )}
              <button
                onClick={() => setShowLimitModal(true)}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"
              >
                Set Patient Limit
              </button>
              <button
                onClick={logout}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
          {/* Stats Display */}
          {doctorStats && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Daily Limit</p>
                    <p className="text-2xl font-bold text-purple-600">{doctorStats.dailyPatientLimit}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Patients</p>
                    <p className="text-2xl font-bold text-gray-800">{doctorStats.todayPatientCount}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining Slots</p>
                    <p className={`text-2xl font-bold ${doctorStats.remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {doctorStats.remainingSlots}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Availability Banner */}
      {doctorStats && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          {doctorStats.isAvailable ? (
            <div className="mb-6 p-4 border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-1">Doctor is available and accepting patients</h3>
                  <p className="text-sm text-green-700">This status is highlighted to indicate active availability.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 border-2 border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-1">Doctor is currently not available</h3>
                  <p className="text-sm text-amber-700">Please check back later or contact reception for assistance.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Limit Reached Banner */}
      {doctorStats && doctorStats.isLimitReached && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="mb-6 p-4 border-2 border-red-500 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-semibold text-red-800">⚠️ Daily limit reached!</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients Today
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient History
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'medical'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Records
              {medicalRecords.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {medicalRecords.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Patients Today Tab */}
        {activeTab === 'today' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Patients Today</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : patients.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">No patients for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <input
                    type="text"
                    value={searchToday}
                    onChange={(e) => setSearchToday(e.target.value)}
                    placeholder="Search patient, token, issue..."
                    className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                {filteredTodayPatients.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500 text-lg">No matching patients</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredTodayPatients.map((patient) => (
                            <tr key={patient._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-sm">
                                  {patient.tokenNumber}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{patient.fullName}</div>
                                <div className="text-sm text-gray-500">{patient.age} years • {patient.mobileNumber}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{patient.disease}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  patient.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : patient.status === 'in-progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {patient.status === 'completed'
                                    ? 'Completed'
                                    : patient.status === 'in-progress'
                                    ? 'In Progress'
                                    : 'Waiting'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(patient.registrationDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {patient.status !== 'completed' && (
                                  <button
                                    onClick={() => handleOpenPrescriptionModal(patient)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                  >
                                    Add Prescription
                                  </button>
                                )}
                                {patient.status === 'completed' && patient.prescription && (
                                  <span className="text-green-600 font-semibold">✓ Prescribed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Patient History Tab */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient History</h2>

            {loadingHistory ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : patientHistory.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">No patient history available</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <input
                    type="text"
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    placeholder="Search patient, token, issue..."
                    className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prescription</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {limitedHistoryPatients.map((patient, index) => (
                        <tr key={patient._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-semibold">
                              {String(index + 1).padStart(2, '0')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(patient.registrationDate || patient.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-sm">
                              {patient.tokenNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span>{patient.fullName}</span>
                              <span className="hidden sm:inline text-xs uppercase tracking-wide text-gray-400">•</span>
                              <span className="text-sm text-gray-500 font-normal">Age {patient.age}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Mobile: {patient.mobileNumber || '—'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <span className="capitalize">{patient.disease || 'Not specified'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                              patient.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : patient.status === 'in-progress'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {patient.status === 'completed'
                                ? 'Completed'
                                : patient.status === 'in-progress'
                                ? 'In Progress'
                                : 'Waiting'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {patient.prescription ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Prescribed
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredHistoryPatients.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">No matching patients</div>
                )}
                {filteredHistoryPatients.length > 100 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">Showing latest 100 records</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Medical Records Tab */}
        {activeTab === 'medical' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold uppercase tracking-wide">Tekisky Records</span>
              <span>Doctor View</span>
            </h2>
            <p className="text-sm text-slate-500 mb-6">Review previously issued prescriptions and regenerate PDFs for your patients.</p>

            {loadingMedical ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : medicalRecords.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">No medical records available</p>
                <p className="text-gray-400 text-sm mt-2">Prescriptions will appear here after you add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <input
                    type="text"
                    value={searchMedical}
                    onChange={(e) => setSearchMedical(e.target.value)}
                    placeholder="Search patient, token, issue..."
                    className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                {filteredMedicalRecords.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500 text-lg">No matching records</p>
                  </div>
                ) : (
                  filteredMedicalRecords.map((patient) => (
                  <div key={patient._id} className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-sm">
                            Token: {patient.tokenNumber}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            ✓ Prescribed
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">{patient.fullName}</h3>
                        <p className="text-sm text-gray-600">
                          {patient.age} years • {patient.mobileNumber} • {patient.disease}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Prescribed on: {new Date(patient.prescription?.createdAt || patient.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {patient.prescription?.pdfPath && getPDFUrl(patient.prescription.pdfPath) ? (
                          <>
                            <button
                              onClick={() => viewPdf(getPDFUrl(patient.prescription.pdfPath))}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View PDF
                            </button>
                            <button
                              onClick={() => handleDownloadPrescription(patient)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M6 20h12" />
                              </svg>
                              Download
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDownloadPrescription(patient)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                            title="Generate and download PDF"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M6 20h12" />
                            </svg>
                            Download PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Prescription Details */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Diagnosis</h4>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{patient.prescription?.diagnosis || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Medicines Prescribed</h4>
                          <div className="bg-gray-50 p-3 rounded space-y-2">
                            {patient.prescription?.medicines?.map((medicine, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium text-gray-900">{idx + 1}. {medicine.name}</span>
                                <span className="text-gray-600"> • {medicine.dosage} • {medicine.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {patient.prescription?.notes && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{patient.prescription.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-2xl font-bold mb-4">
              Create Prescription - {selectedPatient.fullName}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis *
                </label>
                <textarea
                  value={prescriptionData.diagnosis}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prescribed Medicines *
                </label>
                {prescriptionData.medicines.map((medicine, index) => (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Medicine</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Start typing to search..."
                            value={medicine.name}
                            onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                          />
                          {medicineSuggestions[index] && medicineSuggestions[index].length > 0 && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {medicineSuggestions[index].map((suggestion) => (
                                <button
                                  type="button"
                                  key={suggestion}
                                onClick={() => {
                                  handleMedicineChange(index, 'name', suggestion, { skipLookup: true })
                                }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                        <input
                          type="text"
                          placeholder="e.g. 5 days"
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                        />
                      </div>

                      <div className="lg:col-span-5">
                        <fieldset className="border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                          <legend className="text-xs font-semibold text-gray-500 px-1">Dosage Times</legend>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-700 mb-2">
                            {[
                              { key: 'morning', label: 'Morning' },
                              { key: 'afternoon', label: 'Afternoon' },
                              { key: 'night', label: 'Night' }
                            ].map((time) => (
                              <label key={time.key} className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 px-3 py-1 rounded-lg hover:border-purple-300">
                                <input
                                  type="checkbox"
                                  checked={ensureTimesShape(medicine)[time.key]}
                                  onChange={() => handleDosageToggle(index, time.key)}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-medium text-purple-700 text-xs uppercase">{time.label}</span>
                              </label>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Additional instructions (optional)"
                            value={medicine.dosageNotes || ''}
                            onChange={(e) => handleMedicineChange(index, 'dosageNotes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                          />
                        </fieldset>
                      </div>
                    </div>
                    {medicine.dosage && (
                      <p className="mt-2 text-xs text-gray-500">Generated dosage: {medicine.dosage}</p>
                    )}
                    {prescriptionData.medicines.length > 1 && (
                      <button
                        onClick={() => removeMedicineField(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addMedicineField}
                  className="text-purple-600 hover:text-purple-800 text-sm font-semibold"
                >
                  + Add Medicine
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={prescriptionData.notes}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitPrescription}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Save & Generate PDF
              </button>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Limit Modal */}
      <PatientLimitModal
        doctor={{ _id: user?.id, fullName: user?.fullName }}
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpdate={fetchDoctorStats}
      />

      {/* Stats Notification Popup */}
      <DoctorStatsNotification
        doctorId={user?.id}
        show={showStatsNotification}
        onClose={() => setShowStatsNotification(false)}
      />
    </div>
  )
}

export default DoctorDashboard

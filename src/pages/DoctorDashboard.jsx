import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'
import PatientLimitModal from '../components/PatientLimitModal'
import DoctorStatsNotification from '../components/DoctorStatsNotification'

const DoctorDashboard = () => {
  const { user, logout } = useAuth()
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
  const [prescriptionData, setPrescriptionData] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '' }],
    notes: ''
  })

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

  const getPDFUrl = (pdfPath) => {
    if (!pdfPath) return null
    // Construct the full URL to access the PDF
    // baseURL is like "https://hms-opd-backend.vercel.app/api" or "http://localhost:5000/api"
    const baseURL = api.defaults.baseURL
    const backendBase = baseURL.replace('/api', '')
    
    // pdfPath should be like "/medical_records/prescription_John_Doe_1_2025-01-28.pdf"
    // or just "medical_records/prescription_John_Doe_1_2025-01-28.pdf"
    const cleanPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`
    return `${backendBase}${cleanPath}`
  }

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = [...prescriptionData.medicines]
    updatedMedicines[index][field] = value
    setPrescriptionData({
      ...prescriptionData,
      medicines: updatedMedicines
    })
  }

  const addMedicineField = () => {
    setPrescriptionData({
      ...prescriptionData,
      medicines: [...prescriptionData.medicines, { name: '', dosage: '', duration: '' }]
    })
  }

  const removeMedicineField = (index) => {
    if (prescriptionData.medicines.length > 1) {
      const updatedMedicines = prescriptionData.medicines.filter((_, i) => i !== index)
      setPrescriptionData({
        ...prescriptionData,
        medicines: updatedMedicines
      })
    }
  }

  const handleOpenPrescriptionModal = (patient) => {
    setSelectedPatient(patient)
    setPrescriptionData({
      diagnosis: '',
      medicines: [{ name: '', dosage: '', duration: '' }],
      notes: ''
    })
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tekisky Hospital</h1>
              <p className="text-xs sm:text-sm text-gray-600">Doctor Dashboard - Dr. {user?.fullName}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
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
                {doctorStats.isLimitReached && (
                  <div className="px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">⚠️ Daily limit reached!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

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
                      {patients.map((patient) => (
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
                              {patient.status === 'completed' ? 'Completed' : patient.status === 'in-progress' ? 'In Progress' : 'Waiting'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(patient.registrationDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prescription</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patientHistory.slice(0, 100).map((patient) => (
                        <tr key={patient._id} className="hover:bg-gray-50">
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
                              {patient.status === 'completed' ? 'Completed' : patient.status === 'in-progress' ? 'In Progress' : 'Waiting'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {patient.prescription ? (
                              <span className="text-green-600 font-semibold">✓ Prescribed</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {patientHistory.length > 100 && (
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Medical Records</h2>

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
                {medicalRecords.map((patient) => (
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
                          <a
                            href={getPDFUrl(patient.prescription.pdfPath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View PDF
                          </a>
                        ) : (
                          <span className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm flex items-center gap-2" title="PDF not available">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            PDF Not Available
                          </span>
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
                ))}
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
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={medicine.name}
                        onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={medicine.dosage}
                        onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={medicine.duration}
                        onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
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

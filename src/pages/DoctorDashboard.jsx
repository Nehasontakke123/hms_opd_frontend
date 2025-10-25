import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'

const DoctorDashboard = () => {
  const { user, logout } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [prescriptionData, setPrescriptionData] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '' }],
    notes: ''
  })

  useEffect(() => {
    fetchTodayPatients()
  }, [])

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
      const response = await api.put(`/prescription/${selectedPatient._id}`, {
        diagnosis: prescriptionData.diagnosis,
        medicines: validMedicines,
        notes: prescriptionData.notes
      })

      const updatedPatient = response.data.data

      // Generate PDF
      generatePrescriptionPDF(
        updatedPatient,
        { fullName: user.fullName, specialization: user.specialization },
        updatedPatient.prescription
      )

      toast.success('Prescription saved and PDF generated!')
      setShowPrescriptionModal(false)
      fetchTodayPatients()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save prescription')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tekisky Hospital</h1>
            <p className="text-xs sm:text-sm text-gray-600">Doctor Dashboard - Dr. {user?.fullName}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Today's Patients</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No patients for today</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {patients.map((patient) => (
              <div key={patient._id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-xs sm:text-sm">
                        Token: {patient.tokenNumber}
                      </span>
                      {patient.status === 'completed' && (
                        <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">{patient.fullName}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p><span className="font-semibold">Age:</span> {patient.age}</p>
                      <p><span className="font-semibold">Mobile:</span> {patient.mobileNumber}</p>
                      <p><span className="font-semibold">Issue:</span> {patient.disease}</p>
                    </div>
                  </div>
                  {patient.status !== 'completed' && (
                    <button
                      onClick={() => handleOpenPrescriptionModal(patient)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm whitespace-nowrap"
                    >
                      Add Prescription
                    </button>
                  )}
                </div>
              </div>
            ))}
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
    </div>
  )
}

export default DoctorDashboard

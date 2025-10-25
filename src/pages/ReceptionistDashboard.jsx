import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ReceptionistDashboard = () => {
  const { user, logout } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [generatedToken, setGeneratedToken] = useState(null)
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    address: '',
    age: '',
    disease: '',
    doctor: ''
  })

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctor')
      console.log('Doctors fetched:', response.data.data)
      setDoctors(response.data.data)
      if (response.data.data.length === 0) {
        toast.error('No doctors available. Please contact admin.')
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
      toast.error(error.response?.data?.message || 'Failed to fetch doctors')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Find the selected doctor to get the fees
      const selectedDoctor = doctors.find(d => d._id === formData.doctor)
      const fees = selectedDoctor?.fees || 0
      
      const response = await api.post('/patient/register', {
        ...formData,
        fees
      })
      setGeneratedToken(response.data.data)
      setShowTokenModal(true)
      
      // Reset form
      setFormData({
        fullName: '',
        mobileNumber: '',
        address: '',
        age: '',
        disease: '',
        doctor: ''
      })
      
      toast.success('Patient registered successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
    }
  }

  const closeTokenModal = () => {
    setShowTokenModal(false)
    setGeneratedToken(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tekisky Hospital</h1>
            <p className="text-xs sm:text-sm text-gray-600">Receptionist Dashboard</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-sm text-gray-700 truncate">{user?.fullName}</span>
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Patient Registration</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="0"
                  max="150"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Doctor *
                </label>
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''} {doctor.fees ? `(₹${doctor.fees})` : ''}
                    </option>
                  ))}
                </select>
                {formData.doctor && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Consultation Fee:</span>{' '}
                      <span className="text-blue-600 font-bold">
                        ₹{doctors.find(d => d._id === formData.doctor)?.fees || 'Not set'}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disease/Health Issue *
                </label>
                <textarea
                  name="disease"
                  value={formData.disease}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
            >
              Register Patient
            </button>
          </form>
        </div>
      </div>

      {/* Token Modal */}
      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Patient Registered!</h3>
              <p className="text-gray-600">Token Number Generated</p>
            </div>

            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Token Number</p>
              <p className="text-6xl font-bold text-green-600">{generatedToken.tokenNumber}</p>
            </div>

            <div className="text-left mb-6 space-y-2 text-sm">
              <p><span className="font-semibold">Patient:</span> {generatedToken.fullName}</p>
              <p><span className="font-semibold">Doctor:</span> {generatedToken.doctor?.fullName}</p>
              <p><span className="font-semibold">Date:</span> {new Date(generatedToken.registrationDate).toLocaleDateString()}</p>
            </div>

            <button
              onClick={closeTokenModal}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReceptionistDashboard

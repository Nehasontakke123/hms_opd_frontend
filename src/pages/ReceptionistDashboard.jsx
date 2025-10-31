import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import PatientLimitModal from '../components/PatientLimitModal'

const ReceptionistDashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('doctors') // 'doctors', 'registration', or 'appointments'
  const [doctors, setDoctors] = useState([])
  const [doctorStats, setDoctorStats] = useState({})
  const [todayPatients, setTodayPatients] = useState([])
  const [patientHistory, setPatientHistory] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [editingAppointmentForm, setEditingAppointmentForm] = useState({
    patientName: '',
    mobileNumber: '',
    email: '',
    appointmentDate: '',
    appointmentTime: '',
    doctor: '',
    reason: '',
    notes: '',
    status: 'scheduled'
  })
  const [selectedDoctorForLimit, setSelectedDoctorForLimit] = useState(null)
  const [generatedToken, setGeneratedToken] = useState(null)
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    address: '',
    age: '',
    disease: '',
    doctor: ''
  })
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: '',
    mobileNumber: '',
    email: '',
    appointmentDate: '',
    appointmentTime: '',
    doctor: '',
    reason: '',
    notes: ''
  })
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  const [cancelForm, setCancelForm] = useState({
    reason: '',
    refundAmount: '',
    refundStatus: 'not_applicable',
    refundNotes: '',
    notifyPatient: true
  })

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    if (activeTab === 'registration' && doctors.length > 0) {
      fetchTodayPatients()
      fetchPatientHistory()
    } else if (activeTab === 'appointments') {
      fetchAppointments()
    }
  }, [activeTab, doctors])

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctor')
      console.log('Doctors fetched:', response.data.data)
      setDoctors(response.data.data)
      
      // Fetch stats for each doctor
      const statsPromises = response.data.data.map(doctor =>
        api.get(`/doctor/${doctor._id}/stats`)
          .then(res => ({ [doctor._id]: res.data.data }))
          .catch(() => ({ [doctor._id]: null }))
      )
      
      const statsArray = await Promise.all(statsPromises)
      const stats = Object.assign({}, ...statsArray)
      setDoctorStats(stats)
      
      if (response.data.data.length === 0) {
        toast.error('No doctors available. Please contact admin.')
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
      toast.error(error.response?.data?.message || 'Failed to fetch doctors')
    }
  }

  const handleSetLimitClick = (doctor) => {
    setSelectedDoctorForLimit(doctor)
    setShowLimitModal(true)
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
      
      // Refresh patient lists
      fetchTodayPatients()
      fetchPatientHistory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
    }
  }

  const closeTokenModal = () => {
    setShowTokenModal(false)
    setGeneratedToken(null)
    // Refresh patient lists after registration
    fetchTodayPatients()
    fetchPatientHistory()
  }

  const fetchTodayPatients = async () => {
    setLoadingPatients(true)
    try {
      // Get all doctors first
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Fetch patients for all doctors today
      const patientPromises = doctors.map(doctor =>
        api.get(`/patient/today/${doctor._id}`)
          .then(res => res.data.data)
          .catch(() => [])
      )
      
      const allPatientsArrays = await Promise.all(patientPromises)
      const allTodayPatients = allPatientsArrays.flat()
      
      // Sort by token number
      allTodayPatients.sort((a, b) => a.tokenNumber - b.tokenNumber)
      setTodayPatients(allTodayPatients)
    } catch (error) {
      console.error('Error fetching today patients:', error)
      toast.error('Failed to fetch today\'s patients')
    } finally {
      setLoadingPatients(false)
    }
  }

  const fetchPatientHistory = async () => {
    try {
      const response = await api.get('/patient')
      const patients = response.data.data || []
      // Sort by most recent first
      patients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setPatientHistory(patients)
    } catch (error) {
      console.error('Error fetching patient history:', error)
      toast.error('Failed to fetch patient history')
    }
  }

  const fetchAppointments = async () => {
    setLoadingAppointments(true)
    try {
      const response = await api.get('/appointment')
      const allAppointments = response.data.data || []
      // Sort by appointment date/time (upcoming first)
      allAppointments.sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`)
        const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`)
        return dateA - dateB
      })
      setAppointments(allAppointments)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments')
    } finally {
      setLoadingAppointments(false)
    }
  }

  const handleAppointmentChange = (e) => {
    setAppointmentForm({
      ...appointmentForm,
      [e.target.name]: e.target.value
    })
  }

  const handleScheduleAppointment = async (e) => {
    e.preventDefault()
    
    if (!appointmentForm.patientName || !appointmentForm.mobileNumber || !appointmentForm.appointmentDate || !appointmentForm.appointmentTime || !appointmentForm.doctor) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      const response = await api.post('/appointment', appointmentForm)
      
      toast.success(response.data.message || 'Appointment scheduled successfully!')
      
      // Reset form
      setAppointmentForm({
        patientName: '',
        mobileNumber: '',
        email: '',
        appointmentDate: '',
        appointmentTime: '',
        doctor: '',
        reason: '',
        notes: ''
      })
      
      // Refresh appointments list
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule appointment')
    }
  }

  const handleResendSMS = async (appointmentId) => {
    try {
      const response = await api.post(`/appointment/${appointmentId}/resend-sms`)
      toast.success('SMS resent successfully!')
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend SMS. Please check SMS provider configuration in backend.')
    }
  }

  const openCancelModal = (appointment) => {
    setAppointmentToCancel(appointment)
    setCancelForm({
      reason: appointment.cancellationReason || '',
      refundAmount: appointment.refundAmount ? appointment.refundAmount.toString() : '',
      refundStatus:
        appointment.refundAmount && appointment.refundAmount > 0
          ? appointment.refundStatus === 'processed'
            ? 'processed'
            : 'pending'
          : 'not_applicable',
      refundNotes: appointment.refundNotes || '',
      notifyPatient: true
    })
    setShowCancelModal(true)
  }

  const closeCancelModal = () => {
    setShowCancelModal(false)
    setAppointmentToCancel(null)
    setCancelForm({
      reason: '',
      refundAmount: '',
      refundStatus: 'pending',
      refundNotes: '',
      notifyPatient: true
    })
  }

  const handleCancelFormChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'refundAmount') {
      const amountValue = value
      setCancelForm((prev) => ({
        ...prev,
        refundAmount: amountValue,
        refundStatus:
          amountValue && Number(amountValue) > 0
            ? prev.refundStatus === 'not_applicable' ? 'pending' : prev.refundStatus
            : 'not_applicable'
      }))
      return
    }

    setCancelForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const submitCancellation = async (e) => {
    e.preventDefault()
    if (!appointmentToCancel) return

    try {
      const payload = {
        cancellationReason: cancelForm.reason,
        refundAmount: cancelForm.refundAmount ? Number(cancelForm.refundAmount) : 0,
        refundStatus:
          cancelForm.refundAmount && Number(cancelForm.refundAmount) > 0
            ? cancelForm.refundStatus || 'pending'
            : 'not_applicable',
        refundNotes: cancelForm.refundNotes,
        notifyPatient: cancelForm.notifyPatient
      }

      await api.post(`/appointment/${appointmentToCancel._id}/cancel`, payload)
      toast.success('Appointment cancelled successfully!')
      closeCancelModal()
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel appointment')
    }
  }

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setEditingAppointmentForm({
      patientName: appointment.patientName || '',
      mobileNumber: appointment.mobileNumber || '',
      email: appointment.email || '',
      appointmentDate: appointment.appointmentDate ? new Date(appointment.appointmentDate).toISOString().split('T')[0] : '',
      appointmentTime: appointment.appointmentTime || '',
      doctor: appointment.doctor?._id || appointment.doctor || '',
      reason: appointment.reason || '',
      notes: appointment.notes || '',
      status: appointment.status || 'scheduled'
    })
    setShowEditAppointmentModal(true)
  }

  const handleUpdateAppointment = async (e) => {
    e.preventDefault()
    
    if (!editingAppointmentForm.patientName || !editingAppointmentForm.mobileNumber || !editingAppointmentForm.appointmentDate || !editingAppointmentForm.appointmentTime || !editingAppointmentForm.doctor) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      await api.put(`/appointment/${selectedAppointment._id}`, editingAppointmentForm)
      toast.success('Appointment updated successfully!')
      setShowEditAppointmentModal(false)
      setSelectedAppointment(null)
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update appointment')
    }
  }

  const handleCancelEdit = () => {
    setShowEditAppointmentModal(false)
    setSelectedAppointment(null)
    setEditingAppointmentForm({
      patientName: '',
      mobileNumber: '',
      email: '',
      appointmentDate: '',
      appointmentTime: '',
      doctor: '',
      reason: '',
      notes: '',
      status: 'scheduled'
    })
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'doctors'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Doctors Overview
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'registration'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient Registration
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'appointments'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appointments
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Doctors Overview Tab */}
        {activeTab === 'doctors' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Doctors Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doctor) => {
                const stats = doctorStats[doctor._id]
                return (
                  <div key={doctor._id} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{doctor.fullName}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialization || 'General'}</p>
                      </div>
                      <button
                        onClick={() => handleSetLimitClick(doctor)}
                        className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      >
                        Set Limit
                      </button>
                    </div>
                    {stats && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Daily Limit:</span>
                          <span className="font-bold">{stats.dailyPatientLimit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Today:</span>
                          <span className="font-bold">{stats.todayPatientCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining:</span>
                          <span className={`font-bold ${stats.remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.remainingSlots}
                          </span>
                        </div>
                        {stats.isLimitReached && (
                          <div className="mt-2 px-2 py-1 bg-red-100 border border-red-300 rounded text-xs text-red-800 font-semibold">
                            ⚠️ Limit Reached
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Patient Registration Tab */}
        {activeTab === 'registration' && (
          <div className="space-y-8">
            {/* Registration Form */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Register New Patient</h2>

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
                  {doctors.map((doctor) => {
                    const stats = doctorStats[doctor._id]
                    const slotsInfo = stats ? ` [${stats.remainingSlots} slots left]` : ''
                    const isLimitReached = stats?.isLimitReached
                    return (
                      <option 
                        key={doctor._id} 
                        value={doctor._id}
                        disabled={isLimitReached}
                      >
                        {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''} {doctor.fees ? `(₹${doctor.fees})` : ''}{slotsInfo}{isLimitReached ? ' - LIMIT REACHED' : ''}
                      </option>
                    )
                  })}
                </select>
                {formData.doctor && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Consultation Fee:</span>{' '}
                      <span className="text-blue-600 font-bold">
                        ₹{doctors.find(d => d._id === formData.doctor)?.fees || 'Not set'}
                      </span>
                    </p>
                    {doctorStats[formData.doctor] && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Patients Today:</span>{' '}
                        <span className="font-bold">
                          {doctorStats[formData.doctor].todayPatientCount} / {doctorStats[formData.doctor].dailyPatientLimit}
                        </span>
                        {' '}
                        <span className={doctorStats[formData.doctor].remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}>
                          ({doctorStats[formData.doctor].remainingSlots} remaining)
                        </span>
                      </p>
                    )}
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

            {/* Patients Today Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Patients Today</h3>
              {loadingPatients ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
              ) : todayPatients.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No patients registered today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {todayPatients.map((patient) => (
                        <tr key={patient._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                              {patient.tokenNumber}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{patient.fullName}</div>
                            <div className="text-sm text-gray-500">{patient.age} years • {patient.mobileNumber}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{patient.doctor?.fullName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{patient.doctor?.specialization || ''}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{patient.disease}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
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
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(patient.registrationDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Patient History Section */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Patient History</h3>
              {patientHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No patient history available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patientHistory.slice(0, 50).map((patient) => (
                        <tr key={patient._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(patient.registrationDate || patient.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                              {patient.tokenNumber}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{patient.fullName}</div>
                            <div className="text-sm text-gray-500">{patient.age} years</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{patient.doctor?.fullName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{patient.doctor?.specialization || ''}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {patientHistory.length > 50 && (
                <p className="text-sm text-gray-500 text-center mt-4">Showing latest 50 records</p>
              )}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-8">
            {/* Schedule Appointment Form */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Schedule Appointment</h2>

              <form onSubmit={handleScheduleAppointment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      name="patientName"
                      value={appointmentForm.patientName}
                      onChange={handleAppointmentChange}
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
                      value={appointmentForm.mobileNumber}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={appointmentForm.email}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Doctor *
                    </label>
                    <select
                      name="doctor"
                      value={appointmentForm.doctor}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      name="appointmentDate"
                      value={appointmentForm.appointmentDate}
                      onChange={handleAppointmentChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Time *
                    </label>
                    <input
                      type="time"
                      name="appointmentTime"
                      value={appointmentForm.appointmentTime}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Appointment
                    </label>
                    <input
                      type="text"
                      name="reason"
                      value={appointmentForm.reason}
                      onChange={handleAppointmentChange}
                      placeholder="e.g., Routine checkup, Follow-up, Consultation"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={appointmentForm.notes}
                      onChange={handleAppointmentChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Any additional notes..."
                    ></textarea>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                >
                  Schedule Appointment & Send SMS
                </button>
              </form>
            </div>

            {/* Appointments List */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">All Appointments</h3>
              {loadingAppointments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {appointments.map((appointment) => {
                        const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`)
                        const isPast = appointmentDateTime < new Date()
                        const isToday = new Date(appointment.appointmentDate).toDateString() === new Date().toDateString()
                        
                        return (
                          <tr key={appointment._id} className={`hover:bg-gray-50 ${isPast ? 'opacity-75' : ''}`}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-gray-500">{appointment.appointmentTime}</div>
                              {isToday && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">Today</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                              <div className="text-sm text-gray-500">{appointment.mobileNumber}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900">{appointment.doctor?.fullName || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{appointment.doctor?.specialization || ''}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">{appointment.reason || '—'}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                appointment.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : appointment.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : appointment.status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                              {appointment.status === 'cancelled' && (
                                <div className="mt-2 text-xs text-red-600 space-y-1">
                                  <p>
                                    Cancelled {appointment.cancelledAt ? new Date(appointment.cancelledAt).toLocaleString() : ''}
                                  </p>
                                  {appointment.cancellationReason && (
                                    <p>Reason: {appointment.cancellationReason}</p>
                                  )}
                                  {appointment.refundAmount > 0 && (
                                    <p>
                                      Refund: ₹{appointment.refundAmount}{' '}
                                      ({appointment.refundStatus?.replace(/_/g, ' ')})
                                    </p>
                                  )}
                                  {appointment.refundNotes && (
                                    <p className="text-gray-500">Notes: {appointment.refundNotes}</p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {appointment.smsSent ? (
                                <span className="text-xs text-green-600 font-semibold">✓ Sent</span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAppointment(appointment)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-xs"
                                  title="Edit Appointment"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleResendSMS(appointment._id)}
                                  disabled={appointment.status === 'cancelled'}
                                  className={`px-3 py-1 rounded transition text-xs ${
                                    appointment.status === 'cancelled'
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                                  title="Resend SMS"
                                >
                                  Resend SMS
                                </button>
                                <button
                                  onClick={() => openCancelModal(appointment)}
                                  disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                                  className={`px-3 py-1 rounded transition text-xs ${
                                    appointment.status === 'cancelled' || appointment.status === 'completed'
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                  title="Cancel Appointment"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Edit Appointment Modal */}
      {showEditAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-8 my-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Appointment</h3>

            <form onSubmit={handleUpdateAppointment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    name="patientName"
                    value={editingAppointmentForm.patientName}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, patientName: e.target.value })}
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
                    value={editingAppointmentForm.mobileNumber}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, mobileNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editingAppointmentForm.email}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor *
                  </label>
                  <select
                    name="doctor"
                    value={editingAppointmentForm.doctor}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, doctor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={editingAppointmentForm.appointmentDate}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, appointmentDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Time *
                  </label>
                  <input
                    type="time"
                    name="appointmentTime"
                    value={editingAppointmentForm.appointmentTime}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, appointmentTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={editingAppointmentForm.status}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Appointment
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={editingAppointmentForm.reason}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, reason: e.target.value })}
                    placeholder="e.g., Routine checkup, Follow-up, Consultation"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={editingAppointmentForm.notes}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Any additional notes..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                >
                  Update Appointment
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {showCancelModal && appointmentToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 my-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Cancel Appointment</h3>
            <p className="text-sm text-gray-600 mb-6">
              Appointment for <span className="font-semibold">{appointmentToCancel.patientName}</span> with Dr. {appointmentToCancel.doctor?.fullName}
              {' '}on {new Date(appointmentToCancel.appointmentDate).toLocaleDateString()} at {appointmentToCancel.appointmentTime}.
            </p>

            <form onSubmit={submitCancellation} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Reason *</label>
                <textarea
                  name="reason"
                  value={cancelForm.reason}
                  onChange={handleCancelFormChange}
                  className="w-full min-h-[80px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Provide the reason for cancellation"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Refund Amount (₹)</label>
                  <input
                    type="number"
                    name="refundAmount"
                    min="0"
                    step="0.01"
                    value={cancelForm.refundAmount}
                    onChange={handleCancelFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Refund Status</label>
                  <select
                    name="refundStatus"
                    value={cancelForm.refundStatus}
                    onChange={handleCancelFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    disabled={!cancelForm.refundAmount || Number(cancelForm.refundAmount) <= 0}
                  >
                    <option value="not_applicable">Not applicable</option>
                    <option value="pending">Pending</option>
                    <option value="processed">Processed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Refund Notes</label>
                <textarea
                  name="refundNotes"
                  value={cancelForm.refundNotes}
                  onChange={handleCancelFormChange}
                  className="w-full min-h-[60px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Additional details about the refund (optional)"
                />
              </div>

              <label className="inline-flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="notifyPatient"
                  checked={cancelForm.notifyPatient}
                  onChange={handleCancelFormChange}
                  className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="ml-2">Send SMS notification to patient</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Confirm Cancellation
                </button>
                <button
                  type="button"
                  onClick={closeCancelModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Limit Modal */}
      {selectedDoctorForLimit && (
        <PatientLimitModal
          doctor={selectedDoctorForLimit}
          isOpen={showLimitModal}
          onClose={() => {
            setShowLimitModal(false)
            setSelectedDoctorForLimit(null)
          }}
          onUpdate={fetchDoctors}
        />
      )}
    </div>
  )
}

export default ReceptionistDashboard

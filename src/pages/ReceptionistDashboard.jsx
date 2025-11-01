import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import PatientLimitModal from '../components/PatientLimitModal'

const getDefaultVisitDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultVisitTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const getInitialFormData = () => ({
  fullName: '',
  mobileNumber: '',
  address: '',
  age: '',
  disease: '',
  doctor: '',
  visitDate: getDefaultVisitDate(),
  visitTime: getDefaultVisitTime()
})

const getDefaultAppointmentDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

const getDefaultAppointmentTime = () => '10:00'

const getInitialAppointmentForm = () => ({
  patientName: '',
  mobileNumber: '',
  email: '',
  appointmentDate: getDefaultAppointmentDate(),
  appointmentTime: getDefaultAppointmentTime(),
  doctor: '',
  reason: '',
  notes: ''
})

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
  const [formData, setFormData] = useState(getInitialFormData)
  const [appointmentForm, setAppointmentForm] = useState(getInitialAppointmentForm)
  const [showAppointmentSuccess, setShowAppointmentSuccess] = useState(false)
  const [appointmentSuccessData, setAppointmentSuccessData] = useState(null)
  const [cancelledAppointmentInfo, setCancelledAppointmentInfo] = useState(null)
  const [showCancelSuccess, setShowCancelSuccess] = useState(false)

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
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
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
      setFormData(getInitialFormData())
      
      toast.success('Patient registered successfully!')
      
      // Refresh patient lists
      fetchTodayPatients()
      fetchPatientHistory()
      fetchDoctors()
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
      
      // Sort by visit time then token number
      allTodayPatients.sort((a, b) => {
        const timeA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0
        const timeB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0
        const timeDiff = timeA - timeB
        if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
          return timeDiff
        }
        return (a.tokenNumber || 0) - (b.tokenNumber || 0)
      })
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

  const getDateTimeLabels = (value) => {
    if (!value) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    return {
      dateLabel: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeLabel: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getAppointmentLabels = (dateStr, timeStr) => {
    if (!dateStr) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    const isoString = timeStr ? `${dateStr}T${timeStr}` : dateStr
    return getDateTimeLabels(isoString)
  }

  const limitedPatientHistory = patientHistory.slice(0, 50)
  const generatedTokenDateTime = generatedToken ? getDateTimeLabels(generatedToken.registrationDate) : null
  const sortedAppointments = appointments.slice().sort((a, b) => {
    const timeA = new Date(`${a.appointmentDate}T${a.appointmentTime || '00:00'}`).getTime()
    const timeB = new Date(`${b.appointmentDate}T${b.appointmentTime || '00:00'}`).getTime()
    return timeA - timeB
  })

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
      const response = await api.post('/appointment', {
        ...appointmentForm,
        skipSms: true
      })
      
      toast.success(response.data.message || 'Appointment scheduled successfully!')
      setAppointmentSuccessData(response.data.data)
      setShowAppointmentSuccess(true)
      
      // Reset form
      setAppointmentForm(getInitialAppointmentForm())
      
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

  const handleCancelAppointment = async (appointment) => {
    setCancelledAppointmentInfo({
      patientName: appointment.patientName,
      doctorName: appointment.doctor?.fullName || 'Assigned doctor',
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime
    })
    setShowCancelSuccess(true)
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
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-green-600">Tekisky</span>
              <span className="text-2xl sm:text-3xl font-semibold text-slate-800">Hospital</span>
            </div>
            <p className="mt-1 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 rounded-full">Receptionist Hub</p>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">Manage arrivals, generate tokens, and coordinate with doctors seamlessly.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doctor, index) => {
                const stats = doctorStats[doctor._id] || {}
                const dailyLimit = stats.dailyPatientLimit ?? doctor.dailyPatientLimit ?? 0
                const todayCount = stats.todayPatientCount ?? 0
                const remainingSlots = stats.remainingSlots ?? Math.max(dailyLimit - todayCount, 0)
                const limitReached = stats.isLimitReached || remainingSlots <= 0

                return (
                  <div
                    key={doctor._id}
                    className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-green-400 to-emerald-600" aria-hidden="true"></div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-semibold flex items-center justify-center">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">{doctor.fullName}</h3>
                            <p className="text-sm text-gray-600 capitalize">{doctor.specialization || 'General Physician'}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Fees ₹{doctor.fees ?? '—'}
                              </span>
                              {doctor.experience && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                  {doctor.experience} yrs exp.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSetLimitClick(doctor)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition"
                        >
                          Set Limit
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Daily Limit</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{dailyLimit}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Today</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{todayCount}</p>
                        </div>
                        <div className={`rounded-xl px-3 py-2 border ${limitReached ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                          <p className={`text-xs uppercase tracking-wide ${limitReached ? 'text-red-500' : 'text-emerald-600'}`}>Remaining</p>
                          <p className={`mt-1 text-lg font-semibold ${limitReached ? 'text-red-600' : 'text-emerald-600'}`}>{remainingSlots}</p>
                        </div>
                      </div>

                      {limitReached && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          Daily limit reached — consider increasing the limit or redirecting patients.
                        </div>
                      )}
                    </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Date *
                </label>
                <input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Time *
                </label>
                <input
                  type="time"
                  name="visitTime"
                  value={formData.visitTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {todayPatients.map((patient, index) => {
                        const { dateLabel, timeLabel } = getDateTimeLabels(patient.registrationDate)
                        return (
                          <tr key={patient._id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold flex items-center justify-center text-sm">
                                {String(index + 1).padStart(2, '0')}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span>{patient.fullName}</span>
                                <span className="hidden sm:inline text-xs uppercase tracking-wide text-gray-400">•</span>
                                <span className="text-sm text-gray-500 font-normal">Age {patient.age}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Mobile: {patient.mobileNumber || '—'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900 font-medium">{patient.doctor?.fullName || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{patient.doctor?.specialization || '—'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {patient.disease || 'Not specified'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                                #{patient.tokenNumber}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{dateLabel}</div>
                              <div className="text-xs text-gray-500">{timeLabel}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                          </tr>
                        )
                      })}
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {limitedPatientHistory.map((patient, index) => {
                        const { dateLabel, timeLabel } = getDateTimeLabels(patient.registrationDate || patient.createdAt)
                        return (
                          <tr key={patient._id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-sm">
                                {String(index + 1).padStart(2, '0')}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span>{patient.fullName}</span>
                                <span className="hidden sm:inline text-xs uppercase tracking-wide text-gray-400">•</span>
                                <span className="text-sm text-gray-500 font-normal">Age {patient.age}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Mobile: {patient.mobileNumber || '—'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900 font-medium">{patient.doctor?.fullName || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{patient.doctor?.specialization || '—'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                {patient.disease || 'Not specified'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{dateLabel}</div>
                              <div className="text-xs text-gray-500">{timeLabel}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                                #{patient.tokenNumber}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                          </tr>
                        )
                      })}
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
                      min={getDefaultAppointmentDate()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">We schedule visits from the next calendar day by default.</p>
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
                  Schedule Next-Day Appointment & Send SMS
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedAppointments.map((appointment, index) => {
                        const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`)
                        const isPast = appointmentDateTime < new Date()
                        const { dateLabel, timeLabel } = getAppointmentLabels(appointment.appointmentDate, appointment.appointmentTime)
                        const isToday = appointmentDateTime.toDateString() === new Date().toDateString()

                        return (
                          <tr key={appointment._id} className={`hover:bg-gray-50 ${isPast ? 'opacity-80' : ''}`}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold flex items-center justify-center text-sm">
                                {String(index + 1).padStart(2, '0')}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {dateLabel}
                                {isToday && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Today</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{timeLabel}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span>{appointment.patientName}</span>
                                <span className="hidden sm:inline text-xs uppercase tracking-wide text-gray-400">•</span>
                                <span className="text-sm text-gray-500 font-normal">{appointment.mobileNumber}</span>
                              </div>
                              {appointment.email && (
                                <p className="text-xs text-gray-400 truncate">{appointment.email}</p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900 font-medium">{appointment.doctor?.fullName || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{appointment.doctor?.specialization || '—'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {appointment.reason || 'General consultation'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                appointment.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : appointment.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : appointment.status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
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
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  Sent
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleResendSMS(appointment._id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                                >
                                  Resend
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleCancelAppointment(appointment)}
                                disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                                className={`px-3 py-1 rounded transition text-xs ${
                                  appointment.status === 'cancelled' || appointment.status === 'completed'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                Cancel
                              </button>
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
              <p>
                <span className="font-semibold">Visit:</span>{' '}
                {generatedTokenDateTime
                  ? `${generatedTokenDateTime.dateLabel} • ${generatedTokenDateTime.timeLabel}`
                  : new Date(generatedToken.registrationDate).toLocaleString()}
              </p>
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

      {/* Appointment Success Modal */}
      {showAppointmentSuccess && appointmentSuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Appointment Scheduled!</h3>
              <p className="text-gray-600">Details saved in Tekisky Hospital system.</p>
            </div>

            <div className="text-left mb-6 space-y-2 text-sm bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p><span className="font-semibold text-gray-700">Patient:</span> {appointmentSuccessData.patientName}</p>
              <p><span className="font-semibold text-gray-700">Mobile:</span> {appointmentSuccessData.mobileNumber}</p>
              <p><span className="font-semibold text-gray-700">Doctor:</span> {appointmentSuccessData.doctor?.fullName || '—'}</p>
              <p><span className="font-semibold text-gray-700">Specialization:</span> {appointmentSuccessData.doctor?.specialization || '—'}</p>
              <p><span className="font-semibold text-gray-700">Visit:</span> {(() => {
                const { dateLabel, timeLabel } = getAppointmentLabels(
                  appointmentSuccessData.appointmentDate,
                  appointmentSuccessData.appointmentTime
                )
                return `${dateLabel} • ${timeLabel}`
              })()}</p>
            </div>

            <button
              onClick={() => {
                setShowAppointmentSuccess(false)
                setAppointmentSuccessData(null)
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
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

      {/* Cancellation Success Modal */}
      {showCancelSuccess && cancelledAppointmentInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m2 9H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Appointment Has Been Cancelled</h3>
            <p className="text-sm text-gray-600 mb-6">
              The appointment for <span className="font-semibold">{cancelledAppointmentInfo.patientName}</span> with Dr. {cancelledAppointmentInfo.doctorName}
              {' '}on {new Date(cancelledAppointmentInfo.appointmentDate).toLocaleString()} has been cancelled. Please inform the patient and process any refunds if applicable.
            </p>
            <button
              onClick={() => {
                setShowCancelSuccess(false)
                setCancelledAppointmentInfo(null)
              }}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Close
            </button>
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

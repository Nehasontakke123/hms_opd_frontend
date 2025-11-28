import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('users') // 'users', 'patients', or 'import-export'
  const [users, setUsers] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
    specialization: '',
    qualification: '',
    fees: '',
    mobileNumber: '',
    clinicAddress: ''
  })
  const [viewMode, setViewMode] = useState('table')
  const [userSearch, setUserSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientDate, setPatientDate] = useState('')
  const [selectedMetric, setSelectedMetric] = useState(null) // 'total', 'doctors', 'receptionists', 'patients'
  const [importLoading, setImportLoading] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importJsonData, setImportJsonData] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10
  const [filteredDataPage, setFilteredDataPage] = useState(1)
  const filteredDataPerPage = 10
  const [formErrors, setFormErrors] = useState({})
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isSuccessClosing, setIsSuccessClosing] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchPatients()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Failed to fetch users')
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patient')
      setPatients(response.data.data)
    } catch (error) {
      toast.error('Failed to fetch patients')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const updatedFormData = {
      ...formData,
      [name]: value
    }
    
    // If role changes, clear doctor-specific fields if not doctor
    if (name === 'role' && value !== 'doctor') {
      updatedFormData.specialization = ''
      updatedFormData.qualification = ''
      updatedFormData.fees = ''
      updatedFormData.clinicAddress = ''
    }
    
    setFormData(updatedFormData)
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      })
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.fullName?.trim()) {
      errors.fullName = 'Full Name is required'
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!editingUser && !formData.password?.trim()) {
      errors.password = 'Password is required'
    } else if (!editingUser && formData.password?.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.role) {
      errors.role = 'Role is required'
    }
    
    if (formData.role === 'doctor') {
      if (!formData.specialization?.trim()) {
        errors.specialization = 'Specialization is required for doctors'
      }
      if (!formData.qualification?.trim()) {
        errors.qualification = 'Qualification is required for doctors'
      }
    }
    
    if (!formData.mobileNumber?.trim()) {
      errors.mobileNumber = 'Mobile Number is required'
    } else if (!/^[0-9]{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
      errors.mobileNumber = 'Please enter a valid 10-digit mobile number'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCloseModal = () => {
    setIsModalClosing(true)
    setTimeout(() => {
      setShowModal(false)
      setIsModalClosing(false)
      setEditingUser(null)
      setFormErrors({})
      setShowPassword(false)
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: '',
        specialization: '',
        qualification: '',
        fees: '',
        mobileNumber: '',
        clinicAddress: ''
      })
    }, 200)
  }

  const handleCloseSuccessPopup = () => {
    setIsSuccessClosing(true)
    setTimeout(() => {
      setShowSuccessPopup(false)
      setIsSuccessClosing(false)
      setSuccessMessage('')
    }, 200)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser._id}`, formData)
        toast.success('User updated successfully!', {
          style: {
            background: '#27AE60',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
          },
          icon: '✓',
          duration: 3000,
        })
        handleCloseModal()
      } else {
        await api.post('/admin/users', formData)
        
        // Get role-based success message
        const roleMessages = {
          doctor: 'Doctor created successfully!',
          receptionist: 'Receptionist created successfully!',
          medical: 'Medical staff created successfully!',
          admin: 'Admin created successfully!'
        }
        
        const message = roleMessages[formData.role] || 'User created successfully!'
        setSuccessMessage(message)
        handleCloseModal()
        setShowSuccessPopup(true)
      }
      
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed', {
        style: {
          background: '#EB5757',
          color: '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
        },
      })
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      specialization: user.specialization || '',
      qualification: user.qualification || '',
      fees: user.fees || '',
      mobileNumber: user.mobileNumber || '',
      clinicAddress: user.clinicAddress || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    
    try {
      await api.delete(`/admin/users/${id}`)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const formatDateLabel = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const groupPatientsByDateAndDoctor = (list) => {
    const grouped = {}
    
    list.forEach(patient => {
      const date = formatDateLabel(patient.registrationDate)
      
      if (!grouped[date]) {
        grouped[date] = {}
      }
      
      const doctorName = patient.doctor?.fullName || 'Unknown Doctor'
      
      if (!grouped[date][doctorName]) {
        grouped[date][doctorName] = []
      }
      
      grouped[date][doctorName].push(patient)
    })
    
    return grouped
  }

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return users

    return users.filter((user) => {
      const fullName = user.fullName?.toLowerCase() || ''
      const email = user.email?.toLowerCase() || ''
      const role = user.role?.toLowerCase() || ''
      const specialization = user.specialization?.toLowerCase() || ''
      const qualification = user.qualification?.toLowerCase() || ''
      const mobile = user.mobileNumber?.toLowerCase() || ''

      // If search term is "doctor", show only doctors
      if (term === 'doctor' || term === 'doctors') {
        return role === 'doctor'
      }

      // Otherwise, search across all fields
      return (
        fullName.includes(term) ||
        email.includes(term) ||
        role.includes(term) ||
        specialization.includes(term) ||
        qualification.includes(term) ||
        mobile.includes(term)
      )
    })
  }, [users, userSearch])

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [userSearch])

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase()
    return patients.filter((patient) => {
      if (patientDate) {
        const registrationIso = new Date(patient.registrationDate).toISOString().split('T')[0]
        if (registrationIso !== patientDate) {
          return false
        }
      }

      if (!term) return true

      const doctorName = patient.doctor?.fullName?.toLowerCase() || ''
      const fullName = patient.fullName?.toLowerCase() || ''
      const mobile = patient.mobileNumber?.toLowerCase() || ''
      const disease = patient.disease?.toLowerCase() || ''
      const tokenNumber = String(patient.tokenNumber || '').toLowerCase()

      return (
        fullName.includes(term) ||
        doctorName.includes(term) ||
        mobile.includes(term) ||
        disease.includes(term) ||
        tokenNumber.includes(term)
      )
    })
  }, [patients, patientSearch, patientDate])

  const groupedPatients = useMemo(
    () => groupPatientsByDateAndDoctor(filteredPatients),
    [filteredPatients]
  )

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }),
    []
  )

  const metrics = [
    {
      id: 'total',
      label: 'Total Users',
      value: users.length,
      accent: 'bg-blue-100 text-blue-700',
      icon: '👥',
      filter: 'all'
    },
    {
      id: 'doctors',
      label: 'Doctors',
      value: users.filter((u) => u.role === 'doctor').length,
      accent: 'bg-green-100 text-green-700',
      icon: '🟢',
      filter: 'doctor'
    },
    {
      id: 'receptionists',
      label: 'Receptionists',
      value: users.filter((u) => u.role === 'receptionist').length,
      accent: 'bg-purple-100 text-purple-700',
      icon: '🟣',
      filter: 'receptionist'
    },
    {
      id: 'patients',
      label: 'Patients Registered',
      value: patients.length,
      accent: 'bg-orange-100 text-orange-700',
      icon: '🔵',
      filter: 'patients'
    }
  ]

  // Filter data based on selected metric
  const filteredData = useMemo(() => {
    if (!selectedMetric) return null
    
    const metric = metrics.find(m => m.id === selectedMetric)
    if (!metric) return null

    if (metric.filter === 'patients') {
      return patients.map(patient => ({
        ...patient,
        type: 'patient',
        displayName: patient.fullName,
        displayEmail: patient.email || patient.mobileNumber || 'N/A',
        displayRole: 'Patient',
        displayDate: formatDateLabel(patient.createdAt || patient.registrationDate),
        displayStatus: patient.status || 'Active'
      }))
    } else if (metric.filter === 'all') {
      return users.map(user => ({
        ...user,
        type: 'user',
        displayName: user.fullName,
        displayEmail: user.email,
        displayRole: user.role,
        displayDate: formatDateLabel(user.createdAt),
        displayStatus: user.isAvailable !== undefined ? (user.isAvailable ? 'Active' : 'Inactive') : 'Active'
      }))
    } else {
      return users
        .filter(u => u.role === metric.filter)
        .map(user => ({
          ...user,
          type: 'user',
          displayName: user.fullName,
          displayEmail: user.email,
          displayRole: user.role,
          displayDate: formatDateLabel(user.createdAt),
          displayStatus: user.isAvailable !== undefined ? (user.isAvailable ? 'Active' : 'Inactive') : 'Active'
        }))
    }
  }, [selectedMetric, users, patients])

  const handleMetricClick = (metricId) => {
    setSelectedMetric(metricId === selectedMetric ? null : metricId)
    // Reset pagination when metric changes
    setFilteredDataPage(1)
    // Smooth scroll to data view
    setTimeout(() => {
      const dataSection = document.getElementById('metric-data-section')
      if (dataSection) {
        dataSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  // Pagination for filtered data table
  const filteredDataTotalPages = useMemo(() => {
    if (!filteredData) return 1
    return Math.ceil(filteredData.length / filteredDataPerPage)
  }, [filteredData, filteredDataPerPage])

  const paginatedFilteredData = useMemo(() => {
    if (!filteredData) return []
    const startIndex = (filteredDataPage - 1) * filteredDataPerPage
    const endIndex = startIndex + filteredDataPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, filteredDataPage, filteredDataPerPage])

  // Reset to page 1 when filteredData changes
  useEffect(() => {
    setFilteredDataPage(1)
  }, [selectedMetric])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header with Hospital Branding */}
      <header className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Hospital Logo and Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Medical Cross Icon */}
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-teal-600 rounded-xl shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                    Tekisky
                  </span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-700">
                    Hospital +
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                  Admin Dashboard
                </p>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                  Manage staff, track patient registrations, and keep Tekisky Hospital + running smoothly.
                </p>
              </div>
            </div>
            
            {/* User Info and Logout Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {/* Logged-in User Name */}
              {user?.fullName && (
                <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/50 shadow-sm">
                  {/* Profile Icon */}
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <span className="text-xs sm:text-sm font-semibold text-white">
                      {user.fullName?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  {/* User Name */}
                  <div className="flex flex-col">
                    <span className="text-sm sm:text-base font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-none">
                      {user.fullName}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-500">
                      Administrator
                    </span>
                  </div>
                </div>
              )}
              
              {/* Logout Button */}
              <button 
                onClick={logout} 
                className="self-start sm:self-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base active:scale-95 whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Top Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              onClick={() => handleMetricClick(metric.id)}
              className={`bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${
                selectedMetric === metric.id
                  ? 'border-blue-500 border-2 shadow-lg ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`text-3xl ${selectedMetric === metric.id ? 'scale-110' : ''} transition-transform duration-300`}>
                  {metric.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-800">{metric.value}</p>
                </div>
              </div>
              <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-sm font-bold transition-all ${metric.accent} ${
                selectedMetric === metric.id ? 'scale-110 shadow-md' : ''
              }`}>
                {metric.value}
              </span>
            </button>
          ))}
        </section>

        {/* Filtered Data View */}
        {selectedMetric && filteredData && (
          <div 
            id="metric-data-section"
            className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-fadeIn"
          >
            {/* Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedMetric(null)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                      <span className="text-2xl">{metrics.find(m => m.id === selectedMetric)?.icon}</span>
                      {metrics.find(m => m.id === selectedMetric)?.label}
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                        {filteredData.length} {selectedMetric === 'patients' ? 'records' : 'users'}
                        {filteredDataTotalPages > 1 && (
                          <span className="ml-2 text-xs">(Page {filteredDataPage} of {filteredDataTotalPages})</span>
                        )}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {selectedMetric === 'patients' 
                        ? 'Complete list of all registered patients' 
                        : `All ${metrics.find(m => m.id === selectedMetric)?.label.toLowerCase()} accounts`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            {filteredData.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">No records found</p>
                <p className="text-sm text-slate-500">No data available for this selection.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                        {selectedMetric !== 'patients' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Specialization</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Mobile</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                          </>
                        )}
                        {selectedMetric === 'patients' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Doctor</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Issue</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Token</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {paginatedFilteredData.map((item, index) => (
                        <tr 
                          key={item._id} 
                          className="hover:bg-slate-50 transition animate-slideIn"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                                selectedMetric === 'doctors' ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                : selectedMetric === 'receptionists' ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : selectedMetric === 'patients' ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600'
                              }`}>
                                {item.displayName?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.displayName}</p>
                                {item.type === 'user' && (
                                  <p className="text-xs text-slate-400">ID: {item._id.slice(-6)}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{item.displayEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                              item.displayRole === 'doctor'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.displayRole === 'receptionist'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : item.displayRole === 'Patient'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                item.displayRole === 'doctor' ? 'bg-emerald-500'
                                : item.displayRole === 'receptionist' ? 'bg-purple-500'
                                : item.displayRole === 'Patient' ? 'bg-blue-500'
                                : 'bg-slate-400'
                              }`}></span>
                              {item.displayRole}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900 flex items-center gap-2">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {item.displayDate}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                              item.displayStatus === 'Active' || item.displayStatus === 'active'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : item.displayStatus === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                item.displayStatus === 'Active' || item.displayStatus === 'active' || item.displayStatus === 'completed'
                                  ? 'bg-green-500'
                                  : 'bg-slate-400'
                              }`}></span>
                              {item.displayStatus}
                            </span>
                          </td>
                          {selectedMetric !== 'patients' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-600">{item.specialization || '—'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-600">{item.mobileNumber || '—'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21H3v-4.5L16.732 3.732z" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item._id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold border border-red-200 transition"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                          {selectedMetric === 'patients' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-slate-900">{item.doctor?.fullName || 'N/A'}</div>
                                <div className="text-xs text-slate-500">{item.doctor?.specialization || '—'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  {item.disease || 'Not specified'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full font-bold text-sm border border-blue-200 shadow-sm">
                                  #{item.tokenNumber}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredDataTotalPages > 1 && (
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                  {/* Desktop: Full Pagination with Page Numbers */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-semibold text-slate-800">{(filteredDataPage - 1) * filteredDataPerPage + 1}</span> to{' '}
                      <span className="font-semibold text-slate-800">{Math.min(filteredDataPage * filteredDataPerPage, filteredData.length)}</span> of{' '}
                      <span className="font-semibold text-slate-800">{filteredData.length}</span> {selectedMetric === 'patients' ? 'records' : 'users'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFilteredDataPage(prev => Math.max(1, prev - 1))}
                        disabled={filteredDataPage === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          filteredDataPage === 1
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md'
                        }`}
                        aria-label="Previous page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>

                      {/* Page Number Buttons */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: filteredDataTotalPages }, (_, i) => i + 1).map((pageNum) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            pageNum === 1 ||
                            pageNum === filteredDataTotalPages ||
                            (pageNum >= filteredDataPage - 1 && pageNum <= filteredDataPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setFilteredDataPage(pageNum)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  filteredDataPage === pageNum
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md'
                                }`}
                                aria-label={`Go to page ${pageNum}`}
                              >
                                {pageNum}
                              </button>
                            )
                          } else if (
                            pageNum === filteredDataPage - 2 ||
                            pageNum === filteredDataPage + 2
                          ) {
                            return (
                              <span key={pageNum} className="px-2 text-slate-400">
                                ...
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>

                      <button
                        onClick={() => setFilteredDataPage(prev => Math.min(filteredDataTotalPages, prev + 1))}
                        disabled={filteredDataPage === filteredDataTotalPages}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          filteredDataPage === filteredDataTotalPages
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md'
                        }`}
                        aria-label="Next page"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Mobile: Compact Pagination */}
                  <div className="md:hidden flex items-center justify-between gap-3">
                    <button
                      onClick={() => setFilteredDataPage(prev => Math.max(1, prev - 1))}
                      disabled={filteredDataPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 touch-manipulation ${
                        filteredDataPage === 1
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm active:scale-95'
                      }`}
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="flex-1 text-center">
                      <span className="text-sm text-slate-600">
                        Page <span className="font-semibold text-slate-800">{filteredDataPage}</span> of <span className="font-semibold text-slate-800">{filteredDataTotalPages}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => setFilteredDataPage(prev => Math.min(filteredDataTotalPages, prev + 1))}
                      disabled={filteredDataPage === filteredDataTotalPages}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 touch-manipulation ${
                        filteredDataPage === filteredDataTotalPages
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm active:scale-95'
                      }`}
                      aria-label="Next page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="border border-slate-200 bg-white rounded-2xl shadow-sm">
          <nav className="flex flex-col sm:flex-row">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition ${
                activeTab === 'patients'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All Patients
            </button>
            <button
              onClick={() => setActiveTab('import-export')}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition ${
                activeTab === 'import-export'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Import/Export Medicines
            </button>
          </nav>
        </div>

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* Action Bar */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <span>User Management</span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                    {users.length} active
                  </span>
                </h2>
                <p className="mt-2 text-sm text-slate-500">Onboard, edit, and manage Tekisky staff centrally.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, email, or role..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                  {userSearch && (
                    <button
                      onClick={() => setUserSearch('')}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition text-sm whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add User
                </button>
              </div>
            </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-lg font-semibold mb-2">
              {userSearch ? 'No users found matching your search' : 'No users found'}
            </p>
            <p className="text-slate-400 text-sm">
              {userSearch ? 'Try adjusting your search terms' : 'Start by adding a new user'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {['Name','Email','Role','Specialization','Qualification','Fees','Mobile','Actions'].map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-blue-50/40 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {u.fullName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p>{u.fullName}</p>
                          <p className="text-xs text-slate-400">ID: {u._id.slice(-6)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${
                          u.role === 'doctor'
                            ? 'bg-emerald-50 text-emerald-600'
                            : u.role === 'receptionist'
                            ? 'bg-purple-50 text-purple-600'
                            : u.role === 'medical'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {u.specialization || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {u.role === 'doctor' ? (u.qualification || <span className="text-slate-300">—</span>) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {u.role === 'doctor' ? (u.fees ? `₹${u.fees}` : <span className="text-slate-300">—</span>) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {u.mobileNumber || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(u)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21H3v-4.5L16.732 3.732z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u._id)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {paginatedUsers.map((u) => (
                <div key={u._id} className="p-4 border-b border-slate-200 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800">{u.fullName}</h3>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      u.role === 'doctor'
                        ? 'bg-emerald-50 text-emerald-600'
                        : u.role === 'receptionist'
                        ? 'bg-purple-50 text-purple-600'
                        : u.role === 'medical'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-1">Specialization: {u.specialization || '—'}</p>
                  {u.role === 'doctor' && <p className="text-sm text-slate-500 mb-1">Qualification: {u.qualification || '—'}</p>}
                  {u.role === 'doctor' && <p className="text-sm text-slate-500 mb-1">Fees: {u.fees ? `₹${u.fees}` : '—'}</p>}
                  <p className="text-sm text-slate-500 mb-3">Mobile: {u.mobileNumber || '—'}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg shadow-sm hover:shadow-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg shadow-sm hover:shadow-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {filteredUsers.length > usersPerPage && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-slate-800">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                  <span className="font-semibold text-slate-800">{filteredUsers.length}</span> users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      currentPage === 1
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span key={pageNum} className="px-2 text-slate-400">
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      currentPage === totalPages
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md'
                    }`}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Patients Tab Content */}
        {activeTab === 'patients' && (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <span>All Patients</span>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold uppercase tracking-wide">{filteredPatients.length} records</span>
                </h2>
                <p className="mt-2 text-sm text-slate-500">Today is {todayLabel}. Daily overview of registrations grouped by consulting doctor.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  type="date"
                  value={patientDate}
                  onChange={(e) => setPatientDate(e.target.value)}
                  className="w-full sm:w-52 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patient name or token number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                  {patientSearch && (
                    <button
                      onClick={() => setPatientSearch('')}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <p className="text-slate-500 text-lg">No patients match the current filters</p>
              </div>
            ) : (
              Object.keys(groupedPatients).map((date) => (
                <div key={date} className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{date}</h3>
                      <p className="text-xs text-slate-500">Daily breakdown of patient visits</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {Object.values(groupedPatients[date]).reduce((sum, arr) => sum + arr.length, 0)} patient(s)
                    </div>
                  </div>

                  {Object.keys(groupedPatients[date]).map((doctorName) => {
                    const doctorPatients = groupedPatients[date][doctorName]
                    const totalCollected = doctorPatients.reduce((sum, patient) => {
                      const fees = patient.fees || patient.doctor?.fees || 0
                      return sum + fees
                    }, 0)

                    return (
                      <section key={doctorName} className="border-b border-slate-100 last:border-b-0">
                        <header className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                              {doctorName?.trim()?.[0]?.toUpperCase() || 'D'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">Dr. {doctorName}</h4>
                              <p className="text-xs text-slate-500">{doctorPatients.length} patient(s)</p>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.598 1.002M12 8V6m0 10v2m-7-6h2m10 0h2" />
                            </svg>
                            Total Collected ₹{totalCollected}
                          </div>
                        </header>

                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                {['Token','Patient','Patient ID','Age','Mobile','Issue','Fees','Status'].map((heading) => (
                                  <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    {heading}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {doctorPatients.map((patient) => (
                                <tr key={patient._id} className="hover:bg-blue-50/40 transition">
                                  <td className="px-5 py-3 text-sm">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-semibold">
                                      {patient.tokenNumber}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-sm font-medium text-slate-800">
                                    {patient.fullName}
                                  </td>
                                  <td className="px-5 py-3 text-sm">
                                    {patient.patientId ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-bold border border-blue-200 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                                        </svg>
                                        {patient.patientId}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-sm text-slate-500">{patient.age}</td>
                                  <td className="px-5 py-3 text-sm text-slate-500">{patient.mobileNumber}</td>
                                  <td className="px-5 py-3 text-sm text-slate-500">{patient.disease}</td>
                                  <td className="px-5 py-3 text-sm font-semibold text-slate-700">₹{patient.fees || patient.doctor?.fees || 0}</td>
                                  <td className="px-5 py-3 text-sm">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${
                                      patient.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : patient.status === 'in-progress'
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      <span className="w-2 h-2 rounded-full bg-current"></span>
                                      {patient.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* Import/Export Tab Content */}
        {activeTab === 'import-export' && (
          <div className="space-y-8 mt-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Medicine Data Import/Export</h2>
              <p className="text-sm text-slate-500">Import medicines from Indian Medicine Dataset (JSON) or Excel files. Export current medicine database.</p>
            </div>

            {/* Import Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Import Medicines</h3>
              
              {/* Import from URL */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Import from URL (Indian Medicine Dataset)</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/indian_medicine_data.json"
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!importUrl) {
                        toast.error('Please enter a URL')
                        return
                      }
                      try {
                        setImportLoading(true)
                        const response = await api.post('/admin/import-export/sync', { url: importUrl })
                        toast.success(response.data.message || 'Data synchronized successfully')
                        setImportUrl('')
                      } catch (error) {
                        toast.error(error.response?.data?.message || 'Failed to sync data')
                      } finally {
                        setImportLoading(false)
                      }
                    }}
                    disabled={importLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {importLoading ? 'Syncing...' : 'Sync from URL'}
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  💡 Use the Indian Medicine Dataset JSON URL to automatically sync medicine data
                </p>
              </div>

              {/* Import from JSON */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-3">Import from JSON</h4>
                <textarea
                  value={importJsonData}
                  onChange={(e) => setImportJsonData(e.target.value)}
                  placeholder='Paste JSON array of medicines: [{"name": "Medicine Name", "genericName": "...", ...}]'
                  rows="6"
                  className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
                />
                <button
                  onClick={async () => {
                    try {
                      const medicines = JSON.parse(importJsonData)
                      if (!Array.isArray(medicines)) {
                        toast.error('Invalid JSON format. Expected an array.')
                        return
                      }
                      setImportLoading(true)
                      const response = await api.post('/admin/import-export/import/json', {
                        medicines,
                        overwrite: false
                      })
                      toast.success(response.data.message || 'Import completed successfully')
                      setImportJsonData('')
                    } catch (error) {
                      if (error instanceof SyntaxError) {
                        toast.error('Invalid JSON format')
                      } else {
                        toast.error(error.response?.data?.message || 'Failed to import')
                      }
                    } finally {
                      setImportLoading(false)
                    }
                  }}
                  disabled={importLoading || !importJsonData.trim()}
                  className="mt-3 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {importLoading ? 'Importing...' : 'Import JSON'}
                </button>
              </div>

              {/* Import from Excel */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-3">Import from Excel File</h4>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // Validate file type
                      const fileName = file.name.toLowerCase()
                      const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
                      
                      if (fileExtension === '.json') {
                        toast.error('You selected a JSON file. Please use the "Import from JSON" section above, or convert your file to Excel format (.xlsx or .xls)')
                        e.target.value = '' // Clear the input
                        setImportFile(null)
                        return
                      }
                      
                      if (!['.xlsx', '.xls'].includes(fileExtension)) {
                        toast.error('Please select an Excel file (.xlsx or .xls)')
                        e.target.value = '' // Clear the input
                        setImportFile(null)
                        return
                      }
                      
                      setImportFile(file)
                    }
                  }}
                  className="mb-3"
                />
                {importFile && (
                  <p className="text-sm text-purple-700 mb-2">
                    Selected: {importFile.name}
                  </p>
                )}
                <button
                  onClick={async () => {
                    if (!importFile) {
                      toast.error('Please select a file')
                      return
                    }
                    
                    // Double-check file type before upload
                    const fileName = importFile.name.toLowerCase()
                    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
                    
                    if (fileExtension === '.json') {
                      toast.error('JSON files cannot be imported via Excel import. Please use the "Import from JSON" section.')
                      return
                    }
                    
                    if (!['.xlsx', '.xls'].includes(fileExtension)) {
                      toast.error('Invalid file type. Please select an Excel file (.xlsx or .xls)')
                      return
                    }
                    
                    try {
                      setImportLoading(true)
                      const formData = new FormData()
                      formData.append('file', importFile)
                      const response = await api.post('/admin/import-export/import/excel', formData, {
                        headers: {
                          'Content-Type': 'multipart/form-data'
                        }
                      })
                      toast.success(response.data.message || 'Import completed successfully')
                      setImportFile(null)
                      // Reset file input
                      const fileInput = document.querySelector('input[type="file"][accept=".xlsx,.xls"]')
                      if (fileInput) fileInput.value = ''
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Failed to import')
                    } finally {
                      setImportLoading(false)
                    }
                  }}
                  disabled={importLoading || !importFile}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  {importLoading ? 'Importing...' : 'Import Excel'}
                </button>
              </div>
            </div>

            {/* Export Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Export Medicines</h3>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    try {
                      const response = await api.get('/admin/import-export/export/json')
                      const blob = new Blob([JSON.stringify(response.data.data || response.data, null, 2)], { type: 'application/json' })
                      const url = window.URL.createObjectURL(blob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `medicines_export_${new Date().toISOString().split('T')[0]}.json`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                      toast.success('Export completed successfully')
                    } catch (error) {
                      toast.error('Failed to export')
                    }
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  📥 Export as JSON
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await api.get('/admin/import-export/export/excel', {
                        responseType: 'blob'
                      })
                      const url = window.URL.createObjectURL(new Blob([response.data]))
                      const link = document.createElement('a')
                      link.href = url
                      link.download = `medicines_export_${new Date().toISOString().split('T')[0]}.xlsx`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                      toast.success('Export completed successfully')
                    } catch (error) {
                      toast.error('Failed to export')
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  📊 Export as Excel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium Add User Modal */}
      {showModal && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${isModalClosing ? 'backdrop-exit' : 'backdrop-enter'}`}
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={handleCloseModal}
        >
          <div 
            className={`bg-white rounded-[18px] w-full sm:w-[95%] max-w-[520px] shadow-[0_10px_35px_rgba(0,0,0,0.08)] ${isModalClosing ? 'modal-exit' : 'modal-enter'}`}
            style={{ backgroundColor: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative px-4 sm:px-7 pt-4 sm:pt-7 pb-3 sm:pb-4 border-b border-[#E6E9F0]">
              <h3 className="text-lg sm:text-[22px] font-bold pr-8 sm:pr-10" style={{ color: '#1A1C20' }}>
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="close-btn-rotate absolute top-4 sm:top-7 right-4 sm:right-7 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFD] transition-colors"
                style={{ color: '#A0A6B1' }}
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-4 sm:px-7 py-4 sm:py-7 space-y-4 sm:space-y-5 max-h-[calc(100vh-180px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Full Name */}
              <div className="floating-label-group">
                <input
                  type="text"
                  name="fullName"
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder=" "
                  className={`w-full px-4 py-3 rounded-xl border transition-all outline-none focus:shadow-md ${
                    formErrors.fullName 
                      ? 'border-[#EB5757] focus:border-[#EB5757]' 
                      : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                  }`}
                  style={{ borderRadius: '12px' }}
                />
                <label htmlFor="fullName" className={formData.fullName ? 'floating' : ''}>Full Name</label>
                {formErrors.fullName && (
                  <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div className="floating-label-group">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder=" "
                  className={`w-full px-4 py-3 rounded-xl border transition-all outline-none focus:shadow-md ${
                    formErrors.email 
                      ? 'border-[#EB5757] focus:border-[#EB5757]' 
                      : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                  }`}
                  style={{ borderRadius: '12px' }}
                />
                <label htmlFor="email" className={formData.email ? 'floating' : ''}>Email</label>
                {formErrors.email && (
                  <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.email}</p>
                )}
              </div>

              {/* Password (only for new users) */}
              {!editingUser && (
                <div className="floating-label-group relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder=" "
                    className={`w-full px-4 py-3 pr-12 rounded-xl border transition-all outline-none focus:shadow-md ${
                      formErrors.password 
                        ? 'border-[#EB5757] focus:border-[#EB5757]' 
                        : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                    }`}
                    style={{ borderRadius: '12px' }}
                  />
                  <label htmlFor="password" className={formData.password ? 'floating' : ''}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#6F7480] hover:text-[#2F80ED] transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ transform: 'translateY(-50%)' }}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  {formErrors.password && (
                    <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.password}</p>
                  )}
                </div>
              )}

              {/* Role */}
              <div className="floating-label-group relative">
                <select
                  name="role"
                  id="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all outline-none appearance-none bg-white focus:shadow-md ${
                    formErrors.role 
                      ? 'border-[#EB5757] focus:border-[#EB5757]' 
                      : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                  }`}
                  style={{ borderRadius: '12px', paddingTop: formData.role ? '20px' : '16px', paddingBottom: '12px', paddingRight: '40px' }}
                >
                  <option value="">Select Role</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="medical">Medical Staff</option>
                </select>
                <label 
                  htmlFor="role" 
                  className={formData.role ? 'floating' : ''}
                >
                  Role
                </label>
                <div className="select-arrow">
                  <svg className="w-5 h-5" style={{ color: '#6F7480' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {formErrors.role && (
                  <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.role}</p>
                )}
              </div>

              {/* Doctor-specific fields - Only show when role is 'doctor' */}
              {formData.role === 'doctor' && (
                <>
                  {/* Specialization */}
                  <div className="floating-label-group">
                    <input
                      type="text"
                      name="specialization"
                      id="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder=" "
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none focus:shadow-md ${
                        formErrors.specialization 
                          ? 'border-[#EB5757] focus:border-[#EB5757]' 
                          : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                      }`}
                      style={{ borderRadius: '12px' }}
                    />
                    <label htmlFor="specialization" className={formData.specialization ? 'floating' : ''}>Specialization</label>
                    {formErrors.specialization && (
                      <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.specialization}</p>
                    )}
                  </div>

                  {/* Qualification */}
                  <div className="floating-label-group">
                    <input
                      type="text"
                      name="qualification"
                      id="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      placeholder=" "
                      className={`w-full px-4 py-3 rounded-xl border transition-all outline-none focus:shadow-md ${
                        formErrors.qualification 
                          ? 'border-[#EB5757] focus:border-[#EB5757]' 
                          : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                      }`}
                      style={{ borderRadius: '12px' }}
                    />
                    <label htmlFor="qualification" className={formData.qualification ? 'floating' : ''}>Qualification (MBBS, MD, BDS, etc.)</label>
                    {formErrors.qualification && (
                      <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.qualification}</p>
                    )}
                  </div>

                  {/* Consultation Fees */}
                  <div className="floating-label-group">
                    <input
                      type="number"
                      name="fees"
                      id="fees"
                      value={formData.fees}
                      onChange={handleChange}
                      placeholder=" "
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 rounded-xl border border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED] transition-all outline-none focus:shadow-md"
                      style={{ borderRadius: '12px' }}
                    />
                    <label htmlFor="fees" className={formData.fees ? 'floating' : ''}>Consultation Fees (₹)</label>
                  </div>

                  {/* Clinic / Hospital Address */}
                  <div className="floating-label-group">
                    <textarea
                      name="clinicAddress"
                      id="clinicAddress"
                      value={formData.clinicAddress}
                      onChange={handleChange}
                      placeholder=" "
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED] transition-all outline-none resize-none focus:shadow-md"
                      style={{ borderRadius: '12px', paddingTop: '20px', paddingBottom: '12px' }}
                    />
                    <label htmlFor="clinicAddress" className={formData.clinicAddress ? 'floating' : ''}>Clinic / Hospital Address</label>
                  </div>
                </>
              )}

              {/* Mobile Number - Always visible */}
              <div className="floating-label-group">
                <input
                  type="tel"
                  name="mobileNumber"
                  id="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder=" "
                  className={`w-full px-4 py-3 rounded-xl border transition-all outline-none focus:shadow-md ${
                    formErrors.mobileNumber 
                      ? 'border-[#EB5757] focus:border-[#EB5757]' 
                      : 'border-[#E6E9F0] hover:border-[#2F80ED] focus:border-[#2F80ED]'
                  }`}
                  style={{ borderRadius: '12px' }}
                />
                <label htmlFor="mobileNumber" className={formData.mobileNumber ? 'floating' : ''}>Mobile Number</label>
                {formErrors.mobileNumber && (
                  <p className="mt-1 text-xs" style={{ color: '#EB5757' }}>{formErrors.mobileNumber}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-[14px] font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: '#2F80ED',
                    borderRadius: '14px',
                  }}
                  onMouseEnter={(e) => !e.target.disabled && (e.target.style.background = '#1f6ed6')}
                  onMouseLeave={(e) => !e.target.disabled && (e.target.style.background = '#2F80ED')}
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full px-6 py-3 rounded-[14px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
                  style={{ 
                    background: '#F1F3F7',
                    color: '#4A4F58',
                    borderRadius: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div 
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-fade`}
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={handleCloseSuccessPopup}
        >
          <div 
            className={`bg-white rounded-[18px] w-[90%] sm:w-full max-w-[420px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] ${isSuccessClosing ? 'popup-hide' : 'popup-show'}`}
            style={{ backgroundColor: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseSuccessPopup}
              className="close-btn-rotate absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFD] transition-colors z-10"
              style={{ color: '#A0A6B1' }}
              aria-label="Close popup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Popup Content */}
            <div className="px-6 sm:px-8 py-8 sm:py-10 text-center">
              {/* Success Icon */}
              <div className="flex justify-center mb-4 sm:mb-5">
                <div 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: '#27AE60' }}
                >
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Success Message */}
              <h3 
                className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 px-2"
                style={{ color: '#1A1C20' }}
              >
                {successMessage}
              </h3>

              {/* Subtext */}
              <p 
                className="text-xs sm:text-sm md:text-base mb-6 sm:mb-8 px-2"
                style={{ color: '#6F7480' }}
              >
                User added to Tekisky Hospital + system.
              </p>

              {/* Okay Button */}
              <button
                onClick={handleCloseSuccessPopup}
                className="w-full px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
                style={{ 
                  background: '#2F80ED',
                  borderRadius: '12px',
                }}
                onMouseEnter={(e) => e.target.style.background = '#1f6ed6'}
                onMouseLeave={(e) => e.target.style.background = '#2F80ED'}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

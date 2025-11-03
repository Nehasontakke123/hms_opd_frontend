import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('users') // 'users' or 'patients'
  const [users, setUsers] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'doctor',
    specialization: '',
    fees: '',
    mobileNumber: ''
  })
  const [viewMode, setViewMode] = useState('table')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientDate, setPatientDate] = useState('')
  const [selectedMetric, setSelectedMetric] = useState(null) // 'total', 'doctors', 'receptionists', 'patients'

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser._id}`, formData)
        toast.success('User updated successfully')
      } else {
        await api.post('/admin/users', formData)
        toast.success('User created successfully')
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'doctor',
        specialization: '',
        fees: '',
        mobileNumber: ''
      })
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
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
      fees: user.fees || '',
      mobileNumber: user.mobileNumber || ''
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

      return (
        fullName.includes(term) ||
        doctorName.includes(term) ||
        mobile.includes(term) ||
        disease.includes(term)
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
    // Smooth scroll to data view
    setTimeout(() => {
      const dataSection = document.getElementById('metric-data-section')
      if (dataSection) {
        dataSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-blue-600">Tekisky</span>
              <span className="text-2xl sm:text-3xl font-semibold text-slate-800">Hospital</span>
            </div>
            <p className="mt-1 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 rounded-full">Admin Dashboard</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Manage staff, track patient registrations, and keep Tekisky Hospital running smoothly.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-100 text-slate-600">
              <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-sm font-semibold">
                {user?.fullName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-700">{user?.fullName}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap shadow-sm"
            >
              Logout
            </button>
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
                    {filteredData.map((item, index) => (
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
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide">{users.length} active</span>
                </h2>
                <p className="mt-2 text-sm text-slate-500">Onboard, edit, and manage Tekisky staff centrally.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search name, email, or role..."
                  className="w-full sm:w-72 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
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
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {['Name','Email','Role','Specialization','Fees','Mobile','Actions'].map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {users.map((u) => (
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
              {users.map((u) => (
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
                    placeholder="Search patient, doctor, or mobile"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                  {patientSearch && (
                    <button
                      onClick={() => setPatientSearch('')}
                      className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600"
                    >
                      ×
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
                                {['Token','Patient','Age','Mobile','Issue','Fees','Status'].map((heading) => (
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required={!editingUser}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="medical">Medical</option>
                </select>
              </div>
              
              {formData.role === 'doctor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consultation Fees (₹)
                    </label>
                    <input
                      type="number"
                      name="fees"
                      value={formData.fees}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="500"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingUser(null)
                    setFormData({
                      fullName: '',
                      email: '',
                      password: '',
                      role: 'doctor',
                      specialization: '',
                      fees: '',
                      mobileNumber: ''
                    })
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

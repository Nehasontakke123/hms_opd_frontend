import { useState, useEffect } from 'react'
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

  // Group patients by date and doctor
  const groupPatientsByDateAndDoctor = () => {
    const grouped = {}
    
    patients.forEach(patient => {
      const date = new Date(patient.registrationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
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

  const groupedPatients = groupPatientsByDateAndDoctor()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tekisky Hospital</h1>
            <p className="text-xs sm:text-sm text-gray-600">Admin Dashboard</p>
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h2>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"
              >
                + Add User
              </button>
            </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 text-sm font-medium text-gray-900">
                        {u.fullName}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                        {u.email}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.role === 'doctor' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500">
                        {u.specialization || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500">
                        {u.role === 'doctor' ? (u.fees ? `₹${u.fees}` : '-') : '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-500">
                        {u.mobileNumber || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm font-medium">
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {users.map((u) => (
                <div key={u._id} className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{u.fullName}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      u.role === 'doctor' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{u.email}</p>
                  <p className="text-sm text-gray-600 mb-1">Specialization: {u.specialization || '-'}</p>
                  {u.role === 'doctor' && <p className="text-sm text-gray-600 mb-1">Fees: {u.fees ? `₹${u.fees}` : '-'}</p>}
                  <p className="text-sm text-gray-600 mb-3">Mobile: {u.mobileNumber || '-'}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">All Patients</h2>
              <div className="text-sm text-gray-600">
                Total: <span className="font-semibold">{patients.length}</span> patients
              </div>
            </div>

            {patients.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">No patients registered yet</p>
              </div>
            ) : (
              Object.keys(groupedPatients).map((date) => (
                <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h3 className="text-lg font-bold text-gray-800">{date}</h3>
                  </div>

                                     {Object.keys(groupedPatients[date]).map((doctorName) => {
                     const doctorPatients = groupedPatients[date][doctorName]
                     const totalCollected = doctorPatients.reduce((sum, patient) => {
                       const fees = patient.fees || patient.doctor?.fees || 0
                       return sum + fees
                     }, 0)
                     
                     return (
                       <div key={doctorName} className="border-b border-gray-200 last:border-b-0">
                         <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                           <div>
                             <h4 className="font-semibold text-gray-700">
                               Dr. {doctorName}
                             </h4>
                             <p className="text-sm text-gray-500">
                               {doctorPatients.length} patient(s)
                             </p>
                           </div>
                           <div className="text-right">
                             <p className="text-sm font-semibold text-gray-700">Total Collected:</p>
                             <p className="text-lg font-bold text-green-600">₹{totalCollected}</p>
                           </div>
                         </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                                                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fees</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupedPatients[date][doctorName].map((patient) => (
                              <tr key={patient._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold">
                                    {patient.tokenNumber}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {patient.fullName}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {patient.age}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {patient.mobileNumber}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {patient.disease}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                                  ₹{patient.fees || patient.doctor?.fees || 0}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    patient.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : patient.status === 'in-progress'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {patient.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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

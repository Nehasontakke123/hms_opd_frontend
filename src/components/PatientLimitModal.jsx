import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const PatientLimitModal = ({ doctor, isOpen, onClose, onUpdate }) => {
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (isOpen && doctor) {
      fetchDoctorStats()
    }
  }, [isOpen, doctor])

  const fetchDoctorStats = async () => {
    try {
      const response = await api.get(`/doctor/${doctor._id}/stats`)
      setStats(response.data.data)
      setLimit(response.data.data.dailyPatientLimit)
    } catch (error) {
      toast.error('Failed to fetch doctor stats')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (limit < 1 || limit > 100) {
      toast.error('Limit must be between 1 and 100')
      return
    }

    setLoading(true)
    try {
      const response = await api.put(`/doctor/${doctor._id}/patient-limit`, {
        dailyPatientLimit: limit
      })
      
      toast.success(response.data.message)
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update limit')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Set Daily Patient Limit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {stats && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">{stats.fullName}</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>Specialization: {stats.specialization || 'N/A'}</p>
              <p className="font-semibold">
                Today: {stats.todayPatientCount} / {stats.dailyPatientLimit} patients
              </p>
              <p>Remaining slots: {stats.remainingSlots}</p>
              {stats.isLimitReached && (
                <p className="text-red-600 font-semibold">⚠️ Daily limit reached!</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Patient Limit (1-100)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Set how many patients this doctor can see per day
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : 'Save Limit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PatientLimitModal


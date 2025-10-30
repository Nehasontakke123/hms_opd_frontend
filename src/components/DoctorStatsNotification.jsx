import { useState, useEffect } from 'react'
import api from '../utils/api'

const DoctorStatsNotification = ({ doctorId, show, onClose }) => {
  const [stats, setStats] = useState(null)
  

  useEffect(() => {
    if (show && doctorId) {
      fetchStats()
    }
  }, [show, doctorId])

  const fetchStats = async () => {
    try {
      const response = await api.get(`/doctor/${doctorId}/stats`)
      setStats(response.data.data)
      
      // Auto close after 5 seconds
      setTimeout(() => {
        onClose()
      }, 5000)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  if (!show || !stats) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm border-l-4 border-blue-500">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Today's Patient Info</h3>
              <p className="text-sm text-gray-600">{stats.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Daily Limit:</span>
            <span className="font-bold text-lg text-blue-600">{stats.dailyPatientLimit}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Patients Today:</span>
            <span className="font-bold text-lg text-gray-800">{stats.todayPatientCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Remaining Slots:</span>
            <span className={`font-bold text-lg ${stats.remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.remainingSlots}
            </span>
          </div>
        </div>

        {stats.isLimitReached && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ Daily patient limit reached!
            </p>
          </div>
        )}

        {!stats.isLimitReached && stats.remainingSlots <= 5 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold">
              ⚡ Only {stats.remainingSlots} slots remaining
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DoctorStatsNotification





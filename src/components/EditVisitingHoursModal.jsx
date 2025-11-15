import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const EditVisitingHoursModal = ({ doctor, isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [visitingHours, setVisitingHours] = useState({
    morning: { enabled: false, start: '09:00', end: '12:00' },
    afternoon: { enabled: false, start: '13:00', end: '16:00' },
    evening: { enabled: false, start: '18:00', end: '21:00' }
  })
  const [weeklySchedule, setWeeklySchedule] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: false
  })

  useEffect(() => {
    if (isOpen && doctor) {
      // Load current visiting hours
      if (doctor.visitingHours) {
        setVisitingHours({
          morning: {
            enabled: doctor.visitingHours.morning?.enabled || false,
            start: doctor.visitingHours.morning?.start || '09:00',
            end: doctor.visitingHours.morning?.end || '12:00'
          },
          afternoon: {
            enabled: doctor.visitingHours.afternoon?.enabled || false,
            start: doctor.visitingHours.afternoon?.start || '13:00',
            end: doctor.visitingHours.afternoon?.end || '16:00'
          },
          evening: {
            enabled: doctor.visitingHours.evening?.enabled || false,
            start: doctor.visitingHours.evening?.start || '18:00',
            end: doctor.visitingHours.evening?.end || '21:00'
          }
        })
      }

      // Load current weekly schedule
      if (doctor.weeklySchedule) {
        setWeeklySchedule({
          monday: doctor.weeklySchedule.monday !== false,
          tuesday: doctor.weeklySchedule.tuesday !== false,
          wednesday: doctor.weeklySchedule.wednesday !== false,
          thursday: doctor.weeklySchedule.thursday !== false,
          friday: doctor.weeklySchedule.friday !== false,
          saturday: doctor.weeklySchedule.saturday !== false,
          sunday: doctor.weeklySchedule.sunday === true
        })
      }
    }
  }, [isOpen, doctor])

  const handleVisitingHoursChange = (period, field, value) => {
    setVisitingHours(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [field]: value
      }
    }))
  }

  const handleWeeklyScheduleChange = (day, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const response = await api.put(`/doctor/${doctor._id}/schedule`, {
        visitingHours,
        weeklySchedule
      })
      
      toast.success('Schedule updated successfully!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update schedule')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Visiting Hours & Schedule</h2>
            <p className="text-sm text-gray-600 mt-1">Dr. {doctor?.fullName || 'Doctor'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weekly Schedule Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Available Days</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(dayLabels).map(([day, label]) => (
                <label
                  key={day}
                  className="flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50"
                  style={{
                    borderColor: weeklySchedule[day] ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: weeklySchedule[day] ? '#eff6ff' : '#ffffff'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={weeklySchedule[day]}
                    onChange={(e) => handleWeeklyScheduleChange(day, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visiting Hours Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Visiting Hours</h3>
            <div className="space-y-4">
              {/* Morning */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visitingHours.morning.enabled}
                      onChange={(e) => handleVisitingHoursChange('morning', 'enabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-semibold text-gray-700">☀️ Morning</span>
                  </label>
                </div>
                {visitingHours.morning.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={visitingHours.morning.start}
                        onChange={(e) => handleVisitingHoursChange('morning', 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={visitingHours.morning.end}
                        onChange={(e) => handleVisitingHoursChange('morning', 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Afternoon */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visitingHours.afternoon.enabled}
                      onChange={(e) => handleVisitingHoursChange('afternoon', 'enabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-semibold text-gray-700">🌤️ Afternoon</span>
                  </label>
                </div>
                {visitingHours.afternoon.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={visitingHours.afternoon.start}
                        onChange={(e) => handleVisitingHoursChange('afternoon', 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={visitingHours.afternoon.end}
                        onChange={(e) => handleVisitingHoursChange('afternoon', 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Evening */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visitingHours.evening.enabled}
                      onChange={(e) => handleVisitingHoursChange('evening', 'enabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-base font-semibold text-gray-700">🌙 Evening</span>
                  </label>
                </div>
                {visitingHours.evening.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={visitingHours.evening.start}
                        onChange={(e) => handleVisitingHoursChange('evening', 'start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={visitingHours.evening.end}
                        onChange={(e) => handleVisitingHoursChange('evening', 'end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditVisitingHoursModal





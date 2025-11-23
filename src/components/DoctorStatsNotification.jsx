import { useState, useEffect } from 'react'
import api from '../utils/api'

const DoctorStatsNotification = ({ doctorId, show, onClose }) => {
  const [stats, setStats] = useState(null)
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
      setIsExiting(false)
    }, 350)
  }

  const fetchStats = async () => {
    try {
      const response = await api.get(`/doctor/${doctorId}/stats`)
      setStats(response.data.data)
      
      // Auto close after 8 seconds
      setTimeout(() => {
        handleClose()
      }, 8000)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    if (show && doctorId) {
      setIsExiting(false)
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, doctorId])

  if (!show || !stats) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`doctor-stats-backdrop ${isExiting ? 'backdrop-exiting' : 'backdrop-entering'}`}
        onClick={handleClose}
      />

      {/* Toaster Notification */}
      <div className={`doctor-stats-toaster ${isExiting ? 'toaster-exiting' : 'toaster-entering'}`}>
        <div className="toaster-container">
          {/* Header */}
          <div className="toaster-header">
            <div className="toaster-header-content">
              <h3 className="toaster-title">Today's Patient Info</h3>
              <p className="toaster-doctor-name">{stats.fullName || 'monu'}</p>
            </div>
            <button
              onClick={handleClose}
              className="toaster-close-btn"
              aria-label="Close"
            >
              <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info List */}
          <div className="toaster-info-card">
            <div className="info-row">
              <span className="info-label">Daily Limit:</span>
              <span className="info-value info-value-blue">{stats.dailyPatientLimit}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Patients Today:</span>
              <span className="info-value info-value-black">{stats.todayPatientCount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Remaining Slots:</span>
              <span className="info-value info-value-green">{stats.remainingSlots}</span>
            </div>
          </div>

          {/* Warning Messages */}
          {stats.isLimitReached && (
            <div className="toaster-warning toaster-warning-red">
              <p className="warning-text">⚠️ Daily patient limit reached!</p>
            </div>
          )}

          {!stats.isLimitReached && stats.remainingSlots <= 5 && (
            <div className="toaster-warning toaster-warning-yellow">
              <p className="warning-text">⚡ Only {stats.remainingSlots} slots remaining</p>
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* Backdrop */
        .doctor-stats-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 998;
          pointer-events: auto;
        }

        .backdrop-entering {
          animation: backdropFadeIn 0.3s ease-out forwards;
        }

        .backdrop-exiting {
          animation: backdropFadeOut 0.35s ease-in forwards;
        }

        /* Toaster Container */
        .doctor-stats-toaster {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
          display: flex;
          justify-content: center;
          padding-top: 2rem;
          padding-left: 1rem;
          padding-right: 1rem;
          pointer-events: none;
          align-items: flex-start;
        }

        .toaster-container {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 28px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          padding: 1.5rem;
          pointer-events: auto;
          position: relative;
        }

        /* Enter Animation */
        .toaster-entering .toaster-container {
          animation: toasterSlideDown 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* Exit Animation */
        .toaster-exiting .toaster-container {
          animation: toasterSlideUp 0.35s ease-in forwards;
        }

        /* Header */
        .toaster-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }

        .toaster-header-content {
          flex: 1;
        }

        .toaster-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.25rem;
          letter-spacing: -0.01em;
        }

        .toaster-doctor-name {
          font-size: 0.875rem;
          color: #6B7280;
          font-weight: 500;
        }

        /* Close Button */
        .toaster-close-btn {
          width: 2rem;
          height: 2rem;
          min-width: 2rem;
          min-height: 2rem;
          border-radius: 50%;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: 1rem;
          flex-shrink: 0;
        }

        .toaster-close-btn:hover {
          background: #F3F4F6;
          border-color: #D1D5DB;
          color: #374151;
          transform: scale(1.05);
        }

        .toaster-close-btn:active {
          transform: scale(0.95);
        }

        .close-icon {
          width: 0.875rem;
          height: 0.875rem;
          display: block;
        }

        /* Info Card */
        .toaster-info-card {
          background: linear-gradient(to right, #EFF6FF, #EEF2FF);
          border-radius: 16px;
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .info-label {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #4B5563;
          text-align: left;
        }

        .info-value {
          font-size: 1.125rem;
          font-weight: 700;
          text-align: right;
        }

        .info-value-blue {
          color: #2563EB;
        }

        .info-value-black {
          color: #111827;
        }

        .info-value-green {
          color: #16A34A;
        }

        /* Warning Messages */
        .toaster-warning {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          animation: warningFadeIn 0.3s ease-out 0.2s forwards;
          opacity: 0;
        }

        .toaster-warning-red {
          background: #FEF2F2;
          border: 1px solid #FECACA;
        }

        .toaster-warning-yellow {
          background: #FEFCE8;
          border: 1px solid #FDE68A;
        }

        .warning-text {
          font-size: 0.8125rem;
          font-weight: 600;
          text-align: center;
        }

        .toaster-warning-red .warning-text {
          color: #991B1B;
        }

        .toaster-warning-yellow .warning-text {
          color: #854D0E;
        }

        /* Keyframe Animations */
        @keyframes backdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes backdropFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes toasterSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-120%) scale(0.95);
            filter: blur(4px);
          }
          50% {
            transform: translateY(0) scale(1.05);
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          }
        }

        @keyframes toasterSlideUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-120%) scale(0.95);
            filter: blur(4px);
          }
        }

        @keyframes warningFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Design */
        @media (max-width: 640px) {
          .doctor-stats-toaster {
            padding-top: 1.75rem;
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }

          .toaster-container {
            max-width: 100%;
            border-radius: 24px;
            padding: 1.25rem;
          }

          .toaster-title {
            font-size: 1rem;
          }

          .toaster-doctor-name {
            font-size: 0.8125rem;
          }

          .toaster-close-btn {
            width: 2.25rem;
            height: 2.25rem;
            min-width: 2.25rem;
            min-height: 2.25rem;
          }

          .close-icon {
            width: 1rem;
            height: 1rem;
          }

          .toaster-info-card {
            padding: 1rem 0.875rem;
            gap: 0.75rem;
          }

          .info-label {
            font-size: 0.875rem;
          }

          .info-value {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .doctor-stats-toaster {
            padding-top: 1.5rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }

          .toaster-container {
            padding: 1rem;
            border-radius: 20px;
          }

          .toaster-header {
            margin-bottom: 1rem;
          }

          .toaster-title {
            font-size: 0.9375rem;
          }

          .toaster-doctor-name {
            font-size: 0.75rem;
          }

          .toaster-info-card {
            padding: 0.875rem 0.75rem;
            gap: 0.625rem;
          }

          .info-label {
            font-size: 0.8125rem;
          }

          .info-value {
            font-size: 0.9375rem;
          }

          .toaster-close-btn {
            width: 2rem;
            height: 2rem;
            min-width: 2rem;
            min-height: 2rem;
            margin-left: 0.75rem;
          }

          .close-icon {
            width: 0.875rem;
            height: 0.875rem;
          }
        }

        /* Safe area insets for mobile devices */
        @supports (padding: max(0px)) {
          .doctor-stats-toaster {
            padding-top: max(1.75rem, env(safe-area-inset-top));
          }
        }
      `}</style>
    </>
  )
}

export default DoctorStatsNotification

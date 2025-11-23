import { useEffect, useState } from 'react'

const PatientRegistrationSuccessPopup = ({ tokenData, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Handle ESC key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      if (onClose) onClose()
    }, 300)
  }

  if (!isVisible || !tokenData) return null

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '—', time: '—' }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return { date: '—', time: '—' }
    
    const dateLabel = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    
    const timeLabel = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return { date: dateLabel, time: timeLabel }
  }

  const { date, time } = formatDateTime(tokenData.registrationDate)

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`patient-success-backdrop ${isClosing ? 'backdrop-closing' : 'backdrop-opening'}`}
        onClick={handleClose}
      />

      {/* Popup Card */}
      <div className={`patient-success-container ${isClosing ? 'popup-closing' : 'popup-opening'}`}>
        <div className="patient-success-card">
          {/* Success Icon - Floating Effect */}
          <div className="success-icon-wrapper">
            <div className="success-icon-circle">
              <svg className="success-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Close Button - Top Right */}
          <button
            onClick={handleClose}
            className="patient-success-close-btn"
            aria-label="Close"
          >
            <svg className="close-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="popup-header">
            <h2 className="popup-header-title">Patient Registered!</h2>
            <p className="popup-header-subtitle">Token Number Generated</p>
          </div>

          {/* Token Number Card */}
          <div className="token-card">
            <p className="token-label">Token Number</p>
            <p className="token-number">{tokenData.tokenNumber}</p>
          </div>

          {/* Patient Details */}
          <div className="patient-details">
            <div className="detail-row">
              <span className="detail-label">Patient:</span>
              <span className="detail-value">{tokenData.fullName || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Doctor:</span>
              <span className="detail-value">{tokenData.doctor?.fullName || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Visit:</span>
              <span className="detail-value">{date} • {time}</span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="patient-success-primary-btn"
          >
            Close
          </button>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        /* Backdrop */
        .patient-success-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 50;
        }

        .backdrop-opening {
          animation: backdropFadeIn 0.3s ease-out forwards;
        }

        .backdrop-closing {
          animation: backdropFadeOut 0.3s ease-in forwards;
        }

        /* Popup Container */
        .patient-success-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          pointer-events: none;
          margin: 0;
        }

        .popup-opening {
          animation: popupFadeSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .popup-closing {
          animation: popupFadeSlideDown 0.3s ease-in forwards;
        }

        /* Popup Card - Premium */
        .patient-success-card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 28px;
          padding: 2.5rem 1.75rem 1.75rem;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
          max-width: 420px;
          min-width: 340px;
          width: 100%;
          text-align: center;
          position: relative;
          pointer-events: auto;
          margin: 0;
          animation: popupScaleUp 0.3s ease-out 0.2s forwards;
          transform: scale(0.96);
          overflow: visible;
        }

        /* Close Button - Premium Alignment */
        .patient-success-close-btn {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          width: 2rem;
          height: 2rem;
          min-width: 2rem;
          min-height: 2rem;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4B5563;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 20;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
          box-shadow: none;
        }

        .close-icon-svg {
          width: 1rem;
          height: 1rem;
          display: block;
          margin: 0;
          padding: 0;
          flex-shrink: 0;
          pointer-events: none;
        }

        .patient-success-close-btn:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
          color: #1F2937;
          transform: scale(1.05);
        }

        .patient-success-close-btn:active {
          transform: scale(0.95);
        }

        /* Success Icon - Premium Floating */
        .success-icon-wrapper {
          position: absolute;
          top: -1.25rem;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          z-index: 15;
          margin-bottom: 0;
        }

        .success-icon-circle {
          position: relative;
          width: 5rem;
          height: 5rem;
          background: #1FAD62;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(31, 173, 98, 0.3);
          animation: iconPopIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.15s forwards, iconPulse 1s ease-in-out 0.7s;
          transform: scale(0);
          border: 4px solid #FFFFFF;
        }

        .success-checkmark {
          width: 2.25rem;
          height: 2.25rem;
          color: #FFFFFF;
        }

        /* Header - Premium Spacing */
        .popup-header {
          margin-top: 2rem;
          margin-bottom: 1.5rem;
          padding: 0 0.5rem;
          animation: contentFadeIn 0.3s ease-out 0.4s forwards;
          opacity: 0;
        }

        .popup-header-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: #1A1A1A;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }

        .popup-header-subtitle {
          font-size: 0.875rem;
          color: #6B7280;
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        /* Token Card - Compact */
        .token-card {
          background: #E9F8F1;
          border-radius: 12px;
          padding: 1.25rem 1rem;
          margin-bottom: 1.25rem;
          animation: contentFadeIn 0.3s ease-out 0.5s forwards;
          opacity: 0;
        }

        .token-label {
          font-size: 0.75rem;
          color: #6B7280;
          font-weight: 600;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .token-number {
          font-size: 3rem;
          font-weight: 700;
          color: #0E9F6E;
          line-height: 1;
        }

        /* Patient Details - Compact */
        .patient-details {
          text-align: left;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #F7F7F7;
          border-radius: 10px;
          animation: contentFadeIn 0.3s ease-out 0.6s forwards;
          opacity: 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1A1A1A;
          min-width: 70px;
        }

        .detail-value {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #4B5563;
          text-align: right;
          flex: 1;
        }

        /* Primary Button - Compact */
        .patient-success-primary-btn {
          width: 100%;
          padding: 0.75rem 1.25rem;
          background: #0E9F6E;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: contentFadeIn 0.3s ease-out 0.7s forwards;
          opacity: 0;
          box-shadow: 0 2px 8px rgba(14, 159, 110, 0.25);
        }

        .patient-success-primary-btn:hover {
          background: #0D8E5F;
          box-shadow: 0 4px 12px rgba(14, 159, 110, 0.35);
          transform: translateY(-1px);
        }

        .patient-success-primary-btn:active {
          transform: translateY(0);
        }

        /* Keyframe Animations */
        @keyframes backdropFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes backdropFadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes popupFadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes popupFadeSlideDown {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(14px);
          }
        }

        @keyframes popupScaleUp {
          0% {
            transform: scale(0.96);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes iconPopIn {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes contentFadeIn {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Design */
        @media (max-width: 640px) {
          .patient-success-card {
            padding: 2.25rem 1.25rem 1.5rem;
            max-width: 90%;
            min-width: unset;
            border-radius: 24px;
          }

          .success-icon-wrapper {
            top: -1rem;
          }

          .success-icon-circle {
            width: 4.5rem;
            height: 4.5rem;
            border-width: 3px;
          }

          .success-checkmark {
            width: 2rem;
            height: 2rem;
          }

          .popup-header {
            margin-top: 1.75rem;
          }

          .popup-header-title {
            font-size: 1.25rem;
          }

          .popup-header-subtitle {
            font-size: 0.8125rem;
          }

          .token-number {
            font-size: 2.5rem;
          }

          .token-card {
            padding: 1rem 0.875rem;
          }

          .patient-details {
            padding: 0.875rem;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
            margin-bottom: 0.625rem;
          }

          .detail-value {
            text-align: left;
          }

          .patient-success-close-btn {
            top: 1rem;
            right: 1rem;
            width: 1.875rem;
            height: 1.875rem;
            min-width: 1.875rem;
            min-height: 1.875rem;
          }

          .close-icon-svg {
            width: 0.9375rem;
            height: 0.9375rem;
          }
        }

        @media (max-width: 480px) {
          .patient-success-card {
            padding: 2rem 1rem 1.375rem;
            border-radius: 20px;
          }

          .success-icon-wrapper {
            top: -0.875rem;
          }

          .success-icon-circle {
            width: 4rem;
            height: 4rem;
          }

          .success-checkmark {
            width: 1.75rem;
            height: 1.75rem;
          }

          .popup-header {
            margin-top: 1.5rem;
          }

          .token-number {
            font-size: 2.25rem;
          }

          .popup-header-title {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </>
  )
}

export default PatientRegistrationSuccessPopup

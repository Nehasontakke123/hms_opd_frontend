import { useEffect, useState } from 'react'

const PatientRegistrationSuccessPopup = ({ tokenData, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [showCenteredToast, setShowCenteredToast] = useState(false)

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
      // Show centered toast when popup closes
      setShowCenteredToast(true)
      if (onClose) onClose()
    }, 400)
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
      {/* Centered Success Toast */}
      {showCenteredToast && (
        <CenteredSuccessToast 
          message="Patient registered successfully! Cash payment received."
          onClose={() => setShowCenteredToast(false)}
        />
      )}

      {/* No backdrop - removed gradient background */}

      {/* Popup Container */}
      <div className={`patient-success-container ${isClosing ? 'popup-closing' : 'popup-opening'}`}>
        <div 
          className="patient-success-card"
          style={{
            '--success-green': '#10B981',
            '--success-green-dark': '#059669',
            '--success-green-light': '#D1FAE5',
            '--success-green-glow': 'rgba(16, 185, 129, 0.4)',
            '--border-glow': 'rgba(16, 185, 129, 0.6)'
          }}
        >
          {/* Animated Border - 360° Border Run Effect */}
          <div className="animated-border-ring"></div>

          {/* Success Icon - Floating Above Card */}
          <div className="success-icon-wrapper">
            <div className="success-icon-glow"></div>
            <div className="success-icon-circle">
              <svg className="success-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Close Button - Top Right */}
          <button
            onClick={handleClose}
            className="patient-success-close-btn"
            aria-label="Close"
            type="button"
          >
            <div className="close-btn-border"></div>
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
            <div className="primary-btn-border"></div>
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        /* CSS Variables */
        :root {
          --success-green: #10B981;
          --success-green-dark: #059669;
          --success-green-light: #D1FAE5;
          --success-green-glow: rgba(16, 185, 129, 0.4);
          --border-glow: rgba(16, 185, 129, 0.6);
        }

        /* Backdrop removed - no background blur */


        /* Popup Container */
        .patient-success-container {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          pointer-events: none;
        }

        .popup-opening {
          animation: containerFadeIn 0.4s ease-out forwards;
        }

        .popup-closing {
          animation: containerFadeOut 0.4s ease-in forwards;
        }

        /* Popup Card - Glass Morphism */
        .patient-success-card {
          background: transparent;
          border-radius: 28px;
          padding: 2.5rem 2rem 2rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15),
                      0 0 40px var(--success-green-glow);
          max-width: 450px;
          width: 100%;
          text-align: center;
          position: relative;
          pointer-events: auto;
          animation: popupScaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform: scale(0.92) translateY(20px);
          opacity: 0;
          overflow: visible;
          z-index: 1;
        }

        .patient-success-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8),
                      0 0 0 1px rgba(255, 255, 255, 0.6);
          z-index: -1;
        }

        /* Animated Border Ring - 360° Border Run Effect */
        .animated-border-ring {
          position: absolute;
          inset: -4px;
          border-radius: 32px;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .animated-border-ring::before {
          content: '';
          position: absolute;
          width: calc(100% + 8px);
          height: calc(100% + 8px);
          top: -4px;
          left: -4px;
          background: conic-gradient(
            from 0deg,
            transparent 45deg,
            var(--border-glow) 75deg,
            var(--border-glow) 105deg,
            transparent 135deg,
            transparent 225deg,
            transparent 315deg,
            transparent 360deg
          );
          animation: borderSpin 3s linear infinite;
          filter: drop-shadow(0 0 8px var(--success-green-glow));
        }

        .animated-border-ring::after {
          content: '';
          position: absolute;
          inset: 4px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
        }

        @keyframes borderSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Success Icon - Floating Above */
        .success-icon-wrapper {
          position: absolute;
          top: -2rem;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          z-index: 10;
        }

        .success-icon-glow {
          position: absolute;
          inset: -12px;
          background: radial-gradient(circle, var(--success-green-glow) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(16px);
          animation: iconGlow 2.5s ease-in-out infinite;
          pointer-events: none;
        }

        .success-icon-circle {
          position: relative;
          width: 5rem;
          height: 5rem;
          background: linear-gradient(135deg, var(--success-green) 0%, var(--success-green-dark) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px var(--success-green-glow),
                      0 0 0 4px rgba(255, 255, 255, 0.1);
          animation: iconPopBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s forwards;
          transform: scale(0);
          z-index: 1;
          border: 4px solid #FFFFFF;
        }

        .success-checkmark {
          width: 2.25rem;
          height: 2.25rem;
          color: white;
          stroke-width: 3.5;
        }

        /* Close Button - Top Right */
        .patient-success-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s ease;
          color: #64748b;
          overflow: hidden;
        }

        .close-btn-border {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 60deg,
            var(--border-glow) 90deg,
            var(--border-glow) 120deg,
            transparent 150deg,
            transparent 240deg,
            transparent 330deg,
            transparent 360deg
          );
          animation: borderSpin 2s linear infinite;
          z-index: -1;
        }

        .close-icon-svg {
          width: 18px;
          height: 18px;
          stroke-width: 2.5;
          position: relative;
          z-index: 1;
        }

        .patient-success-close-btn:hover {
          background: rgba(255, 255, 255, 1);
          color: var(--success-green);
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .patient-success-close-btn:active {
          transform: scale(0.95);
        }

        /* Header */
        .popup-header {
          margin-top: 2rem;
          margin-bottom: 1.5rem;
          padding: 0 0.5rem;
          animation: contentFadeIn 0.5s ease-out 0.5s forwards;
          opacity: 0;
          position: relative;
          z-index: 1;
        }

        .popup-header-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1A1A1A;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }

        .popup-header-subtitle {
          font-size: 0.9375rem;
          color: #6B7280;
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        /* Token Card */
        .token-card {
          background: var(--success-green-light);
          border-radius: 16px;
          padding: 1.5rem 1.25rem;
          margin-bottom: 1.5rem;
          animation: contentFadeIn 0.5s ease-out 0.6s forwards;
          opacity: 0;
          position: relative;
          z-index: 1;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .token-label {
          font-size: 0.75rem;
          color: #6B7280;
          font-weight: 600;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .token-number {
          font-size: 3.5rem;
          font-weight: 700;
          color: var(--success-green-dark);
          line-height: 1;
          letter-spacing: -0.02em;
        }

        /* Patient Details */
        .patient-details {
          text-align: left;
          margin-bottom: 1.75rem;
          padding: 1.25rem;
          background: #F9FAFB;
          border-radius: 12px;
          animation: contentFadeIn 0.5s ease-out 0.7s forwards;
          opacity: 0;
          position: relative;
          z-index: 1;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1A1A1A;
          min-width: 70px;
        }

        .detail-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: #4B5563;
          text-align: right;
          flex: 1;
        }

        /* Primary Button with Animated Border */
        .patient-success-primary-btn {
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: var(--success-green);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: contentFadeIn 0.5s ease-out 0.8s forwards;
          opacity: 0;
          box-shadow: 0 4px 12px rgba(14, 159, 110, 0.3);
          position: relative;
          z-index: 1;
          overflow: hidden;
        }

        .primary-btn-border {
          position: absolute;
          inset: -2px;
          border-radius: 12px;
          background: conic-gradient(
            from 0deg,
            transparent 50deg,
            rgba(255, 255, 255, 0.4) 80deg,
            rgba(255, 255, 255, 0.4) 100deg,
            transparent 130deg,
            transparent 230deg,
            transparent 330deg,
            transparent 360deg
          );
          animation: borderSpin 2s linear infinite;
          z-index: -1;
        }

        .patient-success-primary-btn span {
          position: relative;
          z-index: 1;
        }

        .patient-success-primary-btn:hover {
          background: var(--success-green-dark);
          box-shadow: 0 6px 16px rgba(14, 159, 110, 0.4);
          transform: translateY(-1px);
        }

        .patient-success-primary-btn:active {
          transform: translateY(0);
        }

        /* Keyframe Animations */

        @keyframes containerFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes containerFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes popupScaleIn {
          0% {
            transform: scale(0.92) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes iconPopBounce {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes iconGlow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.15);
          }
        }

        @keyframes contentFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .patient-success-card {
            padding: 2.25rem 1.75rem 1.75rem;
            max-width: 90%;
            border-radius: 24px;
          }

          .patient-success-card::before {
            border-radius: 24px;
          }

          .animated-border-ring {
            border-radius: 28px;
          }

          .animated-border-ring::after {
            border-radius: 24px;
          }

          .success-icon-wrapper {
            top: -1.75rem;
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
            font-size: 1.375rem;
          }

          .popup-header-subtitle {
            font-size: 0.875rem;
          }

          .token-number {
            font-size: 3rem;
          }

          .token-card {
            padding: 1.25rem 1rem;
          }

          .patient-details {
            padding: 1rem;
          }

          .patient-success-close-btn {
            width: 32px;
            height: 32px;
            top: 0.75rem;
            right: 0.75rem;
          }

          .close-icon-svg {
            width: 16px;
            height: 16px;
          }
        }

        @media (max-width: 480px) {
          .patient-success-card {
            padding: 2rem 1.5rem 1.5rem;
            border-radius: 20px;
          }

          .patient-success-card::before {
            border-radius: 20px;
          }

          .animated-border-ring {
            border-radius: 24px;
          }

          .animated-border-ring::after {
            border-radius: 20px;
          }

          .success-icon-wrapper {
            top: -1.5rem;
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
            width: 30px;
            height: 30px;
            top: 0.5rem;
            right: 0.5rem;
          }

          .close-icon-svg {
            width: 14px;
            height: 14px;
          }

          .patient-success-primary-btn {
            padding: 0.75rem 1.25rem;
            font-size: 0.9375rem;
          }
        }

        @media (max-width: 360px) {
          .patient-success-card {
            padding: 1.75rem 1.25rem 1.25rem;
            border-radius: 18px;
          }

          .patient-success-card::before {
            border-radius: 18px;
          }

          .animated-border-ring {
            border-radius: 22px;
          }

          .animated-border-ring::after {
            border-radius: 18px;
          }

          .success-icon-circle {
            width: 3.5rem;
            height: 3.5rem;
          }

          .success-checkmark {
            width: 1.5rem;
            height: 1.5rem;
          }

          .popup-header-title {
            font-size: 1.125rem;
          }

          .token-number {
            font-size: 2.25rem;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .popup-opening,
          .popup-closing,
          .patient-success-card,
          .success-icon-circle,
          .success-icon-glow,
          .popup-header,
          .token-card,
          .patient-details,
          .patient-success-primary-btn,
          .animated-border-ring::before,
          .close-btn-border,
          .primary-btn-border {
            animation: none;
          }

          .patient-success-card {
            transform: scale(1) translateY(0);
            opacity: 1;
          }

          .popup-header,
          .token-card,
          .patient-details,
          .patient-success-primary-btn {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

// Centered Success Toast Component
const CenteredSuccessToast = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      setIsClosing(true)
      setTimeout(() => {
        setIsVisible(false)
        if (onClose) onClose()
      }, 300)
    }, 2500)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  return (
    <>
      <div className={`centered-toast-container ${isClosing ? 'toast-closing' : 'toast-opening'}`}>
        <div className="centered-toast">
          <div className="toast-icon-wrapper">
            <svg className="toast-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="toast-message">{message}</p>
        </div>
      </div>

      <style>{`
        .centered-toast-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          pointer-events: none;
        }

        .toast-opening {
          animation: toastFadeSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .toast-closing {
          animation: toastFadeSlideDown 0.3s ease-in forwards;
        }

        .centered-toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15),
                      0 0 0 1px rgba(255, 255, 255, 0.8),
                      0 0 20px rgba(16, 185, 129, 0.2);
          min-width: 300px;
          max-width: 90vw;
          pointer-events: auto;
        }

        .toast-icon-wrapper {
          flex-shrink: 0;
          width: 2rem;
          height: 2rem;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .toast-checkmark {
          width: 1.125rem;
          height: 1.125rem;
          color: white;
          stroke-width: 3;
        }

        .toast-message {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1A1A1A;
          margin: 0;
          line-height: 1.5;
        }

        @keyframes toastFadeSlideUp {
          0% {
            opacity: 0;
            transform: translate(-50%, -40%) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes toastFadeSlideDown {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -60%) scale(0.9);
          }
        }

        @media (max-width: 640px) {
          .centered-toast {
            padding: 0.875rem 1.25rem;
            min-width: 280px;
          }

          .toast-icon-wrapper {
            width: 1.75rem;
            height: 1.75rem;
          }

          .toast-checkmark {
            width: 1rem;
            height: 1rem;
          }

          .toast-message {
            font-size: 0.875rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .toast-opening,
          .toast-closing {
            animation: none;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  )
}

export default PatientRegistrationSuccessPopup

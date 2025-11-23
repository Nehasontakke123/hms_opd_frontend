import { useState, useEffect } from 'react'

const EmergencyRegistrationSuccessToast = ({ show, onClose, tokenNumber }) => {
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
      setIsExiting(false)
    }, 400)
  }

  useEffect(() => {
    if (show) {
      setIsExiting(false)
      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`emergency-popup-backdrop ${isExiting ? 'backdrop-exiting' : 'backdrop-entering'}`}
        onClick={handleClose}
      />

      {/* Popup Container */}
      <div className={`emergency-popup-container ${isExiting ? 'popup-exiting' : 'popup-entering'}`}>
        <div className="emergency-popup">
          {/* Success Icon */}
          <div className="popup-icon-wrapper">
            <div className="popup-icon-circle">
              <svg className="popup-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="popup-content">
            <h3 className="popup-title">Emergency Patient Registered</h3>
            <p className="popup-message">
              Emergency patient registered successfully. Token generated and sent to the doctor.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="popup-close-btn"
            aria-label="Close"
          >
            <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* Backdrop */
        .emergency-popup-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9998;
          pointer-events: auto;
        }

        .backdrop-entering {
          animation: backdropFadeIn 0.3s ease-out forwards;
        }

        .backdrop-exiting {
          animation: backdropFadeOut 0.4s ease-in forwards;
        }

        /* Popup Container - Centered */
        .emergency-popup-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          pointer-events: none;
        }

        /* Popup Card */
        .emergency-popup {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 2rem 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 320px;
          max-width: 480px;
          width: 100%;
          pointer-events: auto;
          position: relative;
          border: 3px solid #EF4444;
          animation: redBorderPulse 2s ease-in-out infinite;
        }

        @media (max-width: 640px) {
          .emergency-popup {
            padding: 1.75rem 1.5rem;
            max-width: 90%;
            border-radius: 18px;
            border-width: 2.5px;
          }
        }

        @media (max-width: 480px) {
          .emergency-popup {
            padding: 1.5rem 1.25rem;
            max-width: 95%;
            border-radius: 16px;
          }
        }

        /* Success Icon */
        .popup-icon-wrapper {
          margin-bottom: 1.25rem;
        }

        .popup-icon-circle {
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
          animation: iconScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .popup-checkmark {
          width: 2rem;
          height: 2rem;
          color: #FFFFFF;
        }

        @media (max-width: 640px) {
          .popup-icon-circle {
            width: 3.5rem;
            height: 3.5rem;
          }

          .popup-checkmark {
            width: 1.75rem;
            height: 1.75rem;
          }

          .popup-icon-wrapper {
            margin-bottom: 1rem;
          }
        }

        /* Content */
        .popup-content {
          width: 100%;
          margin-bottom: 1rem;
        }

        .popup-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .popup-message {
          font-size: 1rem;
          font-weight: 500;
          color: #4B5563;
          line-height: 1.6;
          margin: 0;
          word-wrap: break-word;
        }

        @media (max-width: 640px) {
          .popup-title {
            font-size: 1.25rem;
            margin-bottom: 0.625rem;
          }

          .popup-message {
            font-size: 0.9375rem;
            line-height: 1.5;
          }

          .popup-content {
            margin-bottom: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .popup-title {
            font-size: 1.125rem;
          }

          .popup-message {
            font-size: 0.875rem;
          }
        }

        /* Close Button */
        .popup-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 2.25rem;
          height: 2.25rem;
          min-width: 2.25rem;
          min-height: 2.25rem;
          border-radius: 50%;
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .popup-close-btn:hover {
          background: #E5E7EB;
          border-color: #D1D5DB;
          color: #374151;
          transform: scale(1.1);
        }

        .popup-close-btn:active {
          transform: scale(0.95);
        }

        .close-icon {
          width: 1rem;
          height: 1rem;
          display: block;
        }

        @media (max-width: 640px) {
          .popup-close-btn {
            width: 2.5rem;
            height: 2.5rem;
            min-width: 2.5rem;
            min-height: 2.5rem;
            top: 0.875rem;
            right: 0.875rem;
          }

          .close-icon {
            width: 1.125rem;
            height: 1.125rem;
          }
        }

        /* Enter Animation */
        .popup-entering .emergency-popup {
          animation: popupFadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards,
                     redBorderPulse 2s ease-in-out infinite 0.4s;
        }

        /* Exit Animation */
        .popup-exiting .emergency-popup {
          animation: popupFadeOut 0.4s ease-in forwards;
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

        @keyframes popupFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes popupFadeOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
        }

        @keyframes iconScaleIn {
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

        /* Red Border Animation Keyframe */
        @keyframes redBorderPulse {
          0% {
            border-color: #EF4444;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            border-color: #DC2626;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(239, 68, 68, 0.2);
          }
          100% {
            border-color: #EF4444;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
        }

        /* Safe area insets for mobile devices */
        @supports (padding: max(0px)) {
          .emergency-popup-container {
            padding: max(1rem, env(safe-area-inset-top)) 
                     max(1rem, env(safe-area-inset-right)) 
                     max(1rem, env(safe-area-inset-bottom)) 
                     max(1rem, env(safe-area-inset-left));
          }
        }
      `}</style>
    </>
  )
}

export default EmergencyRegistrationSuccessToast

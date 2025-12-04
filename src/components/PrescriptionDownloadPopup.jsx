import React, { useEffect, useState } from 'react'

const PrescriptionDownloadPopup = ({ isVisible, onClose }) => {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsClosing(false)
      // Auto-dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [isVisible])

  const handleClose = () => {
    setIsClosing(true)
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  if (!isVisible && !isClosing) return null

  return (
    <>
      {/* Backdrop - Non-blocking */}
      <div 
        className={`prescription-popup-backdrop ${isClosing ? 'backdrop-closing' : 'backdrop-opening'}`}
        onClick={handleClose}
        style={{ pointerEvents: isClosing ? 'none' : 'auto' }}
        aria-hidden="true"
      />

      {/* Popup Container */}
      <div 
        className={`prescription-popup-container ${isClosing ? 'popup-closing' : 'popup-opening'}`}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="prescription-popup-card">
          {/* Success Icon with Glow */}
          <div className="popup-icon-wrapper">
            <div className="popup-icon-circle">
              <svg 
                className="popup-success-icon" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth="3"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* Popup Content */}
          <div className="popup-content">
            <h3 className="popup-title">Download Successful</h3>
            <p className="popup-message">
              Your Tekisky Hospital prescription PDF has been downloaded successfully.
            </p>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* Backdrop */
        .prescription-popup-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9998;
          pointer-events: auto;
        }

        .backdrop-opening {
          animation: backdropFadeIn 300ms ease-out forwards;
        }

        .backdrop-closing {
          animation: backdropFadeOut 300ms ease-in forwards;
        }

        @keyframes backdropFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes backdropFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Popup Container */
        .prescription-popup-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          pointer-events: none;
          width: 100%;
          max-width: 480px;
          padding: 1rem;
        }

        .popup-opening {
          animation: popupFadeInSlideUp 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .popup-closing {
          animation: popupFadeOut 300ms ease-in forwards;
        }

        @keyframes popupFadeInSlideUp {
          0% {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 20px));
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @keyframes popupFadeOut {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
        }

        /* Popup Card */
        .prescription-popup-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 24px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.5) inset;
          padding: 2rem;
          text-align: center;
          pointer-events: auto;
          position: relative;
          overflow: hidden;
        }

        .prescription-popup-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.8),
            transparent
          );
        }

        /* Icon Wrapper */
        .popup-icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .popup-icon-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 50%;
          box-shadow: 
            0 8px 24px rgba(16, 185, 129, 0.4),
            0 4px 12px rgba(16, 185, 129, 0.3),
            0 0 0 8px rgba(16, 185, 129, 0.1);
          position: relative;
          animation: iconPulse 2s ease-in-out infinite;
        }

        .popup-icon-circle::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          opacity: 0.3;
          filter: blur(12px);
          z-index: -1;
          animation: iconGlow 2s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes iconGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        .popup-success-icon {
          width: 32px;
          height: 32px;
          color: #FFFFFF;
          stroke-width: 3;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        /* Content */
        .popup-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .popup-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1F2937;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }

        .popup-message {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6B7280;
          margin: 0;
          line-height: 1.5;
        }

        /* Responsive Design */
        @media (max-width: 640px) {
          .prescription-popup-container {
            max-width: 90vw;
            padding: 0.75rem;
          }

          .prescription-popup-card {
            padding: 1.75rem 1.5rem;
            border-radius: 20px;
          }

          .popup-icon-circle {
            width: 56px;
            height: 56px;
          }

          .popup-success-icon {
            width: 28px;
            height: 28px;
          }

          .popup-title {
            font-size: 1.25rem;
          }

          .popup-message {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .prescription-popup-container {
            max-width: 85vw;
            padding: 0.5rem;
          }

          .prescription-popup-card {
            padding: 1.5rem 1.25rem;
            border-radius: 18px;
          }

          .popup-icon-circle {
            width: 52px;
            height: 52px;
          }

          .popup-success-icon {
            width: 26px;
            height: 26px;
          }

          .popup-title {
            font-size: 1.125rem;
          }

          .popup-message {
            font-size: 0.8125rem;
          }
        }

        /* Ensure popup doesn't block interaction when closing */
        .prescription-popup-container.popup-closing {
          pointer-events: none;
        }

        .prescription-popup-backdrop.backdrop-closing {
          pointer-events: none;
        }
      `}</style>
    </>
  )
}

export default PrescriptionDownloadPopup


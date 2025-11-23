import { useEffect, useState } from 'react'

const PrescriptionSuccessToast = ({ isVisible, onClose, duration = 3500 }) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsExiting(false)
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => {
          if (onClose) onClose()
          setIsExiting(false)
        }, 500)
      }, duration)
      return () => clearTimeout(timer)
    } else {
      setIsExiting(false)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible && !isExiting) return null

  return (
    <>
      <div 
        className={`prescription-success-toast ${isExiting ? 'toast-exiting' : 'toast-entering'}`}
        role="alert"
        aria-live="polite"
      >
        <div className="toast-content-wrapper">
          <div className="toast-content">
            <div className="toast-text-content">
              <h3 className="toast-title">Prescription Saved!</h3>
              <p className="toast-subtitle">PDF stored in Medical History section.</p>
            </div>
            <div className="toast-icon-container">
              <div className="icon-circle">
                <svg className="success-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        .prescription-success-toast {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          width: 360px;
          pointer-events: auto;
        }

        .toast-content-wrapper {
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .toast-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: linear-gradient(135deg, #E8F8F5 0%, #D1F2EB 100%);
          border: 1.5px solid #0BB07B;
          border-radius: 20px;
          padding: 1rem 1.25rem;
          box-shadow: 0 4px 16px rgba(11, 176, 123, 0.15),
                      0 2px 8px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
        }

        .toast-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0BB07B 0%, #0AA06A 100%);
          border-radius: 20px 20px 0 0;
        }

        .toast-text-content {
          flex: 1;
          min-width: 0;
        }

        .toast-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0A5D3A;
          margin: 0 0 0.25rem 0;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }

        .toast-subtitle {
          font-size: 0.8125rem;
          font-weight: 400;
          color: #0A5D3A;
          margin: 0;
          line-height: 1.5;
          opacity: 0.85;
        }

        .toast-icon-container {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-circle {
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, #0BB07B 0%, #0AA06A 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(11, 176, 123, 0.3);
          position: relative;
        }

        .icon-circle::after {
          content: '';
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle, rgba(11, 176, 123, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: iconPulse 2s ease-in-out infinite;
        }

        .success-check-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #FFFFFF;
          position: relative;
          z-index: 1;
          animation: iconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Entry Animation */
        .toast-entering {
          animation: toastSlideIn 0.6s ease-out forwards,
                     toastScaleUp 0.4s ease-out 0.2s forwards;
          transform: translateX(100px) translateY(20px) scale(0.95);
          opacity: 0;
        }

        /* Exit Animation */
        .toast-exiting {
          animation: toastFadeOut 0.5s ease-out forwards;
        }

        /* Keyframe Animations */
        @keyframes toastSlideIn {
          0% {
            transform: translateX(100px) translateY(20px) scale(0.95);
            opacity: 0;
          }
          100% {
            transform: translateX(0) translateY(0) scale(0.95);
            opacity: 1;
          }
        }

        @keyframes toastScaleUp {
          0% {
            transform: translateX(0) translateY(0) scale(0.95);
          }
          100% {
            transform: translateX(0) translateY(0) scale(1);
          }
        }

        @keyframes toastFadeOut {
          0% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(0) translateY(20px) scale(0.95);
            opacity: 0;
          }
        }

        @keyframes iconPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .prescription-success-toast {
            bottom: auto;
            top: 1.5rem;
            right: auto;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 400px;
          }

          .toast-entering {
            animation: toastSlideDownMobile 0.6s ease-out forwards,
                       toastScaleUp 0.4s ease-out 0.2s forwards;
            transform: translateX(-50%) translateY(-100px) scale(0.95);
            opacity: 0;
          }

          .toast-exiting {
            animation: toastFadeOutMobile 0.5s ease-out forwards;
          }

          .toast-content {
            padding: 1.125rem 1.375rem;
          }

          .toast-title {
            font-size: 0.875rem;
          }

          .toast-subtitle {
            font-size: 0.75rem;
          }

          .icon-circle {
            width: 2.25rem;
            height: 2.25rem;
          }

          .success-check-icon {
            width: 1.125rem;
            height: 1.125rem;
          }
        }

        @keyframes toastSlideDownMobile {
          0% {
            transform: translateX(-50%) translateY(-100px) scale(0.95);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) translateY(0) scale(0.95);
            opacity: 1;
          }
        }

        @keyframes toastFadeOutMobile {
          0% {
            transform: translateX(-50%) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(-30px) scale(0.95);
            opacity: 0;
          }
        }

        @media (max-width: 480px) {
          .prescription-success-toast {
            top: 1rem;
            width: calc(100% - 2rem);
            max-width: none;
          }

          .toast-content {
            padding: 1rem 1.125rem;
            border-radius: 18px;
            gap: 0.875rem;
          }

          .toast-title {
            font-size: 0.8125rem;
            margin-bottom: 0.1875rem;
          }

          .toast-subtitle {
            font-size: 0.6875rem;
            line-height: 1.4;
          }

          .icon-circle {
            width: 2rem;
            height: 2rem;
          }

          .success-check-icon {
            width: 1rem;
            height: 1rem;
          }
        }

        @media (max-width: 360px) {
          .prescription-success-toast {
            top: 0.75rem;
            width: calc(100% - 1.5rem);
          }

          .toast-content {
            padding: 0.875rem 1rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .toast-icon-container {
            align-self: flex-end;
          }

          .toast-title {
            font-size: 0.75rem;
          }

          .toast-subtitle {
            font-size: 0.6875rem;
          }
        }

        /* High contrast for accessibility */
        @media (prefers-contrast: high) {
          .toast-content {
            background: #D1F2EB;
            border: 2px solid #0BB07B;
          }

          .toast-title,
          .toast-subtitle {
            color: #0A5D3A;
            font-weight: 600;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .toast-entering,
          .toast-exiting,
          .success-check-icon,
          .icon-circle::after {
            animation: none;
          }

          .toast-entering {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

export default PrescriptionSuccessToast


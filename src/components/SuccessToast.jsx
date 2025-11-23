import { useEffect, useState } from 'react'

const SuccessToast = ({ message, isVisible, onClose, duration = 3000 }) => {
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

  return (
    <>
      {isVisible || isExiting ? (
        <div 
          className={`success-toast ${isExiting ? 'toast-exiting' : 'toast-entering'}`}
          role="alert"
          aria-live="polite"
        >
        <div className="toast-content">
          <div className="toast-text-wrapper">
            <p className="toast-message">{message}</p>
          </div>
          <div className="toast-icon-wrapper">
            <div className="icon-glow"></div>
            <div className="icon-circle"></div>
            <svg className="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>
      ) : null}

      {/* CSS Styles */}
      <style>{`
        .success-toast {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          min-width: 320px;
          max-width: 480px;
          pointer-events: auto;
        }

        .toast-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: linear-gradient(135deg, #28B463 0%, #22A859 100%);
          color: #FFFFFF;
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(40, 180, 99, 0.3),
                      0 4px 12px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .toast-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 2s ease-in-out infinite;
        }

        .toast-text-wrapper {
          flex: 1;
          min-width: 0;
        }

        .toast-message {
          font-size: 0.9375rem;
          font-weight: 600;
          line-height: 1.5;
          color: #FFFFFF;
          margin: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          letter-spacing: -0.01em;
          hyphens: auto;
        }

        .toast-icon-wrapper {
          position: relative;
          flex-shrink: 0;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-glow {
          position: absolute;
          inset: -4px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulseGlow 2s ease-in-out infinite;
          pointer-events: none;
        }

        .icon-circle {
          position: absolute;
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
        }

        .success-icon {
          position: relative;
          width: 1.5rem;
          height: 1.5rem;
          color: #FFFFFF;
          z-index: 1;
          animation: iconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Entry Animation */
        .toast-entering {
          animation: toastSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     toastPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards;
          transform: translateX(80px) scale(0.9);
          opacity: 0;
        }

        /* Exit Animation */
        .toast-exiting {
          animation: toastFadeOut 0.5s ease-in forwards;
        }

        /* Keyframe Animations */
        @keyframes toastSlideIn {
          0% {
            transform: translateX(80px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateX(0) scale(0.9);
            opacity: 1;
          }
        }

        @keyframes toastPop {
          0% {
            transform: translateX(0) scale(0.9);
          }
          50% {
            transform: translateX(0) scale(1.05);
          }
          100% {
            transform: translateX(0) scale(1);
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
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .success-toast {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            min-width: auto;
            max-width: none;
          }

          .toast-entering {
            animation: toastSlideInMobile 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                       toastPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards;
            transform: translateY(100px) scale(0.9);
          }

          .toast-exiting {
            animation: toastFadeOutMobile 0.5s ease-in forwards;
          }

          .toast-content {
            padding: 1rem 1.25rem;
            border-radius: 14px;
          }

          .toast-message {
            font-size: 0.875rem;
          }

          .toast-icon-wrapper {
            width: 2.25rem;
            height: 2.25rem;
          }

          .success-icon {
            width: 1.375rem;
            height: 1.375rem;
          }
        }

        @keyframes toastSlideInMobile {
          0% {
            transform: translateY(100px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(0.9);
            opacity: 1;
          }
        }

        @keyframes toastFadeOutMobile {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(30px) scale(0.95);
            opacity: 0;
          }
        }

        @media (max-width: 480px) {
          .success-toast {
            bottom: 0.75rem;
            right: 0.75rem;
            left: 0.75rem;
            min-width: auto;
          }

          .toast-content {
            padding: 1rem 1.125rem;
            border-radius: 14px;
            gap: 0.875rem;
            flex-wrap: nowrap;
          }

          .toast-text-wrapper {
            flex: 1;
            min-width: 0;
            overflow-wrap: break-word;
            word-break: break-word;
          }

          .toast-message {
            font-size: 0.8125rem;
            line-height: 1.5;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }

          .toast-icon-wrapper {
            width: 2.25rem;
            height: 2.25rem;
            flex-shrink: 0;
          }

          .success-icon {
            width: 1.375rem;
            height: 1.375rem;
          }

          .icon-glow {
            inset: -3px;
          }
        }

        @media (max-width: 360px) {
          .success-toast {
            bottom: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
          }

          .toast-content {
            padding: 0.875rem 1rem;
            gap: 0.75rem;
          }

          .toast-message {
            font-size: 0.75rem;
            line-height: 1.4;
          }

          .toast-icon-wrapper {
            width: 2rem;
            height: 2rem;
          }

          .success-icon {
            width: 1.25rem;
            height: 1.25rem;
          }
        }

        @media (max-width: 320px) {
          .toast-content {
            padding: 0.75rem 0.875rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.625rem;
          }

          .toast-icon-wrapper {
            align-self: flex-end;
          }

          .toast-message {
            font-size: 0.6875rem;
          }
        }

        /* High contrast for accessibility */
        @media (prefers-contrast: high) {
          .toast-content {
            background: #1E8E4A;
            border: 2px solid #FFFFFF;
          }

          .toast-message {
            font-weight: 700;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .toast-entering,
          .toast-exiting,
          .success-icon,
          .icon-glow,
          .toast-content::before {
            animation: none;
          }

          .toast-entering {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

export default SuccessToast


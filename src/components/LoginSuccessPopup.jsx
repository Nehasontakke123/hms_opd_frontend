import { useEffect, useState } from 'react'

const LoginSuccessPopup = ({ onClose, loginType = 'admin' }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  // Theme colors based on login type
  const themes = {
    admin: {
      primary: '#3A8DFF',
      secondary: '#2563EB',
      gradient: 'linear-gradient(135deg, #3A8DFF 0%, #2563EB 100%)',
      glow: 'rgba(58, 141, 255, 0.4)',
      textGradient: 'linear-gradient(135deg, #3A8DFF, #2563EB)'
    },
    medical: {
      primary: '#14B8A6',
      secondary: '#0D9488',
      gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      glow: 'rgba(20, 184, 166, 0.4)',
      textGradient: 'linear-gradient(135deg, #14B8A6, #0D9488)'
    },
    doctor: {
      primary: '#8B5CF6',
      secondary: '#A855F7',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      glow: 'rgba(139, 92, 246, 0.4)',
      textGradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)'
    },
    receptionist: {
      primary: '#10B981',
      secondary: '#059669',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      glow: 'rgba(16, 185, 129, 0.4)',
      textGradient: 'linear-gradient(135deg, #10B981, #059669)'
    }
  }

  const theme = themes[loginType.toLowerCase()] || themes.admin

  useEffect(() => {
    // Auto-dismiss after 2.5-3 seconds
    const timer = setTimeout(() => {
      setIsClosing(true)
      setTimeout(() => {
        setIsVisible(false)
        if (onClose) onClose()
      }, 400) // Match fade-out duration
    }, 2800) // 2.8 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className={`login-backdrop ${isClosing ? 'backdrop-closing' : 'backdrop-opening'}`}
        onClick={() => {
          setIsClosing(true)
          setTimeout(() => {
            setIsVisible(false)
            if (onClose) onClose()
          }, 400)
        }}
      />

      {/* Popup Container */}
      <div className={`login-popup-container ${isClosing ? 'popup-closing' : 'popup-opening'}`}>
        <div 
          className="login-success-popup"
          style={{
            '--theme-primary': theme.primary,
            '--theme-secondary': theme.secondary,
            '--theme-gradient': theme.gradient,
            '--theme-glow': theme.glow,
            '--theme-text-gradient': theme.textGradient
          }}
        >
          {/* Icon with Glow */}
          <div className="icon-container">
            <div className="icon-glow"></div>
            <div className="icon-circle">
              <svg className="icon-cross" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="popup-content">
            <h2 className="popup-title">Login Successful</h2>
            <p className="popup-subtitle">
              Welcome to Tekisky Hospital + OPD Management System
            </p>
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        /* Backdrop */
        .login-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 50;
        }

        .backdrop-opening {
          animation: backdropFadeIn 0.4s ease-out forwards;
        }

        .backdrop-closing {
          animation: backdropFadeOut 0.4s ease-in forwards;
        }

        /* Popup Container */
        .login-popup-container {
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

        /* Popup Card */
        .login-success-popup {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 26px;
          padding: 2.5rem 3rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15),
                      0 0 0 1px rgba(255, 255, 255, 0.5),
                      0 0 40px var(--theme-glow);
          max-width: 450px;
          width: 100%;
          text-align: center;
          position: relative;
          pointer-events: auto;
          animation: popupScaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform: scale(0.92) translateY(20px);
          opacity: 0;
        }

        .icon-container {
          position: relative;
          display: inline-flex;
          margin-bottom: 1.75rem;
        }

        .icon-glow {
          position: absolute;
          inset: -12px;
          background: radial-gradient(circle, var(--theme-glow) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(16px);
          animation: iconGlow 2.5s ease-in-out infinite;
          pointer-events: none;
        }

        .icon-circle {
          position: relative;
          width: 72px;
          height: 72px;
          background: var(--theme-gradient);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px var(--theme-glow),
                      0 0 0 4px rgba(255, 255, 255, 0.1);
          animation: iconPopBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s forwards;
          transform: scale(0);
          z-index: 1;
        }

        .icon-cross {
          width: 36px;
          height: 36px;
          color: white;
        }

        .popup-content {
          animation: contentFadeIn 0.5s ease-out 0.5s forwards;
          opacity: 0;
        }

        .popup-title {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.625rem;
          background: var(--theme-text-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .popup-subtitle {
          font-size: 1rem;
          color: #64748b;
          line-height: 1.6;
          font-weight: 500;
        }

        /* Keyframe Animations */
        @keyframes backdropFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes backdropFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

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
          .login-success-popup {
            padding: 2rem 2.25rem;
            max-width: 90%;
            border-radius: 24px;
          }

          .icon-circle {
            width: 64px;
            height: 64px;
          }

          .icon-cross {
            width: 32px;
            height: 32px;
          }

          .popup-title {
            font-size: 1.625rem;
          }

          .popup-subtitle {
            font-size: 0.9375rem;
          }
        }

        @media (max-width: 480px) {
          .login-popup-container {
            padding: 1rem;
          }

          .login-success-popup {
            padding: 1.75rem 2rem;
            border-radius: 22px;
          }

          .icon-container {
            margin-bottom: 1.5rem;
          }

          .icon-circle {
            width: 56px;
            height: 56px;
          }

          .icon-cross {
            width: 28px;
            height: 28px;
          }

          .popup-title {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }

          .popup-subtitle {
            font-size: 0.875rem;
            line-height: 1.5;
          }
        }

        @media (max-width: 360px) {
          .login-success-popup {
            padding: 1.5rem 1.75rem;
            border-radius: 20px;
          }

          .icon-circle {
            width: 52px;
            height: 52px;
          }

          .icon-cross {
            width: 26px;
            height: 26px;
          }

          .popup-title {
            font-size: 1.375rem;
          }

          .popup-subtitle {
            font-size: 0.8125rem;
          }
        }

        @media (max-width: 320px) {
          .login-popup-container {
            padding: 0.75rem;
          }

          .login-success-popup {
            padding: 1.25rem 1.5rem;
            border-radius: 18px;
          }

          .icon-circle {
            width: 48px;
            height: 48px;
          }

          .icon-cross {
            width: 24px;
            height: 24px;
          }

          .popup-title {
            font-size: 1.25rem;
          }

          .popup-subtitle {
            font-size: 0.75rem;
          }
        }

        /* High contrast for accessibility */
        @media (prefers-contrast: high) {
          .login-success-popup {
            background: #FFFFFF;
            border: 2px solid var(--theme-primary);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .popup-opening,
          .popup-closing,
          .backdrop-opening,
          .backdrop-closing,
          .login-success-popup,
          .icon-circle,
          .icon-glow,
          .popup-content {
            animation: none;
          }

          .login-success-popup {
            transform: scale(1) translateY(0);
            opacity: 1;
          }

          .popup-content {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

export default LoginSuccessPopup

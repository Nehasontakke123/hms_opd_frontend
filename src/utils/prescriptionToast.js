import toast from 'react-hot-toast'

/**
 * Shows a custom centered success toast for prescription PDF download
 * with smooth animations and hospital-themed styling
 */
export const showPrescriptionDownloadToast = () => {
  const toastId = 'prescription-download-toast'
  
  // Dismiss any existing toast with the same ID
  toast.dismiss(toastId)
  
  toast.custom(
    (t) => {
      return (
        <div
          className={`prescription-download-toast ${t.visible ? 'toast-visible' : 'toast-hidden'}`}
          role="alert"
          aria-live="polite"
        >
          <div className="toast-card">
            {/* Success Icon */}
            <div className="toast-icon-wrapper">
              <div className="icon-bg-circle">
                <svg 
                  className="success-check-icon" 
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

            {/* Toast Content */}
            <div className="toast-text-content">
              <p className="toast-main-message">
                Your Tekisky Hospital prescription PDF has been downloaded successfully.
              </p>
            </div>
          </div>

          {/* Toast Styles */}
          <style>{`
            .prescription-download-toast {
              position: relative;
              max-width: 560px;
              width: 100%;
            }

            .prescription-download-toast.toast-visible {
              animation: toastEnter 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }

            .prescription-download-toast.toast-hidden {
              animation: toastExit 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            @keyframes toastEnter {
              0% {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes toastExit {
              0% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
              100% {
                opacity: 0;
                transform: translateY(-8px) scale(0.98);
              }
            }

            .toast-card {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 16px 18px;
              background: linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%);
              border: 1px solid rgba(229, 231, 235, 0.8);
              border-radius: 16px;
              box-shadow: 
                0 10px 25px -5px rgba(0, 0, 0, 0.08),
                0 8px 10px -6px rgba(0, 0, 0, 0.06),
                0 0 0 1px rgba(0, 0, 0, 0.02);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              position: relative;
              overflow: hidden;
            }

            .toast-icon-wrapper {
              flex-shrink: 0;
              position: relative;
            }

            .icon-bg-circle {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              border-radius: 50%;
              box-shadow: 
                0 4px 12px rgba(16, 185, 129, 0.25),
                0 2px 4px rgba(16, 185, 129, 0.15);
              position: relative;
            }

            .icon-bg-circle::after {
              content: '';
              position: absolute;
              inset: -2px;
              border-radius: 50%;
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              opacity: 0.15;
              filter: blur(6px);
              z-index: -1;
            }

            .success-check-icon {
              width: 20px;
              height: 20px;
              color: #FFFFFF;
              stroke-width: 3;
              filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
            }

            .toast-text-content {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
            }

            .toast-main-message {
              font-size: 15px;
              font-weight: 600;
              color: #1F2937;
              line-height: 1.5;
              margin: 0;
              letter-spacing: -0.01em;
            }

            /* Responsive Design */
            @media (max-width: 640px) {
              .prescription-download-toast {
                max-width: calc(100vw - 32px);
              }

              .toast-card {
                padding: 14px 16px;
                gap: 12px;
              }

              .icon-bg-circle {
                width: 36px;
                height: 36px;
              }

              .success-check-icon {
                width: 18px;
                height: 18px;
              }

              .toast-main-message {
                font-size: 14px;
              }
            }

            @media (max-width: 480px) {
              .prescription-download-toast {
                max-width: calc(100vw - 24px);
              }

              .toast-card {
                padding: 14px 16px;
                gap: 10px;
              }

              .icon-bg-circle {
                width: 32px;
                height: 32px;
              }

              .success-check-icon {
                width: 16px;
                height: 16px;
              }

              .toast-main-message {
                font-size: 13px;
                line-height: 1.4;
              }
            }
          `}</style>
        </div>
      )
    },
    {
      duration: 3000,
      position: 'top-center',
      id: toastId
    }
  )
}


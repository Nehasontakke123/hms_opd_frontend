import toast from 'react-hot-toast'

/**
 * Shows a premium centered success toast for prescription PDF download
 * with smooth animations and hospital-grade styling
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
          onClick={() => toast.dismiss(t.id)}
          style={{ cursor: 'pointer' }}
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
              max-width: 520px;
              width: auto;
              margin: 0 auto;
              z-index: 10000;
            }

            .prescription-download-toast.toast-visible {
              animation: toastEnterPremium 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }

            .prescription-download-toast.toast-hidden {
              animation: toastExitPremium 400ms ease-in-out forwards;
            }

            @keyframes toastEnterPremium {
              0% {
                opacity: 0;
                transform: translateY(-25px) scale(0.95);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes toastExitPremium {
              0% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
              100% {
                opacity: 0;
                transform: translateY(-10px) scale(0.98);
              }
            }

            .toast-card {
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 18px;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
              border: 1px solid rgba(229, 231, 235, 0.6);
              border-radius: 16px;
              box-shadow: 
                0 20px 25px -5px rgba(0, 0, 0, 0.1),
                0 10px 10px -5px rgba(0, 0, 0, 0.04),
                0 0 0 1px rgba(0, 0, 0, 0.02);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              position: relative;
              overflow: hidden;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .prescription-download-toast:hover .toast-card {
              transform: translateY(-1px);
              box-shadow: 
                0 25px 30px -5px rgba(0, 0, 0, 0.12),
                0 12px 12px -5px rgba(0, 0, 0, 0.05),
                0 0 0 1px rgba(0, 0, 0, 0.02);
            }

            .toast-icon-wrapper {
              flex-shrink: 0;
              position: relative;
            }

            .icon-bg-circle {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 44px;
              height: 44px;
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              border-radius: 50%;
              box-shadow: 
                0 4px 14px rgba(16, 185, 129, 0.3),
                0 2px 6px rgba(16, 185, 129, 0.2);
              position: relative;
            }

            .icon-bg-circle::after {
              content: '';
              position: absolute;
              inset: -3px;
              border-radius: 50%;
              background: linear-gradient(135deg, #10B981 0%, #059669 100%);
              opacity: 0.2;
              filter: blur(8px);
              z-index: -1;
            }

            .success-check-icon {
              width: 22px;
              height: 22px;
              color: #FFFFFF;
              stroke-width: 3;
              filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
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
                max-width: 90vw;
                width: 90%;
              }

              .toast-card {
                padding: 16px 18px;
                gap: 14px;
              }

              .icon-bg-circle {
                width: 40px;
                height: 40px;
              }

              .success-check-icon {
                width: 20px;
                height: 20px;
              }

              .toast-main-message {
                font-size: 14px;
              }
            }

            @media (max-width: 480px) {
              .prescription-download-toast {
                max-width: 90vw;
                width: 90%;
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


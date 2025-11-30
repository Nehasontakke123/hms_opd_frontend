import { useEffect } from 'react'
import './PrescriptionDownloadToast.css'

const PrescriptionDownloadToast = ({ visible, onDismiss }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div 
      className={`prescription-download-toast-wrapper ${visible ? 'toast-visible' : 'toast-hidden'}`}
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
            Your Tekisky Hospital prescription PDF is ready and downloaded successfully.
          </p>
          <p className="toast-subtext">Saved to your device.</p>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionDownloadToast


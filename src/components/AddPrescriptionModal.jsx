import { useState, useEffect, useRef } from 'react'
import PrescriptionSuccessToast from './PrescriptionSuccessToast'

const AddPrescriptionModal = ({ isOpen, onClose, patient, onSave }) => {
  const [isClosing, setIsClosing] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [formData, setFormData] = useState({
    medicineName: '',
    dosage: { morning: false, afternoon: false, night: false },
    duration: '',
    notes: '',
    testsRequired: ''
  })
  const [focusedFields, setFocusedFields] = useState({})

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setShowToast(true)
      document.body.style.overflow = 'hidden'
      
      // Hide toast after 3 seconds
      const toastTimer = setTimeout(() => {
        setShowToast(false)
      }, 3000)

      return () => {
        clearTimeout(toastTimer)
        document.body.style.overflow = 'unset'
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
      setFormData({
        medicineName: '',
        dosage: { morning: false, afternoon: false, night: false },
        duration: '',
        notes: '',
        testsRequired: ''
      })
      setFocusedFields({})
    }, 300)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDosageToggle = (time) => {
    setFormData(prev => ({
      ...prev,
      dosage: {
        ...prev.dosage,
        [time]: !prev.dosage[time]
      }
    }))
  }

  const handleFocus = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: true }))
  }

  const handleBlur = (field) => {
    setFocusedFields(prev => ({ ...prev, [field]: false }))
  }

  const handleSubmit = () => {
    if (!formData.medicineName.trim()) {
      alert('Please enter a medicine name')
      return
    }
    if (!formData.duration.trim()) {
      alert('Please enter duration')
      return
    }
    if (!formData.dosage.morning && !formData.dosage.afternoon && !formData.dosage.night) {
      alert('Please select at least one dosage time')
      return
    }
    if (onSave) {
      onSave(formData)
    }
    // Show success toast immediately
    setShowSuccessToast(true)
    // Close modal after a short delay to let toast appear
    setTimeout(() => {
      handleClose()
    }, 100)
  }

  const patientName = patient?.fullName || patient?.name || 'Patient'

  return (
    <>
      {/* Success Toast - Rendered outside modal so it persists */}
      <PrescriptionSuccessToast
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        duration={3500}
      />

      {isOpen || isClosing ? (
        <>
          {/* Toaster Notification */}
      {showToast && (
        <div className="prescription-toast">
          <div className="toast-content">
            <svg className="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Add Prescription Form Opened</span>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div 
        className={`prescription-backdrop ${isClosing ? 'backdrop-closing' : 'backdrop-opening'}`}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className={`prescription-container ${isClosing ? 'modal-closing' : 'modal-opening'}`}>
        <div className="prescription-modal">
          {/* Header */}
          <div className="prescription-header">
            <div className="header-content">
              <div>
                <h2 className="header-title">Add Prescription</h2>
                <p className="header-subtitle">Prescribe medication for {patientName}</p>
              </div>
              <button
                onClick={handleClose}
                className="close-button"
                aria-label="Close"
              >
                <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="prescription-form">
            {/* Medicine Name */}
            <div className="form-group">
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <input
                  type="text"
                  id="medicineName"
                  value={formData.medicineName}
                  onChange={(e) => handleInputChange('medicineName', e.target.value)}
                  onFocus={() => handleFocus('medicineName')}
                  onBlur={() => handleBlur('medicineName')}
                  className="form-input"
                />
                <label 
                  htmlFor="medicineName"
                  className={`floating-label ${formData.medicineName || focusedFields.medicineName ? 'focused' : ''}`}
                >
                  Medicine Name *
                </label>
              </div>
            </div>

            {/* Dosage Times */}
            <div className="form-group">
              <label className="form-label">Dosage Times *</label>
              <div className="dosage-buttons">
                <button
                  type="button"
                  onClick={() => handleDosageToggle('morning')}
                  className={`dosage-btn ${formData.dosage.morning ? 'active' : ''}`}
                >
                  <svg className="dosage-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Morning
                </button>
                <button
                  type="button"
                  onClick={() => handleDosageToggle('afternoon')}
                  className={`dosage-btn ${formData.dosage.afternoon ? 'active' : ''}`}
                >
                  <svg className="dosage-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Afternoon
                </button>
                <button
                  type="button"
                  onClick={() => handleDosageToggle('night')}
                  className={`dosage-btn ${formData.dosage.night ? 'active' : ''}`}
                >
                  <svg className="dosage-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Night
                </button>
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="text"
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  onFocus={() => handleFocus('duration')}
                  onBlur={() => handleBlur('duration')}
                  className="form-input"
                  placeholder=" "
                />
                <label 
                  htmlFor="duration"
                  className={`floating-label ${formData.duration || focusedFields.duration ? 'focused' : ''}`}
                >
                  Duration (Days) *
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <div className="textarea-wrapper">
                <svg className="textarea-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  onFocus={() => handleFocus('notes')}
                  onBlur={() => handleBlur('notes')}
                  className="form-textarea"
                  rows="4"
                  placeholder=" "
                />
                <label 
                  htmlFor="notes"
                  className={`floating-label textarea-label ${formData.notes || focusedFields.notes ? 'focused' : ''}`}
                >
                  Notes
                </label>
              </div>
            </div>

            {/* Tests Required */}
            <div className="form-group">
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <input
                  type="text"
                  id="testsRequired"
                  value={formData.testsRequired}
                  onChange={(e) => handleInputChange('testsRequired', e.target.value)}
                  onFocus={() => handleFocus('testsRequired')}
                  onBlur={() => handleBlur('testsRequired')}
                  className="form-input"
                  placeholder=" "
                />
                <label 
                  htmlFor="testsRequired"
                  className={`floating-label ${formData.testsRequired || focusedFields.testsRequired ? 'focused' : ''}`}
                >
                  Tests Required
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="prescription-footer">
            <button
              onClick={handleClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-submit"
            >
              Add Prescription
            </button>
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        /* Toaster Notification */
        .prescription-toast {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 60;
          animation: toastSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     toastFadeOut 0.5s ease-in 2.5s forwards;
          transform: translateX(400px);
          opacity: 0;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          color: #FFFFFF;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .toast-icon {
          width: 1.25rem;
          height: 1.25rem;
          animation: iconPulse 2s ease-in-out infinite;
        }

        /* Backdrop */
        .prescription-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 50;
        }

        .backdrop-opening {
          animation: backdropFadeIn 0.5s ease-out forwards;
        }

        .backdrop-closing {
          animation: backdropFadeOut 0.3s ease-in forwards;
        }

        /* Modal Container */
        .prescription-container {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          pointer-events: none;
        }

        .modal-opening {
          animation: modalFadeIn 0.5s ease-out forwards;
        }

        .modal-closing {
          animation: modalFadeOut 0.3s ease-in forwards;
        }

        /* Modal Card */
        .prescription-modal {
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          animation: slideFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     scalePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards;
          transform: translateY(40px) scale(0.95);
          opacity: 0;
          overflow: hidden;
          border: 2px solid transparent;
          background-image: linear-gradient(#FFFFFF, #FFFFFF),
                            linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          background-origin: border-box;
          background-clip: padding-box, border-box;
        }

        /* Header */
        .prescription-header {
          background: linear-gradient(135deg, #F7F7F7 0%, #FFFFFF 100%);
          padding: 1.75rem 2rem;
          border-bottom: 1px solid #EAEAEA;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 0.375rem;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 0.9375rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .close-button {
          width: 2.5rem;
          height: 2.5rem;
          min-width: 2.5rem;
          min-height: 2.5rem;
          border-radius: 50%;
          background: #F7F7F7;
          border: 1px solid #EAEAEA;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
          margin: 0;
          flex-shrink: 0;
        }

        .close-button:hover {
          background: #EAEAEA;
          color: #1F2937;
          transform: rotate(90deg) scale(1.1);
        }

        .close-button:active {
          transform: rotate(90deg) scale(0.95);
        }

        .close-icon {
          width: 1.125rem;
          height: 1.125rem;
          display: block;
        }

        /* Form Content */
        .prescription-form {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          min-height: 0;
        }

        .prescription-form::-webkit-scrollbar {
          width: 8px;
        }

        .prescription-form::-webkit-scrollbar-track {
          background: #F7F7F7;
          border-radius: 4px;
        }

        .prescription-form::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 4px;
        }

        .prescription-form::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }

        /* Form Groups */
        .form-group {
          margin-bottom: 1.75rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        /* Input Wrapper */
        .input-wrapper,
        .textarea-wrapper {
          position: relative;
        }

        .input-icon,
        .textarea-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: #9CA3AF;
          pointer-events: none;
          transition: color 0.3s ease;
          z-index: 1;
        }

        .textarea-icon {
          top: 1.25rem;
          transform: none;
        }

        .form-input:focus ~ .input-icon,
        .form-textarea:focus ~ .textarea-icon {
          color: #3B82F6;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          font-size: 1rem;
          color: #1F2937;
          background: #FFFFFF;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .form-textarea {
          padding-top: 1.5rem;
          min-height: 120px;
          resize: vertical;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .form-input:focus ~ .input-icon,
        .form-textarea:focus ~ .textarea-icon {
          color: #3B82F6;
        }

        /* Floating Labels */
        .floating-label {
          position: absolute;
          left: 3rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          color: #9CA3AF;
          pointer-events: none;
          transition: all 0.3s ease;
          background: #FFFFFF;
          padding: 0 0.5rem;
        }

        .textarea-label {
          top: 1.5rem;
          transform: none;
        }

        .floating-label.focused {
          top: 0;
          left: 2.5rem;
          font-size: 0.75rem;
          color: #3B82F6;
          font-weight: 600;
        }

        .form-input:not(:placeholder-shown) ~ .floating-label,
        .form-textarea:not(:placeholder-shown) ~ .floating-label {
          top: 0;
          left: 2.5rem;
          font-size: 0.75rem;
          color: #6B7280;
        }

        /* Dosage Buttons */
        .dosage-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .dosage-btn {
          flex: 1;
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          background: #FFFFFF;
          color: #6B7280;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dosage-btn:hover {
          border-color: #3B82F6;
          color: #3B82F6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .dosage-btn.active {
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          border-color: transparent;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .dosage-btn:active {
          transform: translateY(0) scale(0.98);
        }

        .dosage-icon {
          width: 1.125rem;
          height: 1.125rem;
        }

        /* Footer */
        .prescription-footer {
          padding: 1.75rem 2rem;
          border-top: 1px solid #EAEAEA;
          background: #F9FAFB;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .btn-cancel {
          padding: 0.875rem 1.75rem;
          background: #F3F4F6;
          color: #374151;
          border: 1px solid #D1D5DB;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel:hover {
          background: #E5E7EB;
          border-color: #9CA3AF;
        }

        .btn-submit {
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-submit:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-submit:active {
          transform: translateY(0) scale(0.98);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Keyframe Animations */
        @keyframes toastSlideIn {
          0% {
            transform: translateX(400px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes toastFadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(400px);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes backdropFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes backdropFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes modalFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes modalFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes slideFadeIn {
          0% {
            transform: translateY(40px) scale(0.95);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(0.95);
            opacity: 1;
          }
        }

        @keyframes scalePop {
          0% {
            transform: translateY(0) scale(0.95);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .prescription-modal {
            max-width: 90%;
          }
        }

        @media (max-width: 768px) {
          .prescription-container {
            padding: 0;
            align-items: flex-end;
          }

          .prescription-modal {
            max-width: 100%;
            max-height: 95vh;
            border-radius: 24px 24px 0 0;
            animation: mobileSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            transform: translateY(100%);
          }

          .modal-closing .prescription-modal {
            animation: mobileSlideDown 0.3s ease-in forwards;
          }

          .prescription-toast {
            top: 1rem;
            right: 1rem;
            left: 1rem;
            right: auto;
            animation: toastSlideInMobile 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                       toastFadeOutMobile 0.5s ease-in 2.5s forwards;
            transform: translateY(-100px);
          }

          .toast-content {
            width: 100%;
            justify-content: center;
          }

          .prescription-header {
            padding: 1.5rem 1.5rem;
          }

          .header-title {
            font-size: 1.5rem;
          }

          .header-subtitle {
            font-size: 0.875rem;
          }

          .close-button {
            width: 2.25rem;
            height: 2.25rem;
            min-width: 2.25rem;
            min-height: 2.25rem;
          }

          .prescription-form {
            padding: 1.5rem;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .dosage-buttons {
            flex-direction: column;
          }

          .dosage-btn {
            width: 100%;
            min-width: 0;
          }

          .prescription-footer {
            padding: 1.5rem 1.5rem;
            position: sticky;
            bottom: 0;
            background: #FFFFFF;
            border-top: 2px solid #EAEAEA;
            flex-direction: column-reverse;
            gap: 0.75rem;
          }

          .btn-cancel,
          .btn-submit {
            width: 100%;
            padding: 1rem 1.5rem;
          }
        }

        @keyframes mobileSlideUp {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes mobileSlideDown {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100%);
            opacity: 0;
          }
        }

        @keyframes toastSlideInMobile {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes toastFadeOutMobile {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-100px);
          }
        }

        @media (max-width: 480px) {
          .prescription-modal {
            max-height: 98vh;
            border-radius: 20px 20px 0 0;
          }

          .prescription-header {
            padding: 1.25rem 1.25rem;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .header-subtitle {
            font-size: 0.8125rem;
          }

          .prescription-form {
            padding: 1.25rem 1rem;
          }

          .form-input,
          .form-textarea {
            padding: 0.875rem 0.875rem 0.875rem 2.75rem;
            font-size: 0.9375rem;
          }

          .form-textarea {
            padding-top: 1.25rem;
          }

          .input-icon,
          .textarea-icon {
            left: 0.875rem;
            width: 1.125rem;
            height: 1.125rem;
          }

          .floating-label {
            left: 2.75rem;
          }

          .floating-label.focused {
            left: 2.25rem;
          }

          .prescription-footer {
            padding: 1.25rem 1.25rem;
          }
        }

        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .close-button,
          .dosage-btn,
          .btn-cancel,
          .btn-submit {
            min-height: 44px;
          }
        }
      `}</style>
        </>
      ) : null}
    </>
  )
}

export default AddPrescriptionModal


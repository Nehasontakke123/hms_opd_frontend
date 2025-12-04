import { showPrescriptionDownloadPopup } from '../context/PrescriptionDownloadPopupContext'

/**
 * Shows a premium centered success popup for prescription PDF download
 * with smooth animations and hospital-grade styling
 */
export const showPrescriptionDownloadToast = () => {
  // Use the new popup component instead of toast
  showPrescriptionDownloadPopup()
}


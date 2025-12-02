import api from './api'

/**
 * Generate prescription PDF from backend using Puppeteer
 * @param {string} patientId - Patient ID
 * @returns {Promise<Blob>} PDF blob
 */
const generatePrescriptionPDFFromBackend = async (patientId) => {
  try {
    const response = await api.post(
      '/prescription/generate',
      { patientId },
      {
        responseType: 'blob', // Important: receive binary data
      }
    )

    // Return blob
    return new Blob([response.data], { type: 'application/pdf' })
  } catch (error) {
    console.error('Error generating PDF from backend:', error)
    throw new Error(
      error.response?.data?.message || 
      'Failed to generate PDF. Please try again.'
    )
  }
}

/**
 * Download prescription PDF
 * @param {string} patientId - Patient ID
 * @param {string} patientName - Patient name for filename
 * @param {string} tokenNumber - Token number for filename
 */
export const downloadPrescriptionPDF = async (patientId, patientName, tokenNumber) => {
  try {
    const blob = await generatePrescriptionPDFFromBackend(patientId)
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    
    // Create filename
    const sanitizedName = patientName.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const fileName = `prescription_${sanitizedName}_${tokenNumber}.pdf`
    anchor.download = fileName
    
    // Trigger download
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    
    // Clean up
    window.URL.revokeObjectURL(url)
    
    return blob
  } catch (error) {
    console.error('Error downloading PDF:', error)
    throw error
  }
}

/**
 * Get PDF as base64 for storage/upload
 * @param {string} patientId - Patient ID
 * @returns {Promise<string>} Base64 encoded PDF with data URI prefix
 */
export const getPrescriptionPDFAsBase64 = async (patientId) => {
  try {
    const blob = await generatePrescriptionPDFFromBackend(patientId)
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result) // Returns data:application/pdf;base64,...
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting PDF to base64:', error)
    throw error
  }
}

export default generatePrescriptionPDFFromBackend


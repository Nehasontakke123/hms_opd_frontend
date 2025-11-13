import jsPDF from 'jspdf'

const generatePatientRegistrationPDF = (patientData, doctorInfo) => {
  const doc = new jsPDF()
  
  // Color Scheme - Professional Medical Report
  const HEADER_COLOR = [16, 185, 129] // Green header (Tekisky brand)
  const SECTION_BG = [249, 250, 251] // Light gray section background
  const BORDER_COLOR = [229, 231, 235] // Light border
  const TEXT_DARK = [31, 41, 55] // Dark text
  const TEXT_MEDIUM = [75, 85, 99] // Medium gray
  const TEXT_LIGHT = [107, 114, 128] // Light gray
  const ACCENT_COLOR = [59, 130, 246] // Blue accent
  
  // Page metrics
  const margin = 14
  const pageWidth = 210
  const pageHeight = 297
  const contentWidth = pageWidth - margin * 2
  let y = margin
  
  // Header Section
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageWidth, 35, 'F')
  
  // Hospital name
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Tekisky Hospital', pageWidth / 2, 15, { align: 'center' })
  
  // Report title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Patient Registration Confirmation', pageWidth / 2, 25, { align: 'center' })
  
  // Timestamp
  doc.setFontSize(9)
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Generated on: ${timestamp}`, pageWidth / 2, 31, { align: 'center' })
  
  y = 42
  
  // Token Number - Prominent Display
  if (patientData.tokenNumber) {
    doc.setFillColor(...ACCENT_COLOR)
    doc.rect(margin, y, contentWidth, 15, 'F')
    doc.setDrawColor(...ACCENT_COLOR)
    doc.rect(margin, y, contentWidth, 15, 'S')
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`Token Number: #${patientData.tokenNumber}`, pageWidth / 2, y + 10, { align: 'center' })
    
    y += 20
  }
  
  // Patient Information Section
  doc.setFillColor(...SECTION_BG)
  doc.rect(margin, y, contentWidth, 50, 'F')
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(margin, y, contentWidth, 50, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Patient Information', margin + 2, y + 8)
  
  y += 12
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  
  const patientName = patientData.fullName || 'N/A'
  const patientAge = patientData.age || 'N/A'
  const patientMobile = patientData.mobileNumber || 'N/A'
  const patientGender = patientData.gender || 'N/A'
  const patientAddress = patientData.address || 'N/A'
  
  doc.text(`Name: ${patientName}`, margin + 3, y)
  doc.text(`Age: ${patientAge} years`, margin + 3, y + 5)
  doc.text(`Gender: ${patientGender}`, margin + 3, y + 10)
  doc.text(`Mobile: ${patientMobile}`, margin + 3, y + 15)
  
  const addressLines = doc.splitTextToSize(`Address: ${patientAddress}`, contentWidth - 6)
  doc.text(addressLines, margin + 3, y + 20)
  
  y += 55
  
  // Doctor Information Section
  if (doctorInfo) {
    doc.setFillColor(...SECTION_BG)
    doc.rect(margin, y, contentWidth, 30, 'F')
    doc.setDrawColor(...BORDER_COLOR)
    doc.rect(margin, y, contentWidth, 30, 'S')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Consulting Doctor', margin + 2, y + 8)
    
    y += 12
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MEDIUM)
    
    const doctorName = doctorInfo.fullName || doctorInfo.name || 'N/A'
    const specialization = doctorInfo.specialization || 'N/A'
    const qualification = doctorInfo.qualification || 'N/A'
    
    doc.text(`Dr. ${doctorName}`, margin + 3, y)
    doc.text(`Specialization: ${specialization}`, margin + 3, y + 5)
    doc.text(`Qualification: ${qualification}`, margin + 3, y + 10)
    
    y += 35
  }
  
  // Visit Details Section
  doc.setFillColor(...SECTION_BG)
  doc.rect(margin, y, contentWidth, 40, 'F')
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(margin, y, contentWidth, 40, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Visit Details', margin + 2, y + 8)
  
  y += 12
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  
  const visitDate = patientData.visitDate 
    ? new Date(patientData.visitDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A'
  
  const visitTime = patientData.visitTime || 'N/A'
  const disease = patientData.disease || 'N/A'
  
  doc.text(`Visit Date: ${visitDate}`, margin + 3, y)
  doc.text(`Visit Time: ${visitTime}`, margin + 3, y + 5)
  doc.text(`Chief Complaint: ${disease}`, margin + 3, y + 10)
  
  if (patientData.isRecheck) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ACCENT_COLOR)
    doc.text('(Recheck-up Visit)', margin + 3, y + 15)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MEDIUM)
  }
  
  y += 25
  
  // Vitals Section
  if (patientData.bloodPressure || patientData.sugarLevel) {
    doc.setFillColor(...SECTION_BG)
    doc.rect(margin, y, contentWidth, 20, 'F')
    doc.setDrawColor(...BORDER_COLOR)
    doc.rect(margin, y, contentWidth, 20, 'S')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Vitals', margin + 2, y + 8)
    
    y += 12
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MEDIUM)
    
    const vitals = []
    if (patientData.bloodPressure) vitals.push(`BP: ${patientData.bloodPressure}`)
    if (patientData.sugarLevel) vitals.push(`Sugar: ${patientData.sugarLevel} mg/dL`)
    
    doc.text(vitals.join(' | ') || 'N/A', margin + 3, y)
    
    y += 25
  }
  
  // Payment Information Section
  if (patientData.fees !== undefined) {
    doc.setFillColor(...SECTION_BG)
    doc.rect(margin, y, contentWidth, 25, 'F')
    doc.setDrawColor(...BORDER_COLOR)
    doc.rect(margin, y, contentWidth, 25, 'S')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Payment Information', margin + 2, y + 8)
    
    y += 12
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MEDIUM)
    
    const feeStatus = patientData.feeStatus || 'pending'
    const paymentMethod = patientData.paymentMethod || 'N/A'
    const fees = patientData.fees || 0
    
    doc.text(`Consultation Fee: ₹${fees}`, margin + 3, y)
    doc.text(`Payment Status: ${feeStatus.charAt(0).toUpperCase() + feeStatus.slice(1)}`, margin + 3, y + 5)
    if (paymentMethod !== 'N/A') {
      doc.text(`Payment Method: ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`, margin + 3, y + 10)
    }
    
    y += 30
  }
  
  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...TEXT_LIGHT)
  doc.text(
    'Tekisky Hospital Patient Registration Confirmation',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )
  
  // Output
  const pdfBase64 = doc.output('datauristring')
  return pdfBase64
}

export default generatePatientRegistrationPDF


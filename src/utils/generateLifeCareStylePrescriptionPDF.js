import jsPDF from 'jspdf'

const generateLifeCareStylePrescriptionPDF = (patient, doctor, prescription) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true
  })

  // Life Care Clinic Theme Colors
  const DARK_BLUE = [25, 50, 100] // Dark blue for text
  const LIGHT_BLUE = [135, 206, 250] // Light blue for accents
  const SOFT_BLUE = [173, 216, 230] // Soft blue for sidebar
  const GOLD = [255, 215, 0] // Gold for caduceus
  const GOLD_DARK = [218, 165, 32] // Darker gold
  const TEXT_DARK = [26, 28, 32] // Dark text
  const TEXT_MEDIUM = [111, 116, 128] // Medium gray
  const WHITE = [255, 255, 255] // White background
  const SIDEBAR_BG = [240, 248, 255] // Very light blue for sidebar

  // Default values
  const DEFAULT_CLINIC_NAME = 'Tekisky Hospital'
  const DEFAULT_CLINIC_ADDRESS = 'Workshop Nanded'
  const DEFAULT_CLINIC_PHONE = '9359481880'
  const DEFAULT_CLINIC_TIMINGS = 'Morning 10 am to 3 pm | Evening 5 pm to 10 pm'
  const DEFAULT_PHARMACY = 'TekiskyPHARMA MEDICAL'

  // Helper to sanitize printable text (preserve Hindi/Devanagari characters)
  const cleanText = (text) => {
    if (!text) return ''
    let cleaned = String(text)
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoji ranges
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      // Keep Hindi/Devanagari characters (U+0900 to U+097F)
      // Keep ASCII and common Unicode ranges
      .trim()
    return cleaned || ''
  }

  // Page setup - A4
  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const margin = 10
  const sidebarWidth = 50 // Left sidebar width
  const contentWidth = pageWidth - margin * 2 - sidebarWidth
  const contentX = margin + sidebarWidth + 5
  let y = margin

  // Fill white background
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // ========== HEADER SECTION ==========
  const headerHeight = 30
  const headerY = y

  // Soft blue wave background for header (simulated with gradient fill)
  doc.setFillColor(245, 250, 255) // Very light blue
  doc.rect(margin, headerY, pageWidth - margin * 2, headerHeight, 'F')
  
  // Draw wave pattern (simplified - using filled rectangles)
  doc.setFillColor(...SOFT_BLUE)
  doc.setDrawColor(...SOFT_BLUE)
  // Create wave effect with overlapping circles
  for (let i = 0; i < pageWidth - margin * 2; i += 5) {
    const waveY = headerY + headerHeight / 2 + Math.sin(i * 0.08) * 4
    doc.circle(margin + i, waveY, 2, 'F')
  }

  // Left: Clinic Name (LIFE CARE CLINIC style)
  const clinicName = cleanText(doctor?.clinicName || doctor?.hospitalName || DEFAULT_CLINIC_NAME)
  const clinicNameParts = clinicName.split(' ')
  const mainName = clinicNameParts[0] || clinicName
  const subName = clinicNameParts.slice(1).join(' ') || 'HOSPITAL'

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK_BLUE)
  doc.text(mainName, margin + 5, headerY + 10)
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT_BLUE)
  doc.text(subName, margin + 5, headerY + 16)

  // Center: Gold Caduceus Icon
  const caduceusX = pageWidth / 2
  const caduceusY = headerY + 8
  const caduceusSize = 12

  // Draw gold caduceus (simplified but recognizable)
  doc.setFillColor(...GOLD)
  doc.setDrawColor(...GOLD_DARK)
  doc.setLineWidth(0.6)
  
  // Staff (vertical line - thicker)
  doc.line(caduceusX, caduceusY, caduceusX, caduceusY + caduceusSize)
  
  // Wings (top - simplified as circles/ovals)
  doc.setFillColor(...GOLD)
  // Left wing
  doc.circle(caduceusX - 2.5, caduceusY - 1, 1.5, 'F')
  // Right wing
  doc.circle(caduceusX + 2.5, caduceusY - 1, 1.5, 'F')
  
  // Snakes (curved lines around staff - simplified)
  doc.setDrawColor(...GOLD_DARK)
  doc.setLineWidth(0.5)
  // Left snake (spiral)
  let prevX = caduceusX - 1
  let prevY = caduceusY
  for (let i = 1; i <= caduceusSize; i++) {
    const angle = (i / caduceusSize) * Math.PI * 3
    const x = caduceusX - 1.5 + Math.cos(angle) * 1.2
    const y = caduceusY + i
    doc.line(prevX, prevY, x, y)
    prevX = x
    prevY = y
  }
  // Right snake (spiral)
  prevX = caduceusX + 1
  prevY = caduceusY
  for (let i = 1; i <= caduceusSize; i++) {
    const angle = (i / caduceusSize) * Math.PI * 3
    const x = caduceusX + 1.5 - Math.cos(angle) * 1.2
    const y = caduceusY + i
    doc.line(prevX, prevY, x, y)
    prevX = x
    prevY = y
  }

  // Right: Doctor Details (Two doctors)
  const doctorX = pageWidth - margin - 60
  const doctorY = headerY + 6

  // First Doctor
  let doctorName1 = cleanText(doctor?.fullName || doctor?.name || 'Dr. Monu')
  if (!doctorName1.match(/^Dr\.?\s/i)) {
    doctorName1 = `Dr. ${doctorName1}`
  }
  doctorName1 = doctorName1.split(' ').map(word => {
    if (word.toLowerCase() === 'dr.' || word.toLowerCase() === 'dr') return 'Dr.'
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK_BLUE)
  doc.text(doctorName1.toUpperCase(), doctorX, doctorY)

  // Qualification
  const qualification1 = cleanText(doctor?.qualification || 'MD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_BLUE)
  doc.text(qualification1, doctorX, doctorY + 5)

  // Specialization
  const specialization1 = cleanText(doctor?.specialization || 'General Physician')
  doc.setFontSize(8)
  doc.text(specialization1, doctorX, doctorY + 9)

  // Registration Number
  const regNo1 = cleanText(doctor?.registrationNo || doctor?.registrationNumber || 'REG-12345')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text(`Regd. No. ${regNo1}`, doctorX, doctorY + 13)

  // Second Doctor (if available, otherwise duplicate first)
  const doctor2 = doctor?.doctor2 || doctor
  let doctorName2 = cleanText(doctor2?.fullName || doctor2?.name || 'Dr. Assistant')
  if (!doctorName2.match(/^Dr\.?\s/i)) {
    doctorName2 = `Dr. ${doctorName2}`
  }
  doctorName2 = doctorName2.split(' ').map(word => {
    if (word.toLowerCase() === 'dr.' || word.toLowerCase() === 'dr') return 'Dr.'
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK_BLUE)
  doc.text(doctorName2.toUpperCase(), doctorX, doctorY + 18)

  const qualification2 = cleanText(doctor2?.qualification || 'MBBS')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_BLUE)
  doc.text(qualification2, doctorX, doctorY + 23)

  const specialization2 = cleanText(doctor2?.specialization || 'General Physician')
  doc.setFontSize(8)
  doc.text(specialization2, doctorX, doctorY + 27)

  const regNo2 = cleanText(doctor2?.registrationNo || doctor2?.registrationNumber || 'REG-12346')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text(`Regd. No. ${regNo2}`, doctorX, doctorY + 31)

  y = headerY + headerHeight + 8

  // ========== LEFT SIDEBAR (Available Facilities) ==========
  const sidebarY = y
  const sidebarHeight = pageHeight - sidebarY - 40

  // Sidebar background with rounded corners
  doc.setFillColor(...SIDEBAR_BG)
  doc.setDrawColor(...SOFT_BLUE)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, sidebarY, sidebarWidth, sidebarHeight, 3, 3, 'FD')

  // Sidebar title (Hindi)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 0, 0) // Red color for title
  doc.text('उपलब्ध सुविधा', margin + sidebarWidth / 2, sidebarY + 8, { align: 'center' })

  // Facilities list (Hindi with English)
  const facilities = [
    'Laboratory Facility (सभी खून की जांच)',
    'B.P. Checkup और इलाज',
    'Diabetes Checkup और इलाज',
    'Jaundice, Typhoid, Malaria, Pneumonia, Dirrhoea Checkup और इलाज',
    'Day Care Admission सुविधा उपलब्ध',
    'बच्चे बडे और औरतों के सभी इलाज',
    'थाएरॉईड, बाल झडना, किडनी स्टोन और स्किन (चमडी) की सभी बिमारियों पर विषेश इलाज',
    'हिजामा थेरपी',
    'ग्लूकोमीटर, और नेबुलायझेशन की सुविधा'
  ]

  let facilityY = sidebarY + 15
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_DARK)

  facilities.forEach((facility, index) => {
    // Bullet point
    doc.setFillColor(...DARK_BLUE)
    doc.circle(margin + 5, facilityY, 1, 'F')
    
    // Facility text
    const facilityLines = doc.splitTextToSize(facility, sidebarWidth - 10)
    doc.text(facilityLines, margin + 8, facilityY + 2)
    facilityY += facilityLines.length * 4 + 3
  })

  // ========== PATIENT DETAILS SECTION ==========
  y = sidebarY

  // Patient Details heading
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Patient Details', contentX, y)
  y += 6

  // Patient Name
  const patientName = cleanText(patient?.fullName || '')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Patient Name:', contentX, y)
  if (patientName) {
    doc.text(patientName, contentX + 30, y)
  }
  // Draw underline for writing space
  doc.setDrawColor(...TEXT_MEDIUM)
  doc.setLineWidth(0.3)
  doc.line(contentX + 30, y - 2, contentX + 100, y - 2)
  y += 6

  // Weight (Wt.)
  const weight = patient?.weight ? `${patient.weight} kg` : ''
  doc.text('Wt.:', contentX, y)
  if (weight) {
    doc.text(weight, contentX + 30, y)
  }
  doc.line(contentX + 30, y - 2, contentX + 100, y - 2)
  y += 6

  // Age
  const age = patient?.age ? String(patient.age) : ''
  doc.text('Age:', contentX, y)
  if (age) {
    doc.text(age, contentX + 30, y)
  }
  doc.line(contentX + 30, y - 2, contentX + 100, y - 2)
  y += 6

  // Sex
  const gender = cleanText(patient?.gender || patient?.sex || '')
  doc.text('Sex:', contentX, y)
  if (gender) {
    doc.text(gender, contentX + 30, y)
  }
  doc.line(contentX + 30, y - 2, contentX + 100, y - 2)
  y += 6

  // Date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  doc.text('Date:', contentX, y)
  doc.text(today, contentX + 30, y)
  doc.line(contentX + 30, y - 2, contentX + 100, y - 2)
  y += 10

  // ========== PRESCRIPTION (Rx) SYMBOL ==========
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('℞', contentX, y)
  y += 12

  // ========== STETHOSCOPE WATERMARK ==========
  // Draw large, faint stethoscope watermark in background
  const watermarkColor = [220, 235, 245] // Very light blue (simulates low opacity)
  doc.setDrawColor(...watermarkColor)
  doc.setFillColor(...watermarkColor)
  doc.setLineWidth(2)
  
  const stethoscopeX = pageWidth - margin - 50
  const stethoscopeY = y + 40
  
  // Earpieces (top)
  doc.circle(stethoscopeX - 8, stethoscopeY, 3, 'FD')
  doc.circle(stethoscopeX + 8, stethoscopeY, 3, 'FD')
  
  // Tubes (curved lines)
  doc.setLineWidth(2.5)
  // Left tube
  for (let i = 0; i < 25; i++) {
    const x = stethoscopeX - 8 + Math.sin(i * 0.3) * 2
    const y = stethoscopeY + i
    if (i > 0) {
      const prevX = stethoscopeX - 8 + Math.sin((i-1) * 0.3) * 2
      const prevY = stethoscopeY + i - 1
      doc.line(prevX, prevY, x, y)
    }
  }
  // Right tube
  for (let i = 0; i < 25; i++) {
    const x = stethoscopeX + 8 - Math.sin(i * 0.3) * 2
    const y = stethoscopeY + i
    if (i > 0) {
      const prevX = stethoscopeX + 8 - Math.sin((i-1) * 0.3) * 2
      const prevY = stethoscopeY + i - 1
      doc.line(prevX, prevY, x, y)
    }
  }
  
  // Chest piece (diaphragm) - large
  doc.circle(stethoscopeX, stethoscopeY + 30, 8, 'FD')
  doc.setDrawColor(...watermarkColor)
  doc.setLineWidth(1.5)
  doc.circle(stethoscopeX, stethoscopeY + 30, 5, 'S')
  
  // Reset colors
  doc.setDrawColor(...TEXT_DARK)
  doc.setFillColor(...WHITE)

  // ========== DIAGNOSIS SECTION ==========
  if (prescription.diagnosis) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Diagnosis:', contentX, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    const diagnosisText = cleanText(String(prescription.diagnosis))
    doc.text(diagnosisText, contentX, y)
    y += 8
  }

  // ========== MEDICINES SECTION ==========
  if (prescription.medicines && prescription.medicines.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Prescribed Medicines:', contentX, y)
    y += 6

    prescription.medicines.forEach((medicine, index) => {
      // Check if we need a new page
      if (y > 220) {
        doc.addPage()
        doc.setFillColor(...WHITE)
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        y = margin
      }

      const medNum = index + 1
      const medName = cleanText(String(medicine.name || 'N/A'))
      const dosage = cleanText(String(medicine.dosage || 'N/A'))
      const duration = cleanText(String(medicine.duration || 'N/A'))
      const instructions = cleanText(String(medicine.instructions || medicine.dosageInstructions || 'As directed'))

      // Medicine card
      const cardHeight = 20
      doc.setFillColor(250, 252, 255)
      doc.setDrawColor(...SOFT_BLUE)
      doc.setLineWidth(0.3)
      doc.roundedRect(contentX, y - 4, contentWidth - 5, cardHeight, 2, 2, 'FD')

      // Medicine number and name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_DARK)
      doc.text(`${medNum}. ${medName}`, contentX + 3, y)

      // Dosage
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT_MEDIUM)
      doc.text(`Dosage: ${dosage}`, contentX + 3, y + 5)

      // Duration
      doc.text(`Duration: ${duration}`, contentX + 3, y + 10)

      // Instructions
      if (instructions && instructions !== 'As directed') {
        doc.text(`Instructions: ${instructions}`, contentX + 3, y + 15)
        y += cardHeight + 3
      } else {
        y += cardHeight + 3
      }
    })
  }

  // ========== TESTS SECTION ==========
  if (prescription.selectedTests && prescription.selectedTests.length > 0) {
    y += 3
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Tests Suggested:', contentX, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    const testsText = prescription.selectedTests.join(', ')
    doc.text(testsText, contentX, y)
    y += 8
  }

  // ========== FOOTER SECTION ==========
  const footerY = pageHeight - margin - 25

  // Blue pill-shaped timing bar
  const timingBarY = footerY
  const timingBarHeight = 8
  doc.setFillColor(...LIGHT_BLUE)
  doc.setDrawColor(...LIGHT_BLUE)
  doc.roundedRect(margin, timingBarY, pageWidth - margin * 2, timingBarHeight, 4, 4, 'F')
  
  const timings = cleanText(doctor?.clinicTimings || DEFAULT_CLINIC_TIMINGS)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(`Time: ${timings}`, pageWidth / 2, timingBarY + 5, { align: 'center' })

  // Pharmacy Name
  const pharmacyName = cleanText(doctor?.pharmacyName || DEFAULT_PHARMACY)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK_BLUE)
  doc.text(pharmacyName, pageWidth / 2, timingBarY + 12, { align: 'center' })

  // Address and Contact
  const clinicAddress = cleanText(doctor?.clinicAddress || doctor?.hospitalAddress || DEFAULT_CLINIC_ADDRESS)
  const phone = cleanText(doctor?.mobileNumber || doctor?.hospitalPhone || DEFAULT_CLINIC_PHONE)
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text(clinicAddress, pageWidth / 2, timingBarY + 18, { align: 'center' })
  doc.text(`Cell: ${phone}`, pageWidth / 2, timingBarY + 23, { align: 'center' })

  // Doctor Signature Line
  const sigY = pageHeight - margin - 5
  doc.setDrawColor(...TEXT_MEDIUM)
  doc.setLineWidth(0.5)
  doc.line(contentX, sigY, contentX + 50, sigY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text('Doctor Signature', contentX, sigY + 4)

  // Date on right
  doc.text(`Date: ${today}`, pageWidth - margin, sigY + 4, { align: 'right' })

  // Output as base64 data URI string
  const pdfBase64 = doc.output('datauristring')
  return pdfBase64
}

export default generateLifeCareStylePrescriptionPDF


import jsPDF from 'jspdf'

// Helper function to draw SVG signature curve
function drawSVGSignature(doc, x, y, length) {
  doc.setDrawColor(31, 41, 55) // TEXT_DARK
  doc.setLineWidth(0.5)
  
  // Create smooth wavy signature line
  let prevX = x
  let prevY = y
  const segments = 50
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const sigLineX = x + t * length
    // Multiple sine waves for natural signature look
    const sigLineY = y + 
      Math.sin(t * Math.PI * 4) * 1.5 + 
      Math.sin(t * Math.PI * 7) * 0.8 +
      Math.sin(t * Math.PI * 11) * 0.4
    
    if (i > 0) {
      doc.line(prevX, prevY, sigLineX, sigLineY)
    }
    prevX = sigLineX
    prevY = sigLineY
  }
}

// Helper function to draw professional stamp with teal dashed border
function drawProfessionalStamp(doc, x, y, width, height, doctor, PRIMARY_COLOR, ACCENT_COLOR, TEXT_MEDIUM, DEFAULT_HOSPITAL_NAME) {
  // Helper to sanitize text (local to this function scope)
  const cleanText = (text) => {
    if (!text) return ''
    return String(text).replace(/[^\x20-\x7E]/g, '').trim() || ''
  }
  // Outer border (teal dashed for stamp effect)
  doc.setDrawColor(...PRIMARY_COLOR) // Teal color
  doc.setLineWidth(1.0)
  doc.setLineDashPattern([3, 2], 0)
  doc.roundedRect(x, y, width, height, 2, 2, 'S')
  doc.setLineDashPattern([], 0)
  
  // Inner solid border (teal)
  doc.setDrawColor(...ACCENT_COLOR) // Teal accent
  doc.setLineWidth(0.5)
  doc.roundedRect(x + 1.5, y + 1.5, width - 3, height - 3, 1.5, 1.5, 'S')
  
  // Background (crisp white - no tint)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x + 2, y + 2, width - 4, height - 4, 1.5, 1.5, 'F')
  
  // Stamp text - Hospital Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PRIMARY_COLOR) // Teal color
  const hospitalStampName = cleanText(doctor?.clinicName || doctor?.hospitalName || DEFAULT_HOSPITAL_NAME).toUpperCase()
  doc.text(hospitalStampName, x + width / 2, y + 7, { align: 'center', maxWidth: width - 6 })
  
  // Authorization text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text('AUTHORIZED', x + width / 2, y + 11, { align: 'center' })
  doc.text('MEDICAL PRACTITIONER', x + width / 2, y + 14, { align: 'center' })
  
  // Registration number
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(...PRIMARY_COLOR) // Teal color
  const regNo = cleanText(doctor?.registrationNo || doctor?.registrationNumber || 'REG-12345').toUpperCase()
  doc.text(regNo, x + width / 2, y + 18, { align: 'center' })
}

const generateTraditionalPrescriptionPDF = (patient, doctor, prescription) => {
  // Set high-resolution output (300 DPI equivalent)
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true
  })
  
  // Hospital Theme Colors - Teal accent for clean design
  const TEAL_COLOR = [20, 184, 166] // #14B8A6 - Teal accent line
  const PRIMARY_COLOR = [20, 184, 166] // Teal for header
  const ACCENT_COLOR = [20, 184, 166] // Teal accent
  const TEXT_DARK = [31, 41, 55] // #1F2937 - Dark text
  const TEXT_MEDIUM = [75, 85, 99] // #4B5563 - Medium gray
  const BORDER_COLOR = [229, 231, 235] // #E5E7EB - Light borders
  const DEFAULT_HOSPITAL_NAME = 'Tekisky Hospital'
  const DEFAULT_HOSPITAL_ADDRESS = 'WorkshopNanded'
  const DEFAULT_HOSPITAL_PHONE = '9359481880'
  const DEFAULT_HOSPITAL_EMAIL = 'tekisky@gmail.com'
  
  // Ensure crisp white background - fill entire page
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 210, 297, 'F')

  // Helper to sanitize printable text
  const cleanText = (text) => {
    if (!text) return ''
    let cleaned = String(text)
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim()
    return cleaned || ''
  }

  // Page setup - A4 safe margins (minimum 12mm / 0.47in)
  const pageWidth = 210 // A4 width in mm
  const marginLeft = 15 // 15mm left margin (print-safe)
  const marginRight = 15 // 15mm right margin (print-safe)
  const marginTop = 15 // 15mm top margin (print-safe)
  const contentWidth = pageWidth - marginLeft - marginRight
  let y = marginTop

  // ========== HEADER: TEKISKY HOSPITAL - DOCTOR PRESCRIPTION ==========
  // Hospital Name (top) - centered, teal color, bold, uppercase
  const hospitalNameHeader = cleanText(doctor?.clinicName || doctor?.hospitalName || DEFAULT_HOSPITAL_NAME)
  const hospitalNameUpper = hospitalNameHeader.toUpperCase()
  
  // Professional sans-serif typography - Hospital Name
  doc.setFontSize(22) // Larger, more prominent
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY_COLOR) // Teal color
  
  // Date on the right side, aligned with hospital name
  const prescriptionDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444
  doc.text(prescriptionDate, pageWidth - marginRight, y, { align: 'right' })
  
  // Hospital name centered
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY_COLOR)
  doc.text(hospitalNameUpper, pageWidth / 2, y, { align: 'center' })
  y += 9

  // Prescription Title - bold, dark gray/black, properly centered
  doc.setFontSize(14) // 14pt for subtitle
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('DOCTOR PRESCRIPTION', pageWidth / 2, y, { align: 'center' })
  y += 10

  // Subtle teal accent line under header (thin rule)
  doc.setDrawColor(...TEAL_COLOR)
  doc.setLineWidth(0.8) // Slightly thicker for visibility
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 8

  // ========== TOP SECTION: CLINIC/HOSPITAL & DOCTOR ==========
  // Two-column layout with equal width and aligned baseline
  const topSectionY = y
  const leftColWidth = contentWidth * 0.48
  const rightColWidth = contentWidth * 0.48
  const colGap = contentWidth * 0.04
  const labelValueGap = 3 // Gap between label and value

  // Left Column: CLINIC/HOSPITAL NAME
  // Values: clear, readable typography with exact text style format
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10) // 10pt body text
  doc.setTextColor(68, 68, 68) // #444
  
  // Clinic/Hospital Name - exact format
  const hospitalName = cleanText(doctor?.clinicName || doctor?.hospitalName || DEFAULT_HOSPITAL_NAME)
  doc.text(`Clinic/Hospital Name: ${hospitalName}`, marginLeft, y)
  y += 6.5 // Increased line-height for readability

  // Address - aligned on single line
  const hospitalAddress = cleanText(doctor?.hospitalAddress || doctor?.clinicAddress || DEFAULT_HOSPITAL_ADDRESS)
  doc.text(`Address: ${hospitalAddress}`, marginLeft, y)
  y += 6.5

  // Phone - aligned on single line
  const hospitalPhone = cleanText(doctor?.hospitalPhone || doctor?.mobileNumber || DEFAULT_HOSPITAL_PHONE)
  doc.text(`Phone: ${hospitalPhone}`, marginLeft, y)
  y += 6.5

  // Email - exact format (not Email / Website)
  const hospitalEmail = cleanText(doctor?.hospitalEmail || doctor?.email || DEFAULT_HOSPITAL_EMAIL)
  doc.text(`Email: ${hospitalEmail}`, marginLeft, y)

  // Right Column: DOCTOR NAME
  y = topSectionY
  const rightColX = marginLeft + leftColWidth + colGap

  // Section label: bold, professional typography
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('DOCTOR NAME', rightColX, y)
  y += 6

  // Values: clear, readable typography
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444
  
  // Doctor Name - Format: "Dr. Monu" with proper capitalization
  let doctorName = cleanText(doctor?.fullName || doctor?.name || 'Monu')
  // Ensure "Dr." prefix if not present
  if (!doctorName.match(/^Dr\.?\s/i)) {
    doctorName = `Dr. ${doctorName}`
  }
  // Capitalize first letter of each word
  doctorName = doctorName.split(' ').map(word => {
    if (word.toLowerCase() === 'dr.' || word.toLowerCase() === 'dr') return 'Dr.'
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')
  doc.text(`Doctor Name: ${doctorName}`, rightColX, y)
  y += 6.5

  // Qualification - consistent capitalization
  const qualification = cleanText(doctor?.qualification || 'MD').toUpperCase()
  doc.text(`Qualification: ${qualification}`, rightColX, y)
  y += 6.5

  // Registration No. - consistent format
  const registrationNo = cleanText(doctor?.registrationNo || doctor?.registrationNumber || 'REG-12345').toUpperCase()
  doc.text(`Registration No.: ${registrationNo}`, rightColX, y)

  // Subtle gray divider line after top section
  const topSectionBottom = Math.max(y, topSectionY + 28)
  y = topSectionBottom + 4
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 10

  // ========== MIDDLE SECTION: PATIENT DETAILS & DIAGNOSIS ==========
  const middleSectionY = y

  // Left Column: PATIENT DETAILS
  // Section label: bold, professional typography
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('PATIENT DETAILS', marginLeft, y)
  y += 6

  // Values: clear typography with increased line-height
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444

  // Patient Name - aligned on single line
  const patientName = cleanText(patient?.fullName || 'N/A')
  doc.text(`Patient Name: ${patientName}`, marginLeft, y)
  y += 6.5

  // Gender - aligned on single line
  const gender = cleanText(patient?.gender || 'N/A')
  doc.text(`Gender: ${gender}`, marginLeft, y)
  y += 6.5

  // Patient ID - clearly visible
  const patientId = cleanText(patient?.patientId || patient?._id?.slice(-8) || 'N/A')
  doc.text(`Patient ID: ${patientId}`, marginLeft, y)
  y += 6.5

  // Age - moved to PATIENT DETAILS section
  const age = cleanText(String(patient?.age || 'N/A'))
  doc.text(`Age: ${age}`, marginLeft, y)

  // Right Column: DIAGNOSIS / NOTES
  y = middleSectionY
  // Section label: bold, professional typography
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('DIAGNOSIS / NOTES', rightColX, y)
  y += 6

  // Values: clear typography with increased line-height
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444

  // Date - aligned on single line
  doc.text(`Date: ${prescriptionDate}`, rightColX, y)
  y += 6.5

  // Diagnosis - merge with advice
  const diagnosis = cleanText(prescription.diagnosis || '')
  if (diagnosis) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(68, 68, 68) // #444
    doc.text(`Diagnosis: ${diagnosis}`, rightColX, y)
    y += 6.5
  }

  // Advice - merged into diagnosis section (without "Advice:" label)
  if (prescription.notes && prescription.notes.trim()) {
    const notesText = cleanText(prescription.notes)
    // Remove "Tests Required:" prefix if present
    let cleanedNotes = notesText.replace(/Tests Required:?\s*.+?(\n|$)/i, '').trim()
    // Remove any "Advice:" label if present
    cleanedNotes = cleanedNotes.replace(/^Advice:?\s*/i, '').trim()
    
    if (cleanedNotes) {
      const notesLines = doc.splitTextToSize(cleanedNotes, rightColWidth - 10)
      notesLines.forEach((line) => {
        doc.text(line, rightColX, y)
        y += 5
      })
    }
  }

  // Subtle gray divider line after middle section
  const middleSectionBottom = Math.max(y, middleSectionY + 20)
  y = middleSectionBottom + 4
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 10

  // ========== PRESCRIPTION (Rx) SECTION ==========
  // Section label: bold, professional typography
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('PRESCRIPTION (Rx)', marginLeft, y)
  y += 7

  // Medicine entries - side-by-side layout
  const medicineStartY = y
  const medColWidth = (contentWidth - 10) / 2 // Two columns with gap
  const medColGap = 10
  const medLeftX = marginLeft + 5
  const medRightX = marginLeft + 5 + medColWidth + medColGap
  let currentMedStartY = medicineStartY
  
  // Helper function to format timing
  const formatTiming = (times) => {
    const timingParts = []
    if (times?.morning) timingParts.push('Morning')
    if (times?.afternoon) timingParts.push('Afternoon')
    if (times?.night) timingParts.push('Night')
    return timingParts.length > 0 ? timingParts.join(', ') : ''
  }

  // Helper function to format dose pattern
  const formatDosePattern = (times) => {
    const morning = times?.morning ? '1' : '0'
    const afternoon = times?.afternoon ? '1' : '0'
    const night = times?.night ? '1' : '0'
    return `${morning} – ${afternoon} – ${night}`
  }

  // Helper function to render a single medicine
  const renderMedicine = (medicine, medNum, startX, startY, maxWidth) => {
    let medY = startY
    const medName = cleanText(String(medicine.name || 'N/A'))
    const duration = cleanText(String(medicine.duration || 'N/A'))
    const timing = formatTiming(medicine.times)
    const dosePattern = formatDosePattern(medicine.times)
    const instructions = cleanText(String(medicine.dosageInstructions || medicine.instructions || 'After meals'))

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(68, 68, 68) // #444
    const nameLines = doc.splitTextToSize(`${medNum}. ${medName}`, maxWidth)
    doc.text(nameLines, startX, medY)
    medY += nameLines.length * 5.5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Dose Pattern: ${dosePattern}`, startX, medY, { maxWidth: maxWidth })
    medY += 5

    if (timing) {
      doc.text(`Timing: ${timing}`, startX, medY, { maxWidth: maxWidth })
      medY += 5
    }

    const instructionLines = doc.splitTextToSize(`Instruction: ${instructions}`, maxWidth)
    doc.text(instructionLines, startX, medY)
    medY += instructionLines.length * 5

    doc.text(`Duration: ${duration}`, startX, medY, { maxWidth: maxWidth })
    medY += 5

    return medY - startY // Return height used
  }

  // Process medicines in pairs (side-by-side)
  const totalMedicines = prescription.medicines.length
  
  for (let i = 0; i < totalMedicines; i += 2) {
    if (y > 240) {
      doc.addPage()
      y = marginTop
      currentMedStartY = y
    }

    const medLeft = prescription.medicines[i]
    const medRight = i + 1 < totalMedicines ? prescription.medicines[i + 1] : null

    let leftHeight = 0
    let rightHeight = 0

    // Left Medicine
    if (medLeft) {
      leftHeight = renderMedicine(medLeft, i + 1, medLeftX, currentMedStartY, medColWidth)
    }

    // Right Medicine - only render if it exists
    if (medRight) {
      rightHeight = renderMedicine(medRight, i + 2, medRightX, currentMedStartY, medColWidth)
    }

    // Calculate the height needed for this row (use the taller one)
    const maxHeight = Math.max(leftHeight, rightHeight || 0)
    currentMedStartY += maxHeight + 3 // Compact spacing between medicine pairs
    y = currentMedStartY
  }
  
  y += 5

  // Subtle gray divider line after prescription
  y -= 2
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 6

  // ========== TESTS / LAB INVESTIGATIONS ==========
  // Section label: bold, professional typography
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('TESTS / LAB INVESTIGATIONS', marginLeft, y)
  y += 7

  // Values: clear typography with increased line-height
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444
  
  // Extract tests from notes or use selectedTests
  let testsText = ''
  if (prescription.selectedTests && prescription.selectedTests.length > 0) {
    testsText = prescription.selectedTests.join(', ')
  } else if (prescription.notes) {
    // Try to extract tests from notes
    const notesText = cleanText(prescription.notes)
    const testsMatch = notesText.match(/Tests Required:?\s*(.+?)(?:\n|$)/i)
    if (testsMatch) {
      testsText = testsMatch[1]
    } else {
      testsText = 'No tests required'
    }
  } else {
    testsText = 'No tests required'
  }

  if (testsText && testsText !== 'No tests required') {
    const testsLines = doc.splitTextToSize(testsText, contentWidth - 10)
    testsLines.forEach((line, index) => {
      doc.text(line, marginLeft + 5, y)
      if (index < testsLines.length - 1) y += 5
    })
    y += 5
  } else {
    doc.text('_________________________________________________________________', marginLeft + 5, y)
    y += 5
  }

  // Subtle gray divider line after tests
  y += 4
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 8

  // ========== DOCTOR SIGNATURE & STAMP ==========
  y += 8
  // Section label: bold, professional typography
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('DOCTOR SIGNATURE & STAMP', marginLeft, y)
  y += 10

  // Professional signature section
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444
  doc.text('Signature:', marginLeft + 5, y)
  
  const sigX = marginLeft + 30
  const sigY = y - 3
  const sigLength = 60
  
  // Try to add signature image if available, otherwise use SVG signature
  const signatureImage = doctor?.signatureImage || doctor?.signature || null
  
  if (signatureImage) {
    try {
      // Add signature image (if base64 or URL)
      doc.addImage(signatureImage, 'PNG', sigX, sigY - 5, 35, 8)
    } catch (error) {
      console.warn('Failed to add signature image, using SVG signature:', error)
      // Fallback to SVG signature
      drawSVGSignature(doc, sigX, sigY, sigLength)
    }
  } else {
    // Draw professional SVG signature curve
    drawSVGSignature(doc, sigX, sigY, sigLength)
  }
  
  // Add doctor name below signature
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(68, 68, 68) // #444
  let doctorSignatureName = cleanText(doctor?.fullName || doctor?.name || 'Monu')
  // Ensure "Dr." prefix if not present
  if (!doctorSignatureName.match(/^Dr\.?\s/i)) {
    doctorSignatureName = `Dr. ${doctorSignatureName}`
  }
  // Capitalize properly
  doctorSignatureName = doctorSignatureName.split(' ').map(word => {
    if (word.toLowerCase() === 'dr.' || word.toLowerCase() === 'dr') return 'Dr.'
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')
  doc.text(doctorSignatureName, sigX, y + 5)
  y += 12

  // Stamp section with professional stamp
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68) // #444
  doc.text('Stamp:', marginLeft + 5, y)
  
  // Draw professional stamp box
  const stampX = marginLeft + 28
  const stampY = y - 5
  const stampWidth = 52
  const stampHeight = 22
  
  // Try to add stamp image if available
  const stampImage = doctor?.stampImage || doctor?.stamp || null
  
  if (stampImage) {
    try {
      // Add stamp image
      doc.addImage(stampImage, 'PNG', stampX, stampY, stampWidth, stampHeight)
    } catch (error) {
      console.warn('Failed to add stamp image, using generated stamp:', error)
      drawProfessionalStamp(doc, stampX, stampY, stampWidth, stampHeight, doctor, PRIMARY_COLOR, ACCENT_COLOR, TEXT_MEDIUM, DEFAULT_HOSPITAL_NAME)
    }
  } else {
    // Generate professional stamp
    drawProfessionalStamp(doc, stampX, stampY, stampWidth, stampHeight, doctor, PRIMARY_COLOR, ACCENT_COLOR, TEXT_MEDIUM, DEFAULT_HOSPITAL_NAME)
  }
  
  y += 22

  // Output as base64 data URI string (matching the original format)
  const pdfBase64 = doc.output('datauristring')
  return pdfBase64
}

export default generateTraditionalPrescriptionPDF

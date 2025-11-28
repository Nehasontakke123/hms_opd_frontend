import jsPDF from 'jspdf'

const generateClinicPrescriptionPDF = (patient, doctor, prescription) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true
  })

  // Modern Clinic Theme Colors - Sky Blue & White
  const SKY_BLUE = [135, 206, 250] // #87CEFA - Soft sky blue
  const SKY_BLUE_DARK = [100, 181, 246] // #64B5F6 - Darker sky blue
  const SKY_BLUE_LIGHT = [173, 216, 230] // #ADD8E6 - Light sky blue
  const GOLD = [255, 215, 0] // #FFD700 - Gold for caduceus
  const GOLD_DARK = [218, 165, 32] // #DAA520 - Darker gold
  const TEXT_DARK = [26, 28, 32] // #1A1C20 - Dark text
  const TEXT_MEDIUM = [111, 116, 128] // #6F7480 - Medium gray
  const TEXT_LIGHT = [160, 166, 177] // #A0A6B1 - Light gray
  const BORDER_COLOR = [230, 233, 240] // #E6E9F0 - Light border
  const WHITE = [255, 255, 255] // White background

  // Default values
  const DEFAULT_CLINIC_NAME = 'Tekisky Hospital +'
  const DEFAULT_CLINIC_ADDRESS = 'Workshop Nanded'
  const DEFAULT_CLINIC_PHONE = '9359481880'
  const DEFAULT_CLINIC_TIMINGS = 'Morning 10 am to 3 pm | Evening 5 pm to 10 pm'

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

  // Page setup - A4 with safe margins
  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const margin = 12
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Fill white background
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // ========== HEADER SECTION ==========
  const headerHeight = 35
  const headerY = y

  // Soft sky-blue gradient background for header (simulated with light fill)
  doc.setFillColor(245, 250, 255) // Very light sky blue tint
  doc.rect(margin, headerY, contentWidth, headerHeight, 'F')

  // Left: Clinic Logo Area (placeholder - can be replaced with actual logo image)
  const logoSize = 20
  const logoX = margin + 5
  const logoY = headerY + 7.5
  
  // Draw a simple circular logo placeholder with sky blue
  doc.setFillColor(...SKY_BLUE_LIGHT)
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F')
  doc.setFillColor(...SKY_BLUE)
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 2, 'F')
  doc.setFillColor(...WHITE)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('+', logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: 'center' })

  // Center: Clinic Name
  const clinicName = cleanText(doctor?.clinicName || doctor?.hospitalName || DEFAULT_CLINIC_NAME)
  const clinicNameParts = clinicName.split(' ')
  const mainName = clinicNameParts[0] || clinicName
  const subName = clinicNameParts.slice(1).join(' ') || 'CLINIC'

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text(mainName, pageWidth / 2, headerY + 12, { align: 'center' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SKY_BLUE_DARK)
  doc.text(subName, pageWidth / 2, headerY + 18, { align: 'center' })

  // Right: Doctor Details
  const doctorX = pageWidth - margin - 70
  const doctorY = headerY + 8

  // Gold Caduceus Icon (simplified drawing)
  const caduceusX = doctorX + 55
  const caduceusY = doctorY
  doc.setFillColor(...GOLD)
  doc.setDrawColor(...GOLD_DARK)
  doc.setLineWidth(0.5)
  
  // Draw staff (vertical line)
  doc.line(caduceusX, caduceusY, caduceusX, caduceusY + 8)
  
  // Draw snakes (simplified as curves)
  doc.setDrawColor(...GOLD_DARK)
  doc.setLineWidth(0.3)
  // Left snake curve
  for (let i = 0; i < 8; i++) {
    const x = caduceusX - 1.5 + Math.sin(i * 0.5) * 1
    const y = caduceusY + i
    if (i > 0) doc.line(caduceusX - 1.5 + Math.sin((i-1) * 0.5) * 1, caduceusY + i - 1, x, y)
  }
  // Right snake curve
  for (let i = 0; i < 8; i++) {
    const x = caduceusX + 1.5 - Math.sin(i * 0.5) * 1
    const y = caduceusY + i
    if (i > 0) doc.line(caduceusX + 1.5 - Math.sin((i-1) * 0.5) * 1, caduceusY + i - 1, x, y)
  }
  
  // Draw wings (simplified)
  doc.setFillColor(...GOLD)
  doc.circle(caduceusX - 2, caduceusY, 1.5, 'F')
  doc.circle(caduceusX + 2, caduceusY, 1.5, 'F')

  // Doctor Name
  let doctorName = cleanText(doctor?.fullName || doctor?.name || 'Doctor')
  if (!doctorName.match(/^Dr\.?\s/i)) {
    doctorName = `Dr. ${doctorName}`
  }
  doctorName = doctorName.split(' ').map(word => {
    if (word.toLowerCase() === 'dr.' || word.toLowerCase() === 'dr') return 'Dr.'
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text(doctorName, doctorX, doctorY)

  // Qualification
  const qualification = cleanText(doctor?.qualification || 'MD')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text(qualification, doctorX, doctorY + 5)

  // Registration Number
  const regNo = cleanText(doctor?.registrationNo || doctor?.registrationNumber || 'REG-12345')
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_LIGHT)
  doc.text(`Regd. No. ${regNo}`, doctorX, doctorY + 9)

  // Header bottom border with sky blue accent
  doc.setDrawColor(...SKY_BLUE)
  doc.setLineWidth(1)
  doc.line(margin, headerY + headerHeight, pageWidth - margin, headerY + headerHeight)

  y = headerY + headerHeight + 8

  // ========== PATIENT DETAILS SECTION ==========
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Patient Details', margin, y)
  y += 6

  // Patient details in a clean grid
  const patientDetailsY = y
  const detailLabelWidth = 25
  const detailValueWidth = contentWidth - detailLabelWidth - 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)

  // Patient Name
  const patientName = cleanText(patient?.fullName || 'N/A')
  doc.text('Patient Name:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(patientName, margin + detailLabelWidth, y)
  y += 5

  // Age
  const age = cleanText(String(patient?.age || 'N/A'))
  doc.setFont('helvetica', 'normal')
  doc.text('Age:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(age, margin + detailLabelWidth, y)
  y += 5

  // Sex/Gender
  const gender = cleanText(patient?.gender || patient?.sex || 'N/A')
  doc.setFont('helvetica', 'normal')
  doc.text('Sex:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(gender, margin + detailLabelWidth, y)
  y += 5

  // Weight
  const weight = cleanText(patient?.weight ? `${patient.weight} kg` : 'N/A')
  doc.setFont('helvetica', 'normal')
  doc.text('Wt.:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(weight, margin + detailLabelWidth, y)
  y += 5

  // Date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  doc.setFont('helvetica', 'normal')
  doc.text('Date:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.text(today, margin + detailLabelWidth, y)
  y += 10

  // ========== PRESCRIPTION (Rx) ICON ==========
  // Large Rx symbol
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SKY_BLUE_DARK)
  doc.text('℞', margin + 10, y)
  y += 12

  // ========== STETHOSCOPE WATERMARK ==========
  // Draw a subtle stethoscope watermark in the background (using very light color for low opacity effect)
  const watermarkColor = [220, 235, 245] // Very light sky blue (simulates 12% opacity)
  doc.setDrawColor(...watermarkColor)
  doc.setFillColor(...watermarkColor)
  
  const stethoscopeX = pageWidth - margin - 40
  const stethoscopeY = y + 30
  
  // Draw stethoscope (simplified)
  // Earpieces (top)
  doc.circle(stethoscopeX - 5, stethoscopeY, 2, 'FD')
  doc.circle(stethoscopeX + 5, stethoscopeY, 2, 'FD')
  
  // Tubes (curved lines)
  doc.setLineWidth(1.5)
  doc.line(stethoscopeX - 5, stethoscopeY, stethoscopeX - 3, stethoscopeY + 15)
  doc.line(stethoscopeX + 5, stethoscopeY, stethoscopeX + 3, stethoscopeY + 15)
  doc.line(stethoscopeX - 3, stethoscopeY + 15, stethoscopeX, stethoscopeY + 20)
  doc.line(stethoscopeX + 3, stethoscopeY + 15, stethoscopeX, stethoscopeY + 20)
  
  // Chest piece (diaphragm)
  doc.circle(stethoscopeX, stethoscopeY + 25, 4, 'FD')
  doc.circle(stethoscopeX, stethoscopeY + 25, 2.5, 'S')
  
  // Reset to normal colors
  doc.setDrawColor(...BORDER_COLOR)
  doc.setFillColor(...WHITE)
  
  y += 5

  // ========== DIAGNOSIS SECTION ==========
  if (prescription.diagnosis) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Diagnosis:', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    const diagnosisText = cleanText(String(prescription.diagnosis))
    const diagnosisLines = doc.splitTextToSize(diagnosisText, contentWidth - 10)
    doc.text(diagnosisLines, margin + 5, y)
    y += diagnosisLines.length * 5 + 5
  }

  // ========== MEDICINES SECTION ==========
  if (prescription.medicines && prescription.medicines.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Prescribed Medicines:', margin, y)
    y += 6

    prescription.medicines.forEach((medicine, index) => {
      // Check if we need a new page
      if (y > 240) {
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

      // Medicine card with light background
      const cardHeight = 25
      doc.setFillColor(250, 252, 255) // Very light sky blue tint
      doc.setDrawColor(...BORDER_COLOR)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y - 4, contentWidth, cardHeight, 3, 3, 'FD')

      // Medicine number and name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_DARK)
      doc.text(`${medNum}. ${medName}`, margin + 5, y)

      // Dosage
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...TEXT_MEDIUM)
      doc.text(`Dosage: ${dosage}`, margin + 5, y + 5)

      // Duration
      doc.text(`Duration: ${duration}`, margin + 5, y + 10)

      // Instructions
      if (instructions && instructions !== 'As directed') {
        doc.text(`Instructions: ${instructions}`, margin + 5, y + 15)
        y += cardHeight + 3
      } else {
        y += cardHeight + 3
      }
    })
  }

  // ========== TESTS SECTION ==========
  y += 5
  if (prescription.selectedTests && prescription.selectedTests.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text('Tests Suggested:', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    const testsText = prescription.selectedTests.join(', ')
    const testsLines = doc.splitTextToSize(testsText, contentWidth - 10)
    doc.text(testsLines, margin + 5, y)
    y += testsLines.length * 5 + 5
  }

  // ========== NOTES/INSTRUCTIONS SECTION ==========
  if (prescription.notes && prescription.notes.trim()) {
    // Filter out test-related notes if tests section exists
    const notesText = cleanText(prescription.notes)
    if (!notesText.toLowerCase().includes('tests required')) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TEXT_DARK)
      doc.text('Additional Instructions:', margin, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_DARK)
      const notesLines = doc.splitTextToSize(notesText, contentWidth - 10)
      doc.text(notesLines, margin + 5, y)
      y += notesLines.length * 5 + 5
    }
  }

  // ========== FOOTER SECTION ==========
  const footerY = pageHeight - margin - 25

  // Divider line
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY, pageWidth - margin, footerY)
  y = footerY + 5

  // Clinic Address
  const clinicAddress = cleanText(doctor?.clinicAddress || doctor?.hospitalAddress || DEFAULT_CLINIC_ADDRESS)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text(clinicAddress, margin, y)

  // Clinic Timings
  const timings = cleanText(doctor?.clinicTimings || DEFAULT_CLINIC_TIMINGS)
  doc.setFontSize(8)
  doc.setTextColor(...SKY_BLUE_DARK)
  doc.text(`Time: ${timings}`, pageWidth / 2, y, { align: 'center' })

  // Contact Phone
  const phone = cleanText(doctor?.mobileNumber || doctor?.hospitalPhone || DEFAULT_CLINIC_PHONE)
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text(`Cell: ${phone}`, pageWidth - margin, y, { align: 'right' })

  y += 5

  // Pharmacy Information (if available)
  if (doctor?.pharmacyName) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_DARK)
    doc.text(cleanText(doctor.pharmacyName), pageWidth / 2, y, { align: 'center' })
  }

  // Doctor Signature Line
  y = pageHeight - margin - 8
  doc.setDrawColor(...TEXT_LIGHT)
  doc.setLineWidth(0.5)
  doc.line(margin, y, margin + 50, y)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  doc.text('Doctor Signature', margin, y + 4)

  // Date on right
  doc.text(`Date: ${today}`, pageWidth - margin, y + 4, { align: 'right' })

  // Output as base64 data URI string
  const pdfBase64 = doc.output('datauristring')
  return pdfBase64
}

export default generateClinicPrescriptionPDF


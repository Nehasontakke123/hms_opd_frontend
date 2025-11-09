import jsPDF from 'jspdf'

const generatePrescriptionPDF = (patient, doctor, prescription) => {
  const doc = new jsPDF()

  // Clean Modern UI Color Scheme - Purple Theme
  const PURPLE_HEADER = [124, 58, 237] // Purple header (violet-600)
  const PURPLE_DARK = [109, 40, 217] // Darker purple
  const CARD_BG = [249, 250, 251] // Light gray card background
  const CARD_BG_ALT = [243, 244, 246] // Alternate light gray
  const BORDER_COLOR = [229, 231, 235] // Light border
  const TEXT_LIGHT = [107, 114, 128] // Gray text
  const TEXT_MEDIUM = [75, 85, 99] // Medium gray
  const TEXT_DARK = [31, 41, 55] // Dark text
  const SECTION_BG = [249, 250, 251] // Section background
  const TABLE_HEADER_BG = [243, 244, 246] // Table header background

  // Page metrics - clean and compact
  const margin = 14
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2
  const cardRadius = 6 // Rounded corners
  const sectionSpacing = 10 // Spacing between sections

  // Purple Header - Clean Modern Design
  doc.setFillColor(...PURPLE_HEADER)
  doc.rect(0, 0, pageWidth, 32, 'F')
  
  // Hospital name - clean and bold
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Tekisky Hospital', pageWidth / 2, 14, { align: 'center' })
  
  // Subtitle
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(255, 255, 255)
  doc.text("Doctor's Prescription", pageWidth / 2, 22, { align: 'center' })

  // Content area - clean layout
  let y = 40
  
  // Equal width cards side by side
  const cardGap = 10
  const totalCardWidth = contentWidth - cardGap
  const patientCardW = totalCardWidth / 2
  const doctorCardW = totalCardWidth / 2
  const patientCardY = y
  const patientCardH = 45
  const doctorCardH = 50 // Increased to accommodate qualification
  
  // Patient Details Card - Light Gray Background
  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, patientCardY, patientCardW, patientCardH, cardRadius, cardRadius)
  doc.fillStroke()
  
  // Card title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Patient Details', margin + 8, patientCardY + 10)
  
  // Patient information - clean layout
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)
  
  // Name
  doc.text(`Name: ${String(patient.fullName || 'N/A')}`, margin + 8, patientCardY + 18)
  
  // Age, Token, and Mobile on one line
  const ageTokenMobile = `Age: ${String(patient.age || 'N/A')} Token: ${String(patient.tokenNumber || 'N/A')} Mobile: ${String(patient.mobileNumber || 'N/A')}`
  doc.text(ageTokenMobile, margin + 8, patientCardY + 26)
  
  // Issue
  doc.text(`Issue: ${String(patient.disease || 'N/A')}`, margin + 8, patientCardY + 34)

  // Doctor Card - Light Gray Background
  const doctorCardX = margin + patientCardW + cardGap
  
  // Card background
  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.roundedRect(doctorCardX, patientCardY, doctorCardW, doctorCardH, cardRadius, cardRadius)
  doc.fillStroke()
  
  // Card title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Doctor', doctorCardX + 8, patientCardY + 10)
  
  // Doctor information - clean layout
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)
  
  // Doctor name
  doc.text(String(doctor.fullName || 'Doctor'), doctorCardX + 8, patientCardY + 20)
  
  // Doctor qualification (if available) - positioned between name and specialization
  if (doctor?.qualification) {
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MEDIUM)
    doc.text(String(doctor.qualification), doctorCardX + 8, patientCardY + 27)
    
    // Specialization below qualification
    if (doctor?.specialization) {
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_DARK)
      doc.text(String(doctor.specialization), doctorCardX + 8, patientCardY + 35)
    }
  } else {
    // If no qualification, show specialization at original position
    if (doctor?.specialization) {
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_DARK)
      doc.text(String(doctor.specialization), doctorCardX + 8, patientCardY + 28)
    }
  }

  // Diagnosis Section - Clean Design
  y = patientCardY + patientCardH + sectionSpacing
  
  // Exclamation mark icon (square with !)
  const iconSize = 8
  doc.setFillColor(...PURPLE_HEADER)
  doc.roundedRect(margin, y, iconSize, iconSize, 2, 2)
  doc.fill()
  doc.setFontSize(6)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('!', margin + 4, y + 6)
  
  // Diagnosis heading
  doc.setFontSize(11)
  doc.setTextColor(...TEXT_DARK)
  doc.setFont('helvetica', 'bold')
  doc.text('Diagnosis', margin + 12, y + 7)
  
  // Helper function to clean text by removing emojis and problematic characters
  const cleanText = (text) => {
    if (!text) return text
    let cleaned = String(text)
    
    // Remove all emoji ranges comprehensively
    cleaned = cleaned
      // Remove all emoji ranges
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Miscellaneous Symbols and Pictographs
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map Symbols
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous Symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
      .replace(/[\u{200B}-\u{200D}]/gu, '') // Zero-width spaces and joiners
      .replace(/[\u{2060}-\u{206F}]/gu, '') // Word joiners
      .replace(/[\u{FEFF}]/gu, '') // Zero-width no-break space
      // Remove any remaining non-ASCII characters (keep only ASCII printable)
      .replace(/[^\x20-\x7E]/g, '')
      // Remove any corrupted character sequences
      .replace(/[Ø<B[\]]/g, '')
      .replace(/[^\x20-\x7E]/g, '') // Final pass to ensure only ASCII
      .trim()
    
    return cleaned
  }

  // Diagnosis text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)
  const diagnosisText = cleanText(String(prescription.diagnosis || 'N/A'))
  const diagnosisLines = doc.splitTextToSize(diagnosisText, contentWidth - 12)
  doc.text(diagnosisLines, margin, y + 16)
  
  y += 16 + Math.max(0, (diagnosisLines.length - 1) * 5) + sectionSpacing

  // Prescribed Medicines Section - Clean Design
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Prescribed Medicines', margin, y)
  y += 8

  // Medicine table with proper alignment and spacing
  const colMedW = contentWidth * 0.48
  const colDosW = contentWidth * 0.28
  const colDurW = contentWidth * 0.24
  const colMedX = margin
  const colDosX = margin + colMedW
  const colDurX = margin + colMedW + colDosW
  const tableStartY = y

  // Table header - Light Gray Background
  doc.setFillColor(...TABLE_HEADER_BG)
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  const headerHeight = 12
  
  // Header cells
  doc.roundedRect(colMedX, y, colMedW, headerHeight, 3, 3)
  doc.fillStroke()
  doc.roundedRect(colDosX, y, colDosW, headerHeight, 3, 3)
  doc.fillStroke()
  doc.roundedRect(colDurX, y, colDurW, headerHeight, 3, 3)
  doc.fillStroke()
  
  // Header text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Medicine', colMedX + 5, y + 8)
  doc.text('Dosage', colDosX + 5, y + 8)
  doc.text('Duration', colDurX + 5, y + 8)
  
  y += headerHeight

  // Table body rows with enhanced styling
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)
  
  prescription.medicines.forEach((m, idx) => {
    const medText = `${idx + 1}. ${cleanText(String(m.name || 'N/A'))}`
    const dosText = cleanText(String(m.dosage || 'N/A'))
    const durText = cleanText(String(m.duration || 'N/A'))
    
    const medLines = doc.splitTextToSize(medText, colMedW - 10)
    const dosLines = doc.splitTextToSize(dosText, colDosW - 10)
    const durLines = doc.splitTextToSize(durText, colDurW - 10)
    
    const rowHeight = Math.max(medLines.length, dosLines.length, durLines.length) * 5 + 10

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255)
    } else {
      doc.setFillColor(249, 250, 251)
    }
    doc.setDrawColor(...BORDER_COLOR)
    doc.setLineWidth(0.3)
    doc.rect(colMedX, y, colMedW, rowHeight, 'FD')
    doc.rect(colDosX, y, colDosW, rowHeight, 'FD')
    doc.rect(colDurX, y, colDurW, rowHeight, 'FD')

    // Cell text - clean and readable
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    doc.text(medLines, colMedX + 5, y + 6)
    doc.text(dosLines, colDosX + 5, y + 6)
    doc.text(durLines, colDurX + 5, y + 6)

    y += rowHeight
  })

  const inventoryItems = Array.isArray(prescription.inventoryItems) ? prescription.inventoryItems : []

  if (inventoryItems.length > 0) {
    y += sectionSpacing

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...TEXT_DARK)
    doc.text('Injections & Surgical Items', margin, y)
    y += 8

    inventoryItems.forEach((item, index) => {
      const nameText = cleanText(String(item.name || 'N/A'))
      const codeText = cleanText(String(item.code || ''))
      const usageText = cleanText(String(item.usage || ''))
      const doseText = cleanText(String(item.dosage || ''))

      const nameLines = doc.splitTextToSize(nameText, contentWidth - 20)
      const usageLines = usageText ? doc.splitTextToSize(`Usage: ${usageText}`, contentWidth - 24) : []
      const doseLines = doseText ? doc.splitTextToSize(`Recommended dose: ${doseText}`, contentWidth - 24) : []

      const linesCount = nameLines.length + usageLines.length + doseLines.length
      const cardHeight = 18 + Math.max(12, linesCount * 5)

      if (y + cardHeight > 260) {
        doc.addPage()
        y = margin
      }

      doc.setFillColor(...CARD_BG_ALT)
      doc.setDrawColor(...BORDER_COLOR)
      doc.setLineWidth(0.4)
      doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, 'FD')

      // Decorative accent line
      doc.setDrawColor(...PURPLE_HEADER)
      doc.setLineWidth(1.2)
      doc.line(margin, y, margin, y + cardHeight)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_DARK)
      doc.text(nameLines, margin + 8, y + 10)

      if (codeText) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...PURPLE_DARK)
        doc.text(codeText, margin + contentWidth - 25, y + 10, { align: 'right' })
      }

      let textY = y + 17
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_MEDIUM)

      if (usageLines.length > 0) {
        doc.text(usageLines, margin + 8, textY)
        textY += usageLines.length * 5
      }

      if (doseLines.length > 0) {
        doc.setTextColor(...PURPLE_DARK)
        doc.text(doseLines, margin + 8, textY)
      }

      y += cardHeight + 6
    })
  }

  // Notes section (if present) - Clean Design
  if (prescription.notes && prescription.notes.trim()) {
    y += sectionSpacing
    
    // Notes heading
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...TEXT_DARK)
    doc.text('Notes', margin, y + 6)
    
    // Notes text
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_DARK)
    const notesText = cleanText(String(prescription.notes))
    const notesLines = doc.splitTextToSize(notesText, contentWidth)
    doc.text(notesLines, margin, y + 14)
    y += 14 + notesLines.length * 5 + sectionSpacing
  }

  // Clean Footer
  const footerY = 280
  
  // Simple footer separator
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 20, pageWidth - margin, footerY - 20)
  
  // Doctor signature
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_DARK)
  doc.line(margin, footerY - 12, margin + 60, footerY - 12)
  doc.text('Doctor Signature', margin, footerY - 4)
  
  // Date
  const prescriptionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  doc.text(`Date: ${prescriptionDate}`, pageWidth - margin - 50, footerY - 4, { align: 'right' })
  
  // Footer text
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_LIGHT)
  doc.setFont('helvetica', 'italic')
  doc.text('Generated by Tekisky Hospital OPD System', pageWidth / 2, footerY + 3, { align: 'center' })
  
  // Disclaimer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(140, 140, 140)
  doc.text('This is a computer-generated prescription. For any urgent concern, contact the hospital.', pageWidth / 2, footerY + 8, { align: 'center' })

  // Output
  const pdfBase64 = doc.output('datauristring')
  return pdfBase64
}

export default generatePrescriptionPDF

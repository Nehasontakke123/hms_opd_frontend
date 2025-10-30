import jsPDF from 'jspdf'

const generatePrescriptionPDF = (patient, doctor, prescription) => {
  const doc = new jsPDF()

  // Colors to match UI (Tailwind purple-600 and subtle grays)
  const PURPLE = [124, 58, 237]
  const GRAY_BORDER = [229, 231, 235]
  const TEXT_LIGHT = [75, 85, 99]
  const TEXT_DARK = [31, 41, 55]

  // Page metrics
  const margin = 14
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2

  // Header bar
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageWidth, 26, 'F')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.setFont(undefined, 'bold')
  doc.text('Tekisky Hospital', pageWidth / 2, 10, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text("Doctor's Prescription", pageWidth / 2, 18, { align: 'center' })

  // Doctor card (right) and hospital tagline (left)
  doc.setTextColor(...TEXT_DARK)
  const topY = 32
  // Doctor card
  doc.setDrawColor(...GRAY_BORDER)
  doc.roundedRect(pageWidth - margin - 70, topY, 70, 22, 2, 2)
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text('Doctor', pageWidth - margin - 66, topY + 7)
  doc.setFont(undefined, 'normal')
  doc.text(`${doctor.fullName || 'Doctor'}`, pageWidth - margin - 66, topY + 13)
  if (doctor?.specialization) {
    doc.setTextColor(...TEXT_LIGHT)
    doc.text(`${doctor.specialization}`, pageWidth - margin - 66, topY + 18)
    doc.setTextColor(...TEXT_DARK)
  }

  // Patient details box
  const patientBoxY = topY
  const patientBoxH = 30
  doc.roundedRect(margin, patientBoxY, contentWidth - 76, patientBoxH, 2, 2)
  doc.setFont(undefined, 'bold')
  doc.text('Patient Details', margin + 4, patientBoxY + 7)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(...TEXT_LIGHT)
  doc.text(`Name: ${patient.fullName}`, margin + 4, patientBoxY + 14)
  doc.text(`Age: ${patient.age || 'N/A'}   Token: ${patient.tokenNumber}   Mobile: ${patient.mobileNumber || 'N/A'}`, margin + 4, patientBoxY + 20)
  doc.text(`Issue: ${patient.disease}`, margin + 4, patientBoxY + 26)
  doc.setTextColor(...TEXT_DARK)

  // Rx + Diagnosis
  let y = patientBoxY + patientBoxH + 10
  doc.setFont(undefined, 'bold')
  doc.setTextColor(...PURPLE)
  doc.setFontSize(14)
  doc.text('℞', margin, y)
  doc.setTextColor(...TEXT_DARK)
  doc.setFontSize(11)
  doc.text('Diagnosis', margin + 8, y)
  y += 6
  doc.setFont(undefined, 'normal')
  const diagnosisLines = doc.splitTextToSize(prescription.diagnosis || 'N/A', contentWidth)
  doc.text(diagnosisLines, margin, y)
  y += diagnosisLines.length * 6 + 6

  // Medicines table with precise columns and borders
  const colMedW = contentWidth * 0.5
  const colDosW = contentWidth * 0.28
  const colDurW = contentWidth * 0.22
  const colMedX = margin
  const colDosX = margin + colMedW
  const colDurX = margin + colMedW + colDosW

  // Header row
  doc.setFont(undefined, 'bold')
  doc.setFillColor(243, 244, 246)
  doc.setDrawColor(...GRAY_BORDER)
  doc.rect(colMedX, y, colMedW, 10, 'FD')
  doc.rect(colDosX, y, colDosW, 10, 'FD')
  doc.rect(colDurX, y, colDurW, 10, 'FD')
  doc.text('Medicine', colMedX + 3, y + 7)
  doc.text('Dosage', colDosX + 3, y + 7)
  doc.text('Duration', colDurX + 3, y + 7)
  y += 12

  // Body rows with wrapping and equal heights
  doc.setFont(undefined, 'normal')
  prescription.medicines.forEach((m, idx) => {
    const medLines = doc.splitTextToSize(`${idx + 1}. ${m.name}`, colMedW - 6)
    const dosLines = doc.splitTextToSize(`${m.dosage}`, colDosW - 6)
    const durLines = doc.splitTextToSize(`${m.duration}`, colDurW - 6)
    const rowHeight = Math.max(medLines.length, dosLines.length, durLines.length) * 6 + 6

    // Cell borders
    doc.setDrawColor(...GRAY_BORDER)
    doc.rect(colMedX, y - 2, colMedW, rowHeight, 'S')
    doc.rect(colDosX, y - 2, colDosW, rowHeight, 'S')
    doc.rect(colDurX, y - 2, colDurW, rowHeight, 'S')

    // Cell text
    doc.text(medLines, colMedX + 3, y + 2)
    doc.text(dosLines, colDosX + 3, y + 2)
    doc.text(durLines, colDurX + 3, y + 2)

    y += rowHeight
  })
  y += 6

  // Notes box
  if (prescription.notes) {
    doc.setFont(undefined, 'bold')
    doc.text('Notes', margin, y)
    y += 4
    doc.setFont(undefined, 'normal')
    const notesLines = doc.splitTextToSize(prescription.notes, contentWidth)
    doc.roundedRect(margin, y - 3, contentWidth, notesLines.length * 6 + 8, 2, 2)
    doc.text(notesLines, margin + 3, y + 4)
    y += notesLines.length * 6 + 12
  }

  // Footer: signature and date + disclaimer
  const footerY = 272
  doc.setDrawColor(...GRAY_BORDER)
  doc.line(margin, footerY - 14, margin + 50, footerY - 14)
  doc.setFont(undefined, 'normal')
  doc.text('Doctor Signature', margin, footerY - 8)
  const dateStr = new Date().toLocaleDateString()
  doc.text(`Date: ${dateStr}`, pageWidth - margin - 40, footerY - 8)
  doc.setTextColor(107, 114, 128)
  doc.setFontSize(9)
  doc.text('This is a computer-generated prescription. For any urgent concern, contact the hospital.', pageWidth / 2, footerY, { align: 'center' })
  doc.setTextColor(...TEXT_DARK)

  // Output
  const pdfBase64 = doc.output('datauristring')
  const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`
  doc.save(fileName)
  return pdfBase64
}

export default generatePrescriptionPDF

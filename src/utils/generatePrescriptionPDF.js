import jsPDF from 'jspdf'

const generatePrescriptionPDF = (patient, doctor, prescription) => {
  const doc = new jsPDF()
  
  // Hospital Header
  doc.setFontSize(20)
  doc.text('Tekisky Hospital', 105, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text('OPD Prescription', 105, 30, { align: 'center' })
  
  // Doctor Info
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('Doctor:', 20, 50)
  doc.setFont(undefined, 'normal')
  doc.text(`${doctor.fullName}`, 60, 50)
  
  if (doctor.specialization) {
    doc.text(`${doctor.specialization}`, 20, 58)
  }
  
  // Patient Info
  const patientInfoY = 75
  doc.setFont(undefined, 'bold')
  doc.text('Patient Information:', 20, patientInfoY)
  doc.setFont(undefined, 'normal')
  doc.text(`Name: ${patient.fullName}`, 20, patientInfoY + 8)
  doc.text(`Age: ${patient.age}`, 20, patientInfoY + 16)
  doc.text(`Token No: ${patient.tokenNumber}`, 20, patientInfoY + 24)
  doc.text(`Issue: ${patient.disease}`, 20, patientInfoY + 32)
  
  // Diagnosis
  let currentY = patientInfoY + 45
  doc.setFont(undefined, 'bold')
  doc.text('Diagnosis:', 20, currentY)
  doc.setFont(undefined, 'normal')
  const diagnosisLines = doc.splitTextToSize(prescription.diagnosis, 170)
  doc.text(diagnosisLines, 20, currentY + 8)
  
  currentY += diagnosisLines.length * 6 + 12
  
  // Medicines
  doc.setFont(undefined, 'bold')
  doc.text('Prescribed Medicines:', 20, currentY)
  currentY += 10
  
  prescription.medicines.forEach((medicine, index) => {
    doc.setFont(undefined, 'normal')
    doc.text(`${index + 1}. ${medicine.name}`, 25, currentY)
    doc.text(`   Dosage: ${medicine.dosage}`, 25, currentY + 6)
    doc.text(`   Duration: ${medicine.duration}`, 25, currentY + 12)
    currentY += 20
  })
  
  // Notes
  if (prescription.notes) {
    currentY += 5
    doc.setFont(undefined, 'bold')
    doc.text('Notes:', 20, currentY)
    doc.setFont(undefined, 'normal')
    const notesLines = doc.splitTextToSize(prescription.notes, 170)
    doc.text(notesLines, 20, currentY + 8)
    currentY += notesLines.length * 6 + 8
  }
  
  // Signature area
  const signatureY = 250
  doc.text('___________________', 20, signatureY)
  doc.text('Doctor Signature', 20, signatureY + 8)
  
  // Date
  const date = new Date().toLocaleDateString()
  doc.text(`Date: ${date}`, 150, signatureY + 8)
  
  // Generate PDF as base64 for backend storage
  const pdfBase64 = doc.output('datauristring')
  
  // Also download locally for doctor
  const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${date.replace(/\//g, '_')}.pdf`
  doc.save(fileName)
  
  // Return base64 string for backend upload
  return pdfBase64
}

export default generatePrescriptionPDF

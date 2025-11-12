import jsPDF from 'jspdf'

const generatePatientHistoryPDF = (patientInfo, medicalHistory) => {
  const doc = new jsPDF()
  
  // Color Scheme - Professional Medical Report
  const HEADER_COLOR = [124, 58, 237] // Purple header
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
  doc.text('Patient Medical History Report', pageWidth / 2, 25, { align: 'center' })
  
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
  
  // Patient Information Section
  doc.setFillColor(...SECTION_BG)
  doc.rect(margin, y, contentWidth, 35, 'F')
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(margin, y, contentWidth, 35, 'S')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text('Patient Information', margin + 2, y + 8)
  
  y += 12
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_MEDIUM)
  
  const patientName = patientInfo?.fullName || 'N/A'
  const patientAge = patientInfo?.age || 'N/A'
  const patientMobile = patientInfo?.mobileNumber || 'N/A'
  const patientAddress = patientInfo?.address || 'N/A'
  
  doc.text(`Name: ${patientName}`, margin + 3, y)
  doc.text(`Age: ${patientAge}`, margin + 3, y + 5)
  doc.text(`Mobile: ${patientMobile}`, margin + 3, y + 10)
  
  const addressLines = doc.splitTextToSize(`Address: ${patientAddress}`, contentWidth - 6)
  doc.text(addressLines, margin + 3, y + 15)
  
  y += 40
  
  // Summary Section
  doc.setFillColor(...SECTION_BG)
  doc.rect(margin, y, contentWidth, 15, 'F')
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(margin, y, contentWidth, 15, 'S')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text(`Total Visits: ${medicalHistory?.length || 0}`, margin + 3, y + 8)
  
  const totalPrescriptions = medicalHistory?.filter(visit => visit.prescription).length || 0
  doc.text(`Total Prescriptions: ${totalPrescriptions}`, margin + 70, y + 8)
  
  y += 20
  
  // Medical History Visits
  if (medicalHistory && medicalHistory.length > 0) {
    medicalHistory.forEach((visit, index) => {
      // Check if we need a new page
      if (y > pageHeight - 80) {
        doc.addPage()
        y = margin
      }
      
      // Visit Header
      doc.setFillColor(...HEADER_COLOR)
      doc.rect(margin, y, contentWidth, 12, 'F')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const visitDate = visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'N/A'
      doc.text(`Visit #${index + 1} - ${visitDate}`, margin + 2, y + 8)
      
      if (visit.tokenNumber) {
        doc.setFontSize(9)
        doc.text(`Token: #${visit.tokenNumber}`, pageWidth - margin - 30, y + 8)
      }
      
      y += 15
      
      // Visit Details Card
      doc.setFillColor(...SECTION_BG)
      doc.setDrawColor(...BORDER_COLOR)
      let cardHeight = 25
      
      // Doctor Information
      if (visit.doctor) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...TEXT_DARK)
        doc.text('Consulting Doctor:', margin + 2, y + 5)
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT_MEDIUM)
        const doctorInfo = `${visit.doctor.name || 'N/A'} - ${visit.doctor.specialization || 'N/A'}`
        doc.text(doctorInfo, margin + 2, y + 10)
        
        if (visit.doctor.qualification) {
          doc.text(`Qualification: ${visit.doctor.qualification}`, margin + 2, y + 15)
        }
        
        cardHeight = 20
        y += cardHeight + 2
      }
      
      // Disease/Issue
      if (visit.patientInfo?.disease) {
        doc.setFillColor(...SECTION_BG)
        doc.rect(margin, y, contentWidth, 12, 'F')
        doc.setDrawColor(...BORDER_COLOR)
        doc.rect(margin, y, contentWidth, 12, 'S')
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...TEXT_DARK)
        doc.text('Chief Complaint:', margin + 2, y + 5)
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT_MEDIUM)
        doc.text(visit.patientInfo.disease, margin + 2, y + 10)
        
        y += 15
      }
      
      // Vitals
      if (visit.vitals && (visit.vitals.bloodPressure || visit.vitals.sugarLevel)) {
        doc.setFillColor(...SECTION_BG)
        doc.rect(margin, y, contentWidth, 12, 'F')
        doc.setDrawColor(...BORDER_COLOR)
        doc.rect(margin, y, contentWidth, 12, 'S')
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...TEXT_DARK)
        doc.text('Vitals:', margin + 2, y + 5)
        
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT_MEDIUM)
        const vitals = []
        if (visit.vitals.bloodPressure) vitals.push(`BP: ${visit.vitals.bloodPressure}`)
        if (visit.vitals.sugarLevel) vitals.push(`Sugar: ${visit.vitals.sugarLevel}`)
        doc.text(vitals.join(' | ') || 'N/A', margin + 2, y + 10)
        
        y += 15
      }
      
      // Prescription Details
      if (visit.prescription) {
        const prescription = visit.prescription
        
        // Diagnosis
        if (prescription.diagnosis) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const diagnosisLines = doc.splitTextToSize(prescription.diagnosis, contentWidth - 6)
          const diagnosisHeight = Math.max(15, 10 + (diagnosisLines.length * 5))
          
          // Draw background first
          doc.setFillColor(...SECTION_BG)
          doc.rect(margin, y, contentWidth, diagnosisHeight, 'F')
          doc.setDrawColor(...BORDER_COLOR)
          doc.rect(margin, y, contentWidth, diagnosisHeight, 'S')
          
          // Then draw text on top
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...TEXT_DARK)
          doc.text('Diagnosis:', margin + 2, y + 5)
          
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...TEXT_MEDIUM)
          doc.text(diagnosisLines, margin + 2, y + 10)
          
          y += diagnosisHeight + 2
        }
        
        // Medicines
        if (prescription.medicines && prescription.medicines.length > 0) {
          doc.setFillColor(...SECTION_BG)
          let medicineHeight = 15 + (prescription.medicines.length * 8)
          doc.rect(margin, y, contentWidth, medicineHeight, 'F')
          doc.setDrawColor(...BORDER_COLOR)
          doc.rect(margin, y, contentWidth, medicineHeight, 'S')
          
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...TEXT_DARK)
          doc.text('Prescribed Medicines:', margin + 2, y + 5)
          
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...TEXT_MEDIUM)
          let medicineY = y + 10
          
          prescription.medicines.forEach((medicine, medIndex) => {
            const medicineText = `${medIndex + 1}. ${medicine.name || 'N/A'}`
            const dosageText = medicine.dosage ? ` - ${medicine.dosage}` : ''
            doc.text(medicineText + dosageText, margin + 4, medicineY)
            medicineY += 6
          })
          
          y += medicineHeight + 2
        }
        
        // Inventory Items (Injections/Surgical)
        if (prescription.inventoryItems && prescription.inventoryItems.length > 0) {
          doc.setFillColor(...SECTION_BG)
          let inventoryHeight = 15 + (prescription.inventoryItems.length * 8)
          doc.rect(margin, y, contentWidth, inventoryHeight, 'F')
          doc.setDrawColor(...BORDER_COLOR)
          doc.rect(margin, y, contentWidth, inventoryHeight, 'S')
          
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...TEXT_DARK)
          doc.text('Injections / Surgical Items:', margin + 2, y + 5)
          
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...TEXT_MEDIUM)
          let inventoryY = y + 10
          
          prescription.inventoryItems.forEach((item, itemIndex) => {
            const itemText = `${itemIndex + 1}. ${item.name || 'N/A'}`
            const usageText = item.usage ? ` - ${item.usage}` : ''
            const dosageText = item.dosage ? ` (${item.dosage})` : ''
            doc.text(itemText + usageText + dosageText, margin + 4, inventoryY)
            inventoryY += 6
          })
          
          y += inventoryHeight + 2
        }
        
        // Doctor Notes
        if (prescription.notes) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const notesLines = doc.splitTextToSize(prescription.notes, contentWidth - 6)
          const notesHeight = Math.max(15, 10 + (notesLines.length * 5))
          
          // Draw background first
          doc.setFillColor(...SECTION_BG)
          doc.rect(margin, y, contentWidth, notesHeight, 'F')
          doc.setDrawColor(...BORDER_COLOR)
          doc.rect(margin, y, contentWidth, notesHeight, 'S')
          
          // Then draw text on top
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...TEXT_DARK)
          doc.text('Doctor Notes:', margin + 2, y + 5)
          
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...TEXT_MEDIUM)
          doc.text(notesLines, margin + 2, y + 10)
          
          y += notesHeight + 2
        }
      }
      
      // Visit Status
      if (visit.visitDetails) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...TEXT_LIGHT)
        const status = visit.visitDetails.status || 'N/A'
        doc.text(`Status: ${status}`, margin + 2, y + 3)
        
        if (visit.visitDetails.isRecheck) {
          doc.text('(Recheck-up Visit)', margin + 50, y + 3)
        }
      }
      
      y += 8
      
      // Separator line between visits
      if (index < medicalHistory.length - 1) {
        doc.setDrawColor(...BORDER_COLOR)
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 5
      }
    })
  } else {
    // No medical history
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_MEDIUM)
    doc.text('No medical history available for this patient.', margin + 2, y + 5)
  }
  
  // Footer on each page - set after all content is added
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...TEXT_LIGHT)
    const pageText = totalPages > 1 
      ? `Page ${i} of ${totalPages} - Tekisky Hospital Patient Medical History Report`
      : 'Tekisky Hospital Patient Medical History Report'
    doc.text(
      pageText,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }
  
  // Output
  const pdfBase64 = doc.output('datauristring')
  return pdfBase64
}

export default generatePatientHistoryPDF


import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generateTraditionalPrescriptionPDF from '../utils/generateTraditionalPrescriptionPDF'

const MedicalHistoryModal = ({ isOpen, onClose, patientId, patientName, patientMobile, isRecheck, currentPatient, user }) => {
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('fullName')
  const [expandedCards, setExpandedCards] = useState({})
  const [isClosing, setIsClosing] = useState(false)

  const getCurrentVisitDateTime = () => {
    if (!currentPatient) return null
    const dateValue = currentPatient.registrationDate || currentPatient.createdAt
    if (!dateValue) return null
    const parsedDate = new Date(dateValue)
    if (Number.isNaN(parsedDate.getTime())) return null
    return {
      dateLabel: parsedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      timeLabel: parsedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getFrequencyLabel = (medicine = {}) => {
    if (!medicine) return '—'
    const normalizePattern = (pattern) => {
      if (!pattern) return null
      const cleaned = pattern.replace(/\s+/g, '').replace(/,/g, '-')
      if (/^[0-9]-[0-9]-[0-9]$/.test(cleaned)) {
        return cleaned
      }
      return null
    }

    const directPattern =
      normalizePattern(medicine.frequencyPattern) || normalizePattern(medicine.frequency)
    if (directPattern) return directPattern

    if (medicine.times) {
      const morning = medicine.times.morning ? 1 : 0
      const afternoon = medicine.times.afternoon ? 1 : 0
      const night = medicine.times.night ? 1 : 0
      if (morning || afternoon || night) {
        return `${morning}-${afternoon}-${night}`
      }
    }

    if (medicine.dosage) {
      const text = medicine.dosage.toLowerCase()
      const hasMorning = text.includes('morning')
      const hasAfternoon = text.includes('afternoon')
      const hasNight = text.includes('night')
      if (hasMorning || hasAfternoon || hasNight) {
        return `${hasMorning ? 1 : 0}-${hasAfternoon ? 1 : 0}-${hasNight ? 1 : 0}`
      }
    }

    return '—'
  }

  const normalizeHistoryRecords = (records = []) =>
    records
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.visitDate || b.registrationDate || 0).getTime() -
          new Date(a.visitDate || a.registrationDate || 0).getTime()
      )

  const mergeHistoryResponses = (primaryData, fallbackData) => {
    const combined = []
    if (primaryData?.medicalHistory) combined.push(...primaryData.medicalHistory)
    if (fallbackData?.medicalHistory) combined.push(...fallbackData.medicalHistory)

    const uniqueMap = new Map()
    combined.forEach((record) => {
      const keyParts = [
        record.patientId || '',
        record.visitDate || record.registrationDate || '',
        record.tokenNumber || ''
      ]
      const mapKey = keyParts.join('|')
      if (!uniqueMap.has(mapKey)) {
        uniqueMap.set(mapKey, record)
      }
    })

    const mergedHistory = normalizeHistoryRecords(Array.from(uniqueMap.values()))
    const patientInfo = primaryData?.patientInfo || fallbackData?.patientInfo || null

    return {
      patientInfo,
      medicalHistory: mergedHistory,
      totalVisits: mergedHistory.length
    }
  }

  const requestHistoryData = async (params) => {
    if (!params || Object.keys(params).length === 0) return null
    try {
      const response = await api.get('/prescription/medical-history', { params })
      return response.data.data
    } catch (error) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (patientId) {
        fetchMedicalHistory(null, null, patientId)
      } else if (patientName) {
        setSearchQuery(patientName)
        setSearchType('fullName')
      } else if (patientMobile) {
        setSearchQuery(patientMobile)
        setSearchType('mobileNumber')
      }
      setExpandedCards({})
    }
  }, [isOpen, patientId, patientName, patientMobile])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  const fetchMedicalHistory = async (name, mobile, id) => {
    setLoading(true)
    try {
      const params = {}
      if (id) {
        params.patientId = id
      } else if (mobile) {
        params.mobileNumber = mobile
      } else if (name) {
        params.fullName = name
      }

      let historyData = Object.keys(params).length ? await requestHistoryData(params) : null

      const fallbackMobile = currentPatient?.mobileNumber?.trim() || patientMobile?.trim()
      if ((!historyData || historyData.totalVisits <= 1) && fallbackMobile) {
        const fallbackData = await requestHistoryData({ mobileNumber: fallbackMobile })
        if (fallbackData) {
          historyData = mergeHistoryResponses(historyData, fallbackData)
        } else if (!historyData) {
          historyData = fallbackData
        }
      }

      if (!historyData) {
        toast.error('No medical history found for this patient')
        setMedicalHistory(null)
        setExpandedCards({})
        return
      }

      setMedicalHistory(historyData)
      if (historyData?.medicalHistory?.length) {
        setExpandedCards({ 0: true })
      } else {
        setExpandedCards({})
      }
    } catch (error) {
      console.error('Error fetching medical history:', error)
      toast.error('Failed to fetch medical history')
      setMedicalHistory(null)
      setExpandedCards({})
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter search criteria')
      return
    }

    if (searchType === 'fullName') {
      fetchMedicalHistory(searchQuery, null, null)
    } else if (searchType === 'mobileNumber') {
      fetchMedicalHistory(null, searchQuery, null)
    } else if (searchType === 'patientId') {
      fetchMedicalHistory(null, null, searchQuery)
    }
  }

  const toggleCard = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePrintPDF = () => {
    if (!currentPatient || !currentPatient.prescription) {
      toast.error('No prescription available for this patient')
      return
    }

    try {
      // Get doctor information from user prop or currentPatient
      const doctorInfo = user ? {
        fullName: user.fullName,
        qualification: user.qualification,
        specialization: user.specialization,
        mobileNumber: user.mobileNumber,
        clinicAddress: user.clinicAddress,
        hospitalName: user.hospitalName || user.clinicName,
        hospitalAddress: user.hospitalAddress || user.clinicAddress,
        hospitalPhone: user.hospitalPhone || user.mobileNumber,
        hospitalEmail: user.hospitalEmail || user.email,
        registrationNo: user.registrationNo || user.registrationNumber,
        signatureImage: user.signatureImage,
        stampImage: user.stampImage
      } : {
        fullName: currentPatient.doctor?.fullName || currentPatient.doctor?.name || 'Doctor',
        qualification: currentPatient.doctor?.qualification || 'MD',
        specialization: currentPatient.doctor?.specialization,
        mobileNumber: currentPatient.doctor?.mobileNumber || '9359481880',
        clinicAddress: currentPatient.doctor?.clinicAddress || 'WorkshopNanded',
        hospitalName: currentPatient.doctor?.hospitalName || currentPatient.doctor?.clinicName || 'Tekisky Hospital',
        hospitalAddress: currentPatient.doctor?.hospitalAddress || currentPatient.doctor?.clinicAddress || 'WorkshopNanded',
        hospitalPhone: currentPatient.doctor?.hospitalPhone || currentPatient.doctor?.mobileNumber || '9359481880',
        hospitalEmail: currentPatient.doctor?.hospitalEmail || currentPatient.doctor?.email || 'monu@gmail.com',
        registrationNo: currentPatient.doctor?.registrationNo || currentPatient.doctor?.registrationNumber || 'REG-12345'
      }

      // Generate PDF using the traditional prescription format
      const pdfBase64 = generateTraditionalPrescriptionPDF(
        currentPatient,
        doctorInfo,
        currentPatient.prescription
      )

      // Create a blob from base64
      const byteCharacters = atob(pdfBase64.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })

      // Open PDF in new window for printing
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')

      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
          }, 500)
        }
      } else {
        // Fallback: Download PDF
        const link = document.createElement('a')
        link.href = url
        link.download = `Prescription_${currentPatient.fullName || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('PDF downloaded. Please open and print it.')
      }
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`medical-history-backdrop ${isClosing ? 'backdrop-closing' : 'backdrop-opening'}`}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className={`medical-history-container ${isClosing ? 'modal-closing' : 'modal-opening'}`}>
        <div className="medical-history-modal">
          {/* Header with Gradient */}
          <div className={`medical-history-header ${isClosing ? '' : 'header-slide'}`}>
            <div className="header-content">
              <div className="header-left">
                <h2 className="header-title">Medical History</h2>
                {medicalHistory?.patientInfo && (
                  <div className="header-subtitle">
                    <span>{medicalHistory.patientInfo.fullName} • {medicalHistory.totalVisits} {medicalHistory.totalVisits === 1 ? 'visit' : 'visits'}</span>
                    {medicalHistory.patientInfo?.patientId && (
                      <span className="patient-id-badge">ID: {medicalHistory.patientInfo.patientId}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="header-right-actions">
                {currentPatient?.prescription && (
                  <button
                    onClick={handlePrintPDF}
                    className="print-pdf-button"
                    aria-label="Print Prescription PDF"
                    title="Print Prescription PDF"
                  >
                    <svg className="print-pdf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print PDF</span>
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="close-button"
                  aria-label="Close modal"
                >
                  <svg className="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Search Section */}
          {!patientId && (
            <div className="search-section">
              <div className="search-controls">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="search-select"
                >
                  <option value="fullName">Name</option>
                  <option value="mobileNumber">Mobile Number</option>
                  <option value="patientId">Patient ID</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={`Enter patient ${searchType === 'fullName' ? 'name' : searchType === 'mobileNumber' ? 'mobile' : 'ID'}`}
                  className="search-input"
                />
                <button
                  onClick={handleSearch}
                  className="search-button"
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Content Area with Smooth Scrollbar */}
          <div className="modal-content">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
              </div>
            ) : medicalHistory && medicalHistory.medicalHistory && medicalHistory.medicalHistory.length > 0 ? (
              <div className="content-wrapper">
                {/* Patient Information Card */}
                {medicalHistory.patientInfo && (
                  <div className="info-card patient-info-card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Patient Information
                      </h3>
                      {medicalHistory.patientInfo?.patientId && (
                        <span className="info-badge">{medicalHistory.patientInfo.patientId}</span>
                      )}
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">NAME</span>
                        <p className="info-value">{medicalHistory.patientInfo.fullName}</p>
                      </div>
                      <div className="info-item">
                        <span className="info-label">MOBILE</span>
                        <p className="info-value">{medicalHistory.patientInfo.mobileNumber}</p>
                      </div>
                      <div className="info-item">
                        <span className="info-label">AGE</span>
                        <p className="info-value">{medicalHistory.patientInfo.age} years</p>
                      </div>
                      <div className="info-item">
                        <span className="info-label">GENDER</span>
                        <p className="info-value">{medicalHistory.patientInfo.gender || 'N/A'}</p>
                      </div>
                      <div className="info-item full-width">
                        <span className="info-label">ADDRESS</span>
                        <p className="info-value">{medicalHistory.patientInfo.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Today's Prescribed Medicines */}
                {currentPatient?.prescription && (
                  <div className="info-card today-prescription-card">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">
                          <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          TODAY'S PRESCRIBED MEDICINES
                        </h3>
                        <p className="card-description">
                          Automatically showing the tablets/equipment planned for the current visit so you can compare with prior visits.
                        </p>
                      </div>
                      <div className="visit-meta">
                        {(() => {
                          const visitMeta = getCurrentVisitDateTime()
                          return visitMeta ? (
                            <>
                              <span className="meta-badge">{visitMeta.dateLabel}</span>
                              <span className="meta-badge">{visitMeta.timeLabel}</span>
                            </>
                          ) : null
                        })()}
                        {currentPatient.tokenNumber && (
                          <span className="meta-badge token-badge">Token #{currentPatient.tokenNumber.toString().padStart(2, '0')}</span>
                        )}
                      </div>
                    </div>

                    {/* Medicines Table */}
                    {currentPatient.prescription.medicines?.length ? (
                      <div className="medicines-section">
                        <div className="section-label">TABLETS & SYRUPS</div>
                        <div className="table-wrapper">
                          <table className="medicines-table">
                            <thead>
                              <tr>
                                <th>Medicine</th>
                                <th>Dosage</th>
                                <th>Frequency</th>
                                <th>Duration</th>
                                <th>Instructions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentPatient.prescription.medicines.map((med, idx) => (
                                <tr key={`current-med-${idx}`}>
                                  <td className="medicine-name">{med.name || 'Not recorded'}</td>
                                  <td>{med.dosage || '—'}</td>
                                  <td>
                                    <span className="frequency-badge">{getFrequencyLabel(med)}</span>
                                  </td>
                                  <td>{med.duration || '—'}</td>
                                  <td>{med.dosageInstructions || med.dosageNotes || 'No instructions'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">No medicines have been added for this visit yet.</div>
                    )}

                    {/* Injections & Surgical Items */}
                    {currentPatient.prescription.inventoryItems?.length > 0 && (
                      <div className="injections-section">
                        <div className="section-label">INJECTIONS & SURGICAL ITEMS</div>
                        <div className="injections-list">
                          {currentPatient.prescription.inventoryItems.map((item, idx) => (
                            <div key={`current-inv-${idx}`} className="injection-item">
                              <span className="injection-name">{item.name}</span>
                              <span className="injection-details">
                                {[item.dosage, item.usage].filter(Boolean).join(' • ') || 'Usage not recorded'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Doctor Notes */}
                    {currentPatient.prescription.notes && (
                      <div className="notes-section">
                        <div className="section-label">DOCTOR NOTES / INSTRUCTIONS</div>
                        <p className="notes-text">{currentPatient.prescription.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete Visit History - All Previous Visits */}
                {medicalHistory.medicalHistory && medicalHistory.medicalHistory.length > 0 && (
                  <div className="visit-history-section">
                    <h3 className="section-title">Complete Visit History</h3>
                    <div className="visits-timeline">
                      {medicalHistory.medicalHistory
                        .filter((visit) => {
                          // Exclude current visit if it's already shown above
                          if (currentPatient && visit.patientId === currentPatient._id) {
                            const visitDate = new Date(visit.visitDate || visit.registrationDate || 0)
                            const currentDate = new Date(currentPatient.registrationDate || currentPatient.createdAt || 0)
                            return visitDate.getTime() !== currentDate.getTime()
                          }
                          return true
                        })
                        .map((visit, index) => {
                          const visitDate = new Date(visit.visitDate || visit.registrationDate)
                          const dateLabel = visitDate.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                          const timeLabel = visitDate.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                          const tokenDisplay = visit.tokenNumber ? `Token #${visit.tokenNumber.toString().padStart(2, '0')}` : null
                          const isExpanded = expandedCards[index] || false
                          
                          return (
                            <div key={index} className="visit-history-card">
                              <div 
                                className="visit-card-header"
                                onClick={() => toggleCard(index)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    toggleCard(index)
                                  }
                                }}
                              >
                                <div className="visit-header-info">
                                  <div className="visit-date-info">
                                    <span className="visit-date">{dateLabel}</span>
                                    <span className="visit-separator">—</span>
                                    <span className="visit-time">{timeLabel}</span>
                                  </div>
                                  {tokenDisplay && <span className="visit-token-badge">{tokenDisplay}</span>}
                                </div>
                                <div className="visit-header-meta">
                                  {visit.visitDetails?.status && (
                                    <span className={`status-badge ${visit.visitDetails.status}`}>
                                      {visit.visitDetails.status === 'completed' ? 'Completed' : visit.visitDetails.status === 'in-progress' ? 'In Progress' : 'Waiting'}
                                    </span>
                                  )}
                                  {visit.visitDetails?.feeStatus && visit.visitDetails.feeStatus !== 'not_required' && (
                                    <span className={`fee-status-badge ${visit.visitDetails.feeStatus}`}>
                                      {visit.visitDetails.feeStatus === 'paid' ? '✓ Paid' : 'Pending'}
                                    </span>
                                  )}
                                  {visit.visitDetails?.isRecheck && (
                                    <span className="recheck-badge">🔄 Recheck</span>
                                  )}
                                </div>
                                <svg 
                                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              
                              {isExpanded && (
                                <div className="visit-card-content">
                                  {/* Diagnosis */}
                                  {visit.patientInfo?.disease && (
                                    <div className="visit-field">
                                      <span className="field-label">Diagnosis</span>
                                      <span className="field-value">{visit.patientInfo.disease}</span>
                                    </div>
                                  )}

                                  {/* Vitals */}
                                  {(visit.vitals?.bloodPressure || visit.vitals?.sugarLevel) && (
                                    <div className="visit-field-group">
                                      {visit.vitals.bloodPressure && (
                                        <div className="visit-field">
                                          <span className="field-label">Blood Pressure</span>
                                          <span className="field-value">{visit.vitals.bloodPressure}</span>
                                        </div>
                                      )}
                                      {visit.vitals.sugarLevel && (
                                        <div className="visit-field">
                                          <span className="field-label">Sugar Level</span>
                                          <span className="field-value">{visit.vitals.sugarLevel} mg/dL</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Prescription Medicines */}
                                  {visit.prescription?.medicines && visit.prescription.medicines.length > 0 && (
                                    <div className="prescription-section">
                                      <div className="section-label">Prescribed Medicines</div>
                                      <div className="table-wrapper">
                                        <table className="medicines-table">
                                          <thead>
                                            <tr>
                                              <th>Medicine</th>
                                              <th>Dosage</th>
                                              <th>Frequency</th>
                                              <th>Duration</th>
                                              <th>Instructions</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {visit.prescription.medicines.map((med, medIdx) => (
                                              <tr key={medIdx}>
                                                <td className="medicine-name">{med.name || 'Not recorded'}</td>
                                                <td>{med.dosage || getFrequencyLabel(med) || '—'}</td>
                                                <td>
                                                  <span className="frequency-badge">{getFrequencyLabel(med)}</span>
                                                </td>
                                                <td>{med.duration || '—'}</td>
                                                <td>{med.dosageInstructions || med.dosageNotes || 'No instructions'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Inventory Items */}
                                  {visit.prescription?.inventoryItems && visit.prescription.inventoryItems.length > 0 && (
                                    <div className="inventory-section">
                                      <div className="section-label">Injections & Surgical Items</div>
                                      <div className="injections-list">
                                        {visit.prescription.inventoryItems.map((item, itemIdx) => (
                                          <div key={itemIdx} className="injection-item">
                                            <span className="injection-name">{item.name}</span>
                                            <span className="injection-details">
                                              {[item.dosage, item.usage].filter(Boolean).join(' • ') || 'Usage not recorded'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Doctor Notes */}
                                  {visit.prescription?.notes && (
                                    <div className="notes-section">
                                      <div className="section-label">Doctor Notes / Instructions</div>
                                      <p className="notes-text">{visit.prescription.notes}</p>
                                    </div>
                                  )}

                                  {/* Tests Required */}
                                  {visit.prescription?.selectedTests && visit.prescription.selectedTests.length > 0 && (
                                    <div className="tests-section">
                                      <div className="section-label">Tests Required</div>
                                      <div className="tests-list">
                                        {visit.prescription.selectedTests.map((test, testIdx) => (
                                          <span key={testIdx} className="test-item">
                                            {typeof test === 'string' ? test : test.name || test}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Doctor Information */}
                                  {visit.doctor && (
                                    <div className="doctor-section">
                                      <div className="section-label">Consulting Doctor</div>
                                      <div className="doctor-info">
                                        <span className="doctor-name">{visit.doctor.name}</span>
                                        {visit.doctor.specialization && (
                                          <span className="doctor-specialization">{visit.doctor.specialization}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-history">
                <p className="empty-title">No medical history found</p>
                <p className="empty-subtitle">Search for a patient to view their medical records</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        /* Backdrop */
        .medical-history-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 50;
        }

        .backdrop-opening {
          animation: backdropFadeIn 0.3s ease-out forwards;
        }

        .backdrop-closing {
          animation: backdropFadeOut 0.3s ease-in forwards;
        }

        /* Modal Container */
        .medical-history-container {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .medical-history-container {
            align-items: flex-end;
            padding: 0;
          }
        }

        .modal-opening {
          animation: modalFadeIn 0.3s ease-out forwards;
        }

        .modal-closing {
          animation: modalFadeOut 0.3s ease-in forwards;
        }

        /* Modal Card */
        .medical-history-modal {
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          animation: popupScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform: scale(0.92);
          opacity: 0;
          overflow: hidden;
        }
        
        /* Ensure header content is never clipped */
        .medical-history-modal > .medical-history-header {
          overflow: visible;
          position: relative;
          z-index: 10;
        }

        @media (max-width: 768px) {
          .medical-history-modal {
            animation: none;
            transform: translateY(100%);
            opacity: 0;
          }
        }

        /* Header with Gradient */
        .medical-history-header {
          background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
          padding: 1.5rem 2rem;
          position: relative;
          overflow: visible;
        }

        .medical-history-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
          pointer-events: none;
        }

        .header-slide {
          animation: headerSlideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
          width: 100%;
          min-width: 0;
        }

        .header-left {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .header-right-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
          margin-left: auto;
          min-width: fit-content;
          position: relative;
          z-index: 2;
        }
        
        /* Ensure Print PDF button is always fully visible */
        .header-right-actions .print-pdf-button {
          visibility: visible;
          opacity: 1;
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #FFFFFF;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.95);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .patient-id-badge {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* Close Button */
        .close-button {
          width: 2rem;
          height: 2rem;
          min-width: 2rem;
          min-height: 2rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }

        .close-button:active {
          transform: scale(0.95);
        }

        .close-icon {
          width: 1rem;
          height: 1rem;
          display: block;
          margin: 0;
          padding: 0;
          flex-shrink: 0;
          pointer-events: none;
        }

        /* Print PDF Button */
        .print-pdf-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          height: 2.5rem;
          white-space: nowrap;
          flex-shrink: 0;
          min-width: fit-content;
        }

        .print-pdf-button:hover {
          background: rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .print-pdf-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }

        .print-pdf-icon {
          width: 1rem;
          height: 1rem;
          opacity: 0.9;
          flex-shrink: 0;
        }

        /* Search Section */
        .search-section {
          padding: 1.25rem 2rem;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        .search-controls {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .search-select,
        .search-input {
          padding: 0.625rem 1rem;
          border: 1px solid #D1D5DB;
          border-radius: 10px;
          font-size: 0.9375rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .search-select {
          min-width: 140px;
        }

        .search-select:focus,
        .search-input:focus {
          border-color: #3B82F6;
          ring: 2px;
          ring-color: rgba(59, 130, 246, 0.2);
        }

        .search-input {
          flex: 1;
          min-width: 200px;
        }

        .search-button {
          padding: 0.625rem 1.5rem;
          background: #3B82F6;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .search-button:hover {
          background: #2563EB;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Content Area */
        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          min-height: 0;
        }

        .modal-content::-webkit-scrollbar {
          width: 8px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 4px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 4rem 2rem;
        }

        .spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid #E5E7EB;
          border-top-color: #3B82F6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Content Wrapper */
        .content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Info Cards */
        .info-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .patient-info-card {
          background: linear-gradient(to bottom right, #EFF6FF, #F3E8FF);
          border-color: #C7D2FE;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
          gap: 1rem;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: #1F2937;
        }

        .card-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #3B82F6;
        }

        .card-description {
          font-size: 0.8125rem;
          color: #6B7280;
          margin-top: 0.375rem;
        }

        .info-badge {
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          color: #FFFFFF;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .info-item {
          background: #FFFFFF;
          padding: 0.875rem;
          border-radius: 10px;
          border: 1px solid #E5E7EB;
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .info-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.375rem;
        }

        .info-value {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1F2937;
          word-break: break-word;
        }

        /* Visit Meta */
        .visit-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-badge {
          background: #F3F4F6;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
          border: 1px solid #E5E7EB;
        }

        .token-badge {
          background: #DBEAFE;
          color: #1E40AF;
          border-color: #93C5FD;
        }

        /* Medicines Section */
        .medicines-section {
          margin-top: 1.5rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.75rem;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
        }

        .medicines-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .medicines-table thead {
          background: #F9FAFB;
        }

        .medicines-table th {
          padding: 0.875rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #E5E7EB;
        }

        .medicines-table tbody tr {
          border-bottom: 1px solid #F3F4F6;
          transition: background 0.2s ease;
        }

        .medicines-table tbody tr:hover {
          background: #F9FAFB;
        }

        .medicines-table td {
          padding: 0.875rem 1rem;
          color: #1F2937;
        }

        .medicine-name {
          font-weight: 600;
        }

        .frequency-badge {
          background: #DBEAFE;
          color: #1E40AF;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        /* Injections Section */
        .injections-section {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 12px;
        }

        .injections-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .injection-item {
          background: #FFFFFF;
          padding: 0.875rem;
          border-radius: 8px;
          border: 1px solid #D1FAE5;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .injection-name {
          font-weight: 600;
          color: #065F46;
        }

        .injection-details {
          font-size: 0.8125rem;
          color: #047857;
        }

        /* Notes Section */
        .notes-section {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
        }

        .notes-text {
          font-size: 0.9375rem;
          color: #1F2937;
          line-height: 1.6;
          white-space: pre-line;
          margin-top: 0.5rem;
        }

        /* Visit History Section */
        .visit-history-section {
          margin-top: 1.5rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 1.5rem;
        }

        .visits-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .visit-history-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.2s ease;
        }

        .visit-history-card:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .visit-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .visit-card-header:hover {
          background: #F3F4F6;
        }

        .visit-header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .visit-date-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1F2937;
        }

        .visit-separator {
          color: #6B7280;
        }

        .visit-token-badge {
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          color: #FFFFFF;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .visit-header-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.completed {
          background: #D1FAE5;
          color: #065F46;
        }

        .status-badge.in-progress {
          background: #FEF3C7;
          color: #92400E;
        }

        .status-badge.waiting {
          background: #E0E7FF;
          color: #3730A3;
        }

        .fee-status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .fee-status-badge.paid {
          background: #D1FAE5;
          color: #065F46;
        }

        .fee-status-badge.pending {
          background: #FEE2E2;
          color: #991B1B;
        }

        .recheck-badge {
          background: #DBEAFE;
          color: #1E40AF;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .expand-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #6B7280;
          transition: transform 0.2s ease;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .visit-card-content {
          padding: 1.25rem;
          background: #FFFFFF;
        }

        .visit-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1rem;
        }

        .visit-field-group {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .field-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .field-value {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1F2937;
        }

        .prescription-section {
          margin-top: 1rem;
        }

        .inventory-section {
          margin-top: 1rem;
        }

        .tests-section {
          margin-top: 1rem;
        }

        .tests-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .test-item {
          background: #FEF3C7;
          color: #92400E;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          border: 1px solid #FDE68A;
        }

        .doctor-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #E5E7EB;
        }

        .doctor-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.5rem;
        }

        .doctor-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1F2937;
        }

        .doctor-specialization {
          font-size: 0.8125rem;
          color: #6B7280;
        }

        /* Empty States */
        .empty-state,
        .empty-history {
          text-align: center;
          padding: 3rem 2rem;
          color: #6B7280;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .empty-subtitle {
          font-size: 0.9375rem;
          color: #6B7280;
        }

        /* Keyframe Animations */
        @keyframes backdropFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes backdropFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes modalFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes modalFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes popupScaleIn {
          0% {
            transform: scale(0.92);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes mobileSlideUp {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes mobileSlideDown {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100%);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .modal-opening .medical-history-modal {
            animation: mobileSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            transform: translateY(100%);
          }

          .modal-closing .medical-history-modal {
            animation: mobileSlideDown 0.3s ease-in forwards;
          }
        }

        @keyframes headerSlideDown {
          0% {
            transform: translateY(-12px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .medical-history-modal {
            max-width: 95%;
          }
        }

        @media (max-width: 768px) {

          .medical-history-modal {
            max-width: 100%;
            max-height: 95vh;
            border-radius: 24px 24px 0 0;
            margin-top: auto;
            margin-bottom: 0;
          }

          .medical-history-header {
            padding: 1.25rem 1.5rem;
            overflow: visible;
            min-height: auto;
          }

          .header-content {
            flex-direction: row;
            align-items: flex-start;
            gap: 0.75rem;
            flex-wrap: wrap;
            width: 100%;
            position: relative;
          }

          .header-right-actions {
            flex-direction: row;
            gap: 0.5rem;
            flex-shrink: 0;
            align-self: flex-start;
            min-width: fit-content;
            max-width: 100%;
            margin-left: auto;
          }

          .print-pdf-button {
            padding: 0.4375rem 0.875rem;
            font-size: 0.8125rem;
            height: 2.25rem;
            flex-shrink: 0;
            min-width: fit-content;
          }

          .print-pdf-icon {
            width: 0.9375rem;
            height: 0.9375rem;
          }

          .header-left {
            flex: 1;
            min-width: 0;
            width: 100%;
          }

          .header-title {
            font-size: 1.5rem;
            margin-bottom: 0.375rem;
          }

          .header-subtitle {
            font-size: 0.875rem;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .patient-id-badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.625rem;
          }

          .close-button {
            position: absolute;
            top: 1.25rem;
            right: 1.5rem;
            width: 2.25rem;
            height: 2.25rem;
            min-width: 2.25rem;
            min-height: 2.25rem;
          }

          .close-icon {
            width: 1.125rem;
            height: 1.125rem;
          }

          .modal-content {
            padding: 1.5rem;
          }

          .info-card {
            padding: 1.25rem;
            border-radius: 14px;
          }

          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .card-title {
            font-size: 1rem;
          }

          .card-icon {
            width: 1.125rem;
            height: 1.125rem;
          }

          .card-description {
            font-size: 0.75rem;
            margin-top: 0.25rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 0.875rem;
          }

          .info-item {
            padding: 0.75rem;
          }

          .info-label {
            font-size: 0.6875rem;
          }

          .info-value {
            font-size: 0.875rem;
          }

          .search-section {
            padding: 1rem 1.5rem;
          }

          .search-controls {
            flex-direction: column;
            gap: 0.625rem;
          }

          .search-select {
            min-width: 100%;
            width: 100%;
          }

          .search-input {
            min-width: 100%;
            width: 100%;
          }

          .search-button {
            width: 100%;
            padding: 0.75rem 1.5rem;
          }

          .visit-meta {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }

          .meta-badge {
            width: 100%;
            text-align: center;
            padding: 0.5rem;
          }

          .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: 10px;
          }

          .medicines-table {
            min-width: 700px;
            font-size: 0.8125rem;
          }

          .medicines-table th,
          .medicines-table td {
            padding: 0.75rem 0.875rem;
          }

          .medicines-table th {
            font-size: 0.75rem;
            white-space: nowrap;
          }

          .section-label {
            font-size: 0.6875rem;
          }

          .injections-section {
            padding: 0.875rem;
          }

          .injection-item {
            padding: 0.75rem;
          }

          .injection-name {
            font-size: 0.875rem;
          }

          .injection-details {
            font-size: 0.75rem;
          }

          .notes-section {
            padding: 0.875rem;
          }

          .notes-text {
            font-size: 0.875rem;
          }

          .visit-history-section {
            margin-top: 1rem;
          }

          .section-title {
            font-size: 1.125rem;
          }

          .visit-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .visit-header-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            width: 100%;
          }

          .visit-header-meta {
            width: 100%;
          }

          .visit-card-content {
            padding: 1rem;
          }

          .visit-field-group {
            grid-template-columns: 1fr;
          }

          .loading-state {
            padding: 3rem 1rem;
          }

          .spinner {
            width: 2.5rem;
            height: 2.5rem;
          }
        }

        @media (max-width: 480px) {
          .medical-history-modal {
            max-height: 98vh;
            border-radius: 20px 20px 0 0;
          }

          .medical-history-header {
            padding: 1rem 1.25rem;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .header-subtitle {
            font-size: 0.8125rem;
          }

          .header-right-actions {
            gap: 0.375rem;
            min-width: fit-content;
            flex-shrink: 0;
          }

          .print-pdf-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            height: 2rem;
            flex-shrink: 0;
            min-width: fit-content;
          }

          .print-pdf-icon {
            width: 0.875rem;
            height: 0.875rem;
          }

          .close-button {
            top: 1rem;
            right: 1.25rem;
            width: 2rem;
            height: 2rem;
            min-width: 2rem;
            min-height: 2rem;
          }

          .close-icon {
            width: 1rem;
            height: 1rem;
          }

          .modal-content {
            padding: 1.25rem 1rem;
          }

          .info-card {
            padding: 1rem;
            border-radius: 12px;
          }

          .card-title {
            font-size: 0.9375rem;
          }

          .card-icon {
            width: 1rem;
            height: 1rem;
          }

          .info-item {
            padding: 0.625rem;
          }

          .info-label {
            font-size: 0.625rem;
          }

          .info-value {
            font-size: 0.8125rem;
          }

          .search-section {
            padding: 0.875rem 1rem;
          }

          .search-select,
          .search-input,
          .search-button {
            font-size: 0.875rem;
            padding: 0.75rem;
          }

          .medicines-table {
            min-width: 650px;
            font-size: 0.75rem;
          }

          .medicines-table th,
          .medicines-table td {
            padding: 0.625rem 0.75rem;
          }

          .medicines-table th {
            font-size: 0.6875rem;
          }

          .frequency-badge {
            font-size: 0.75rem;
            padding: 0.1875rem 0.5rem;
          }

          .section-label {
            font-size: 0.625rem;
          }

          .injections-section {
            padding: 0.75rem;
          }

          .injection-item {
            padding: 0.625rem;
          }

          .injection-name {
            font-size: 0.8125rem;
          }

          .injection-details {
            font-size: 0.6875rem;
          }

          .notes-section {
            padding: 0.75rem;
          }

          .notes-text {
            font-size: 0.8125rem;
          }

          .empty-history {
            padding: 2rem 1rem;
          }

          .empty-title {
            font-size: 1rem;
          }

          .empty-subtitle {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 360px) {
          .medical-history-header {
            padding: 0.875rem 1rem;
            overflow: visible;
            min-height: auto;
          }
          
          .header-content {
            gap: 0.5rem;
          }
          
          .header-right-actions {
            gap: 0.375rem;
            flex-shrink: 0;
            min-width: fit-content;
          }

          .header-title {
            font-size: 1.125rem;
          }

          .modal-content {
            padding: 1rem 0.875rem;
          }

          .info-card {
            padding: 0.875rem;
          }

          .medicines-table {
            min-width: 600px;
            font-size: 0.6875rem;
          }

          .medicines-table th,
          .medicines-table td {
            padding: 0.5rem 0.625rem;
          }
        }

        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .close-button {
            min-width: 44px;
            min-height: 44px;
          }

          .search-button {
            min-height: 44px;
          }

          .medicines-table tbody tr {
            min-height: 48px;
          }
        }
      `}</style>
    </>
  )
}

export default MedicalHistoryModal

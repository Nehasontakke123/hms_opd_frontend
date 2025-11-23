import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const MedicalHistoryModal = ({ isOpen, onClose, patientId, patientName, patientMobile, isRecheck, currentPatient }) => {
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
          overflow: hidden;
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
          align-items: flex-start;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .header-left {
          flex: 1;
          min-width: 0;
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
          }

          .header-content {
            flex-direction: column;
            gap: 0.75rem;
          }

          .header-left {
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

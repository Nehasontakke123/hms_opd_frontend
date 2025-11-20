import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const MedicalHistoryModal = ({ isOpen, onClose, patientId, patientName, patientMobile, isRecheck, currentPatient }) => {
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('fullName') // 'fullName', 'mobileNumber', 'patientId'
  const [expandedCards, setExpandedCards] = useState({})

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

  const getPDFUrl = (pdfPath) => {
    if (!pdfPath) return null
    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      return pdfPath
    }
    const baseURL = api.defaults.baseURL || (import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api')
    const backendBase = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL
    const cleanPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`
    return `${backendBase}${cleanPath}`
  }

  const viewPrescription = async (pdfPath, patientName, visitDate) => {
    if (!pdfPath) {
      toast.error('PDF not available for this visit')
      return
    }

    const pdfUrl = getPDFUrl(pdfPath)
    if (!pdfUrl) {
      toast.error('Invalid PDF URL')
      return
    }

    try {
      // Fetch the PDF as a blob to ensure proper viewing
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch PDF')
      }

      // Get the blob and ensure it has the correct MIME type
      const blob = await response.blob()
      
      // Check Content-Type header first
      const contentType = response.headers.get('content-type') || ''
      
      // If blob doesn't have PDF MIME type, create new blob with correct type
      let pdfBlob = blob
      if (!blob.type.includes('pdf') && !contentType.includes('pdf')) {
        // Check first few bytes to verify it's actually a PDF
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const isPdf = uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46
        
        if (!isPdf) {
          // Check if it's HTML error page
          const text = new TextDecoder().decode(uint8Array.slice(0, 100))
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            toast.error('PDF not found. Please try again.')
            return
          }
        }
        
        // Create new blob with explicit PDF MIME type
        pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })
      } else if (!blob.type.includes('pdf')) {
        // If content-type header says PDF but blob doesn't, fix it
        const arrayBuffer = await blob.arrayBuffer()
        pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })
      }
      
      const url = window.URL.createObjectURL(pdfBlob)
      
      // Open in new tab with proper PDF viewer
      const newWindow = window.open('', '_blank')
      
      if (!newWindow) {
        toast.error('Please allow popups to view PDF')
        window.URL.revokeObjectURL(url)
        return
      }
      
      // Set the location to the blob URL
      newWindow.location.href = url
      
      // Clean up after a longer delay to ensure PDF loads
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (error) {
      console.error('Error viewing PDF:', error)
      toast.error('Failed to view PDF. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${isRecheck ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'} text-white p-6 flex justify-between items-center`}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">Medical History</h2>
              {isRecheck && (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-bold border-2 border-white/30 shadow-lg">
                  <span className="text-lg">↺</span>
                  Recheck-up Patient
                </span>
              )}
            </div>
            {medicalHistory?.patientInfo && (
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-blue-100">
                  {medicalHistory.patientInfo.fullName} • {medicalHistory.totalVisits} {medicalHistory.totalVisits === 1 ? 'visit' : 'visits'}
                </p>
                {medicalHistory.patientInfo?.patientId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold border border-white/30">
                    ID: {medicalHistory.patientInfo.patientId}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors text-2xl font-bold ml-4"
          >
            ×
          </button>
        </div>

        {/* Search Section */}
        {!patientId && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex gap-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                placeholder={`Enter patient ${searchType === 'fullName' ? 'name' : searchType === 'mobileNumber' ? 'mobile number' : 'ID'}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : medicalHistory && medicalHistory.medicalHistory && medicalHistory.medicalHistory.length > 0 ? (
            <div className="space-y-4">
              {/* Patient Info Card - Enhanced */}
              {medicalHistory.patientInfo && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Patient Information
                    </h3>
                    {medicalHistory.patientInfo?.patientId && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-bold border-2 border-blue-300 shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                        {medicalHistory.patientInfo.patientId}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</span>
                      <p className="font-bold text-gray-900 mt-1">{medicalHistory.patientInfo.fullName}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</span>
                      <p className="font-bold text-gray-900 mt-1">{medicalHistory.patientInfo.mobileNumber}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</span>
                      <p className="font-bold text-gray-900 mt-1">{medicalHistory.patientInfo.age} years</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</span>
                      <p className="font-bold text-gray-900 mt-1">{medicalHistory.patientInfo.gender || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</span>
                      <p className="font-bold text-gray-900 mt-1 text-xs">{medicalHistory.patientInfo.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {currentPatient?.prescription && (
                <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-lg p-6 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-purple-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Today's Prescribed Medicines
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically showing the tablets/equipment planned for the current visit so you can compare with prior visits.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-600">
                      {(() => {
                        const visitMeta = getCurrentVisitDateTime()
                        return visitMeta ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
                              📅 {visitMeta.dateLabel}
                            </span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
                              ⏰ {visitMeta.timeLabel}
                            </span>
                          </>
                        ) : null
                      })()}
                      {currentPatient.tokenNumber && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                          Token #{currentPatient.tokenNumber.toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>

                  {currentPatient.prescription.medicines?.length ? (
                    <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                      <div className="bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                        Tablets & Syrups
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-xs">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-gray-600">Medicine</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-600">Dosage</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-600">Frequency</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-600">Duration</th>
                              <th className="px-4 py-2 text-left font-semibold text-gray-600">Instructions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {currentPatient.prescription.medicines.map((med, idx) => (
                              <tr key={`current-med-${idx}`} className="hover:bg-purple-50 transition-colors">
                                <td className="px-4 py-2 font-semibold text-gray-900">{med.name || 'Not recorded'}</td>
                                <td className="px-4 py-2 text-gray-700">{med.dosage || '—'}</td>
                                <td className="px-4 py-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                                    {getFrequencyLabel(med)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-700">{med.duration || '—'}</td>
                                <td className="px-4 py-2 text-gray-600 min-w-[160px]">
                                  {med.dosageInstructions || med.dosageNotes || 'No instructions'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 mb-4">
                      No medicines have been added for this visit yet.
                    </div>
                  )}

                  {currentPatient.prescription.inventoryItems?.length > 0 && (
                    <div className="border border-cyan-100 rounded-xl p-4 bg-cyan-50/40 mb-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan-700 mb-2">
                        Injections & Surgical Items
                      </p>
                      <div className="space-y-1 text-sm text-cyan-900">
                        {currentPatient.prescription.inventoryItems.map((item, idx) => (
                          <div key={`current-inv-${idx}`} className="flex flex-col border border-cyan-100 rounded-lg p-3 bg-white">
                            <span className="font-semibold">{item.name}</span>
                            <span className="text-xs text-cyan-700">
                              {[item.dosage, item.usage].filter(Boolean).join(' • ') || 'Usage not recorded'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentPatient.prescription.notes && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Doctor Notes / Instructions</p>
                      <p className="text-sm text-gray-800 mt-2 whitespace-pre-line">{currentPatient.prescription.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Previous Visit Summary - Highlight Last Visit */}
              {medicalHistory.medicalHistory && medicalHistory.medicalHistory.length > 0 && (() => {
                const lastVisit = medicalHistory.medicalHistory[0] // Most recent visit
                const hasPrescription = lastVisit.prescription
                return (
                  <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Previous Visit Summary
                      </h3>
                      <div className="flex items-center gap-3">
                        {lastVisit.visitDetails?.isRecheck && (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-bold border-2 border-blue-300 shadow-sm">
                            <span className="text-lg">↺</span>
                            Recheck-up
                          </span>
                        )}
                        {lastVisit.behaviorRating && (
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 rounded-full border border-yellow-300">
                            <span className="text-yellow-600 font-bold">★</span>
                            <span className="text-yellow-800 font-bold text-sm">{lastVisit.behaviorRating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Visit Date</p>
                        <p className="text-base font-bold text-gray-900">{formatDate(lastVisit.visitDate)}</p>
                        {lastVisit.tokenNumber && (
                          <p className="text-sm text-gray-600 mt-1">Token #{lastVisit.tokenNumber.toString().padStart(2, '0')}</p>
                        )}
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctor</p>
                        <p className="text-base font-bold text-gray-900">
                          {lastVisit.doctor?.name ? `Dr. ${lastVisit.doctor.name}` : 'Not recorded'}
                        </p>
                        {lastVisit.doctor?.specialization && (
                          <p className="text-sm text-gray-600 mt-1">{lastVisit.doctor.specialization}</p>
                        )}
                      </div>
                    </div>

                    {hasPrescription && (
                      <>
                        {lastVisit.prescription.diagnosis && (
                          <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last Diagnosis</p>
                            <p className="text-sm text-gray-800 font-medium">{lastVisit.prescription.diagnosis}</p>
                          </div>
                        )}

                        {/* Medication History Table */}
                        {(lastVisit.prescription.medicines?.length > 0 || lastVisit.prescription.inventoryItems?.length > 0) && (
                          <div className="bg-white rounded-lg border border-purple-200 shadow-sm mb-4 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-3 border-b border-purple-200">
                              <p className="text-sm font-bold text-purple-900 uppercase tracking-wide flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Medication History
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Visit Date & Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Diagnosis / Issue</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Medication Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Dosage</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Frequency</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duration</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes / Instructions</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Prescribed By</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {/* Tablets/Medicines */}
                                  {lastVisit.prescription.medicines?.map((med, idx) => (
                                    <tr key={`med-${idx}`} className="hover:bg-purple-50 transition-colors">
                                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                        {formatDate(lastVisit.visitDate)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        {lastVisit.prescription.diagnosis || lastVisit.patientInfo?.disease || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                        {med.name}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {med.dosage || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                                          {getFrequencyLabel(med)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {med.duration || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                        {med.dosageInstructions || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {lastVisit.doctor?.name ? `Dr. ${lastVisit.doctor.name}` : 'N/A'}
                                        {lastVisit.doctor?.specialization && (
                                          <span className="block text-xs text-gray-500 mt-0.5">{lastVisit.doctor.specialization}</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Injections/Inventory Items */}
                                  {lastVisit.prescription.inventoryItems?.map((item, idx) => (
                                    <tr key={`inv-${idx}`} className="hover:bg-purple-50 transition-colors bg-cyan-50/30">
                                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                        {formatDate(lastVisit.visitDate)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        {lastVisit.prescription.diagnosis || lastVisit.patientInfo?.disease || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                        <span className="inline-flex items-center gap-1">
                                          {item.name}
                                          <span className="text-xs text-cyan-600 font-normal">(Injection/Surgical)</span>
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {item.dosage || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-cyan-100 text-cyan-800 font-semibold text-xs">
                                          {item.usage || 'As directed'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {item.usage || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                        {item.usage || 'N/A'}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-700">
                                        {lastVisit.doctor?.name ? `Dr. ${lastVisit.doctor.name}` : 'N/A'}
                                        {lastVisit.doctor?.specialization && (
                                          <span className="block text-xs text-gray-500 mt-0.5">{lastVisit.doctor.specialization}</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {(!lastVisit.prescription.medicines?.length && !lastVisit.prescription.inventoryItems?.length) && (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                No medications prescribed in this visit
                              </div>
                            )}
                          </div>
                        )}

                        {lastVisit.prescription.selectedTests?.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Investigation Reports</p>
                            <div className="flex flex-wrap gap-2">
                              {lastVisit.prescription.selectedTests.map((test, idx) => (
                                <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-200">
                                  {test}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {lastVisit.prescription.notes && (
                          <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctor Notes & Follow-up</p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{lastVisit.prescription.notes}</p>
                          </div>
                        )}
                      </>
                    )}

                    {!hasPrescription && (
                      <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm text-center text-gray-500">
                        <p className="text-sm">No prescription available for this visit</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Complete Medication History Table - All Visits */}
              {medicalHistory.medicalHistory && medicalHistory.medicalHistory.some(visit => 
                visit.prescription?.medicines?.length > 0 || visit.prescription?.inventoryItems?.length > 0
              ) && (
                <div className="bg-white rounded-lg border-2 border-blue-200 shadow-lg mb-6 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 border-b border-blue-300">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Complete Medication History (All Previous Visits)
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">Complete tablet and injection history from all previous visits</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Visit Date & Time</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Diagnosis / Issue</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Medication Name</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Dosage</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Frequency</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes / Instructions</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Prescribed By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {medicalHistory.medicalHistory.map((record, visitIndex) => {
                          if (!record.prescription) return null
                          
                          return (
                            <React.Fragment key={`visit-${visitIndex}`}>
                              {/* Tablets/Medicines */}
                              {record.prescription.medicines?.map((med, medIndex) => (
                                <tr key={`visit-${visitIndex}-med-${medIndex}`} className="hover:bg-blue-50 transition-colors">
                                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                                    <div className="font-semibold">{formatDate(record.visitDate)}</div>
                                    {record.tokenNumber && (
                                      <div className="text-xs text-gray-500">Token #{record.tokenNumber.toString().padStart(2, '0')}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {record.prescription.diagnosis || record.patientInfo?.disease || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                    {med.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {med.dosage || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                                      {getFrequencyLabel(med)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {med.duration || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                    {med.dosageInstructions || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {record.doctor?.name ? `Dr. ${record.doctor.name}` : 'N/A'}
                                    {record.doctor?.specialization && (
                                      <span className="block text-xs text-gray-500 mt-0.5">{record.doctor.specialization}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {/* Injections/Inventory Items */}
                              {record.prescription.inventoryItems?.map((item, itemIndex) => (
                                <tr key={`visit-${visitIndex}-inv-${itemIndex}`} className="hover:bg-cyan-50 transition-colors bg-cyan-50/30">
                                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-cyan-50/30 z-10 border-r border-gray-200">
                                    <div className="font-semibold">{formatDate(record.visitDate)}</div>
                                    {record.tokenNumber && (
                                      <div className="text-xs text-gray-500">Token #{record.tokenNumber.toString().padStart(2, '0')}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {record.prescription.diagnosis || record.patientInfo?.disease || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                    <span className="inline-flex items-center gap-1">
                                      {item.name}
                                      <span className="text-xs text-cyan-600 font-normal">(Injection/Surgical)</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {item.dosage || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-cyan-100 text-cyan-800 font-semibold text-xs">
                                      {item.usage || 'As directed'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {item.usage || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                    {item.usage || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {record.doctor?.name ? `Dr. ${record.doctor.name}` : 'N/A'}
                                    {record.doctor?.specialization && (
                                      <span className="block text-xs text-gray-500 mt-0.5">{record.doctor.specialization}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="relative pl-6">
                <div className="absolute left-[1rem] top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-purple-200 to-blue-200"></div>
                {medicalHistory.medicalHistory.map((record, index) => {
                  const isExpanded = !!expandedCards[index]
                  const sugarLabel =
                    record?.vitals?.sugarLevel || record?.vitals?.sugarLevel === 0
                      ? `${record.vitals.sugarLevel} mg/dL`
                      : null

                  return (
                    <div key={index} className="relative pb-10">
                      <div className="absolute left-4 top-3 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white bg-blue-600 shadow-md"></div>
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 cursor-pointer"
                          onClick={() => toggleCard(index)}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                                Visit #{medicalHistory.medicalHistory.length - index}
                              </p>
                              {record.visitDetails?.isRecheck ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-300">
                                  <span className="text-base">↺</span>
                                  Recheck-up
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-300">
                                  <span className="text-base">🆕</span>
                                  New Visit
                                </span>
                              )}
                              {record.tokenNumber && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-300">
                                  Token #{record.tokenNumber.toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{formatDate(record.visitDate)}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-600">
                                {record.doctor?.name ? `Dr. ${record.doctor.name}` : 'Doctor not recorded'}
                                {record.doctor?.specialization && ` • ${record.doctor.specialization}`}
                              </p>
                              {record.behaviorRating && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 rounded-full border border-yellow-300">
                                  <span className="text-yellow-600 font-bold text-xs">★</span>
                                  <span className="text-yellow-800 font-bold text-xs">{record.behaviorRating}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {record.patientInfo?.disease && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-200">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {record.patientInfo.disease}
                              </span>
                            )}
                            {record.visitDetails?.status && (
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                                  record.visitDetails.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : record.visitDetails.status === 'in-progress'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {record.visitDetails.status.replace('-', ' ')}
                              </span>
                            )}
                            {record.prescription && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">
                                <span>📄</span> Prescription saved
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleCard(index)
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-purple-300 hover:text-purple-600 transition"
                          >
                            {isExpanded ? 'Hide details' : 'View details'}
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm pt-5">
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Token</p>
                                <p className="text-base font-semibold text-gray-800 mt-1">
                                  #{record.tokenNumber?.toString().padStart(2, '0') || 'N/A'}
                                </p>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Fees</p>
                                <p className="text-base font-semibold text-gray-800 mt-1">₹{record.visitDetails?.fees || 0}</p>
                                <p className="text-[11px] text-gray-500">
                                  Status: {record.visitDetails?.feeStatus ? record.visitDetails.feeStatus.toUpperCase() : 'N/A'}
                                </p>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Recheck</p>
                                <p className="text-base font-semibold text-gray-800 mt-1">
                                  {record.visitDetails?.isRecheck ? 'Yes' : 'No'}
                                </p>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Vitals</p>
                                <div className="mt-1 space-y-1 text-gray-800">
                                  {record.vitals?.bloodPressure && <p>BP: {record.vitals.bloodPressure}</p>}
                                  {sugarLabel && <p>Sugar: {sugarLabel}</p>}
                                  {!record.vitals?.bloodPressure && !sugarLabel && <p>No vitals recorded</p>}
                                </div>
                              </div>
                            </div>

                            {record.prescription?.diagnosis && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-purple-900">Diagnosis</p>
                                <p className="text-sm text-purple-800 mt-2 whitespace-pre-line">
                                  {record.prescription.diagnosis}
                                </p>
                              </div>
                            )}

                            {record.prescription?.medicines?.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                  <span>💊</span> Medicines Prescribed
                                </p>
                                <div className="space-y-3">
                                  {record.prescription.medicines.map((med, medIndex) => {
                                    const frequencyParts = []
                                    if (med.times?.morning) frequencyParts.push('Morning')
                                    if (med.times?.afternoon) frequencyParts.push('Afternoon')
                                    if (med.times?.night) frequencyParts.push('Night')
                                    const frequency = frequencyParts.length > 0 ? frequencyParts.join(', ') : null
                                    
                                    return (
                                      <div key={medIndex} className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="font-bold text-blue-900 text-base">{med.name}</p>
                                            <div className="mt-2 space-y-1">
                                              {med.dosage && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-gray-600">Dosage:</span>
                                                  <span className="text-sm text-blue-800 font-medium">{med.dosage}</span>
                                                </div>
                                              )}
                                              {frequency && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-gray-600">Frequency:</span>
                                                  <span className="text-sm text-blue-800 font-medium">{frequency}</span>
                                                </div>
                                              )}
                                              {med.duration && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold text-gray-600">Duration:</span>
                                                  <span className="text-sm text-blue-800 font-medium">{med.duration}</span>
                                                </div>
                                              )}
                                            </div>
                                            {med.dosageInstructions && (
                                              <p className="mt-2 text-xs text-gray-600 italic bg-gray-50 p-2 rounded border border-gray-100">
                                                {med.dosageInstructions}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Test Results / Lab Reports */}
                            {(record.prescription?.selectedTests?.length > 0 || (record.prescription?.notes && record.prescription.notes.includes('Test'))) && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Test Results / Lab Reports
                                </p>
                                {record.prescription?.selectedTests?.length > 0 ? (
                                  <div className="space-y-2">
                                    {record.prescription.selectedTests.map((test, testIndex) => (
                                      <div key={testIndex} className="flex items-center gap-2 text-sm text-amber-900 bg-white rounded-lg p-2 border border-amber-100">
                                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">{test}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-amber-800 bg-white rounded-lg p-2 border border-amber-100">
                                    Tests mentioned in notes: {record.prescription.notes}
                                  </p>
                                )}
                              </div>
                            )}

                            {record.prescription?.inventoryItems?.length > 0 && (
                              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                                  <span>🛠️</span> Injections & Surgical Items
                                </p>
                                <div className="space-y-2">
                                  {record.prescription.inventoryItems.map((item, itemIndex) => (
                                    <div key={itemIndex} className="bg-white border border-cyan-100 rounded-lg p-3 shadow-sm">
                                      <p className="font-semibold text-cyan-900">{item.name}</p>
                                      <div className="mt-2 space-y-1">
                                        {item.dosage && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-600">Dosage:</span>
                                            <span className="text-sm text-cyan-800 font-medium">{item.dosage}</span>
                                          </div>
                                        )}
                                        {item.usage && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-600">Usage:</span>
                                            <span className="text-sm text-cyan-800 font-medium">{item.usage}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {record.prescription?.notes && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-gray-800">Doctor Notes</p>
                                <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                                  {record.prescription.notes}
                                </p>
                              </div>
                            )}

                            {record.prescription?.pdfPath ? (
                              <div className="flex justify-start">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    viewPrescription(
                                      record.prescription.pdfPath,
                                      medicalHistory.patientInfo?.fullName || 'Patient',
                                      record.visitDate
                                    )
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  View Prescription PDF
                                </button>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                                No prescription PDF available for this visit.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              <p className="text-lg">No medical history found</p>
              <p className="text-sm mt-2">Search for a patient to view their medical records</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MedicalHistoryModal


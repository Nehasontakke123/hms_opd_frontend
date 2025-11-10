import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const MedicalHistoryModal = ({ isOpen, onClose, patientId, patientName, patientMobile }) => {
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('fullName') // 'fullName', 'mobileNumber', 'patientId'
  const [expandedCards, setExpandedCards] = useState({})

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

      const response = await api.get('/prescription/medical-history', { params })
      const historyData = response.data.data
      setMedicalHistory(historyData)
      if (historyData?.medicalHistory?.length) {
        setExpandedCards({ 0: true })
      } else {
        setExpandedCards({})
      }
    } catch (error) {
      console.error('Error fetching medical history:', error)
      if (error.response?.status === 404) {
        toast.error('No medical history found for this patient')
      } else {
        toast.error('Failed to fetch medical history')
      }
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
    const baseURL = api.defaults.baseURL || (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Medical History</h2>
            {medicalHistory?.patientInfo && (
              <p className="text-blue-100 mt-1">
                {medicalHistory.patientInfo.fullName} • {medicalHistory.totalVisits} {medicalHistory.totalVisits === 1 ? 'visit' : 'visits'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors text-2xl font-bold"
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
              {/* Patient Info Card */}
              {medicalHistory.patientInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Patient Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{medicalHistory.patientInfo.fullName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Mobile:</span>
                      <p className="font-medium">{medicalHistory.patientInfo.mobileNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Age:</span>
                      <p className="font-medium">{medicalHistory.patientInfo.age} years</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Address:</span>
                      <p className="font-medium">{medicalHistory.patientInfo.address}</p>
                    </div>
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
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                              Visit #{medicalHistory.medicalHistory.length - index}
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900">{formatDate(record.visitDate)}</h3>
                            <p className="text-sm text-gray-600">
                              {record.doctor?.name ? `Dr. ${record.doctor.name}` : 'Doctor not recorded'}
                              {record.doctor?.specialization && ` • ${record.doctor.specialization}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {record.patientInfo?.disease && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {record.patientInfo.disease}
                              </span>
                            )}
                            {record.visitDetails?.status && (
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                  record.visitDetails.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : record.visitDetails.status === 'in-progress'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200'
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
                                <div className="space-y-2">
                                  {record.prescription.medicines.map((med, medIndex) => (
                                    <div key={medIndex} className="flex items-start gap-2 text-sm text-blue-900">
                                      <span className="mt-0.5 text-blue-600">•</span>
                                      <div>
                                        <p className="font-semibold">{med.name}</p>
                                        <p className="text-xs text-blue-700">
                                          {[med.dosage, med.duration].filter(Boolean).join(' • ')}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {record.prescription?.inventoryItems?.length > 0 && (
                              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                                  <span>🛠️</span> Injections & Surgical Items
                                </p>
                                <ul className="space-y-1 text-sm text-cyan-900">
                                  {record.prescription.inventoryItems.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-start gap-2">
                                      <span className="mt-0.5 text-cyan-600">•</span>
                                      <div>
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-xs text-cyan-700">
                                          {[item.dosage, item.usage].filter(Boolean).join(' • ')}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
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


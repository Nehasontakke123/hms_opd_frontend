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
      setMedicalHistory(response.data.data)
    } catch (error) {
      console.error('Error fetching medical history:', error)
      if (error.response?.status === 404) {
        toast.error('No medical history found for this patient')
      } else {
        toast.error('Failed to fetch medical history')
      }
      setMedicalHistory(null)
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

              {/* Medical History Cards */}
              {medicalHistory.medicalHistory.map((record, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div
                    className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleCard(index)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Visit on {formatDate(record.visitDate)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {record.doctor?.name ? `Dr. ${record.doctor.name}` : 'Unknown Doctor'}
                          {record.doctor?.specialization && ` • ${record.doctor.specialization}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.prescription && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                          Prescription Available
                        </span>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-600 transform transition-transform ${expandedCards[index] ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedCards[index] && (
                    <div className="p-4 space-y-4 border-t">
                      {/* Visit Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Token #:</span>
                          <p className="font-medium">{record.tokenNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Fees:</span>
                          <p className="font-medium">₹{record.visitDetails?.fees || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <p className="font-medium capitalize">{record.visitDetails?.status || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Recheck:</span>
                          <p className="font-medium">{record.visitDetails?.isRecheck ? 'Yes' : 'No'}</p>
                        </div>
                      </div>

                      {/* Diagnosis */}
                      {record.patientInfo?.disease && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <span className="text-sm font-semibold text-amber-900">Complaint:</span>
                          <p className="text-amber-800">{record.patientInfo.disease}</p>
                        </div>
                      )}

                      {/* Prescription Details */}
                      {record.prescription ? (
                        <div className="space-y-3">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                              <span>📋</span> Prescription Details
                            </h4>
                            
                            {/* Diagnosis */}
                            {record.prescription.diagnosis && (
                              <div className="mb-3">
                                <span className="text-sm font-semibold text-gray-700">Diagnosis:</span>
                                <p className="text-gray-900 font-medium">{record.prescription.diagnosis}</p>
                              </div>
                            )}

                            {/* Medicines */}
                            {record.prescription.medicines && record.prescription.medicines.length > 0 && (
                              <div className="mb-3">
                                <span className="text-sm font-semibold text-gray-700">Medicines:</span>
                                <ul className="mt-2 space-y-1">
                                  {record.prescription.medicines.map((med, medIndex) => (
                                    <li key={medIndex} className="text-sm text-gray-800 flex items-start gap-2">
                                      <span className="text-blue-600">💊</span>
                                      <span>
                                        <span className="font-medium">{med.name}</span>
                                        {med.dosage && ` - ${med.dosage}`}
                                        {med.duration && ` (${med.duration})`}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Notes */}
                            {record.prescription.notes && (
                              <div className="mb-3">
                                <span className="text-sm font-semibold text-gray-700">Notes:</span>
                                <p className="text-gray-800 text-sm whitespace-pre-wrap">{record.prescription.notes}</p>
                              </div>
                            )}

                            {/* PDF View Button */}
                            {record.prescription.pdfPath && (
                              <button
                                onClick={() => viewPrescription(
                                  record.prescription.pdfPath,
                                  medicalHistory.patientInfo?.fullName || 'Patient',
                                  record.visitDate
                                )}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>📄</span>
                                View PDF
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-600">
                          No prescription available for this visit
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
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


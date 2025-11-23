import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'

const MedicalDashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('prescriptions') // 'prescriptions' or 'medicines'
  const [patients, setPatients] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMedicines, setLoadingMedicines] = useState(false)
  const [query, setQuery] = useState('')
  const [medicineQuery, setMedicineQuery] = useState('')
  const [stats, setStats] = useState({ totalPrescriptions: 0, todayPrescriptions: 0 })
  const [medicineStats, setMedicineStats] = useState({ total: 0, lowStock: 0, expiringSoon: 0, expired: 0 })
  const [medicinePage, setMedicinePage] = useState(1)
  const [medicinePagination, setMedicinePagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 })
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [prescriptionsPage, setPrescriptionsPage] = useState(1)
  const prescriptionsPerPage = 10

  const downloadPdf = async (pdfUrl, fileName) => {
    try {
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      // Ensure .pdf extension is always present
      const fileNameWithExt = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
      anchor.download = fileNameWithExt
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download failed:', error)
      toast.error('Failed to download PDF')
    }
  }

  const viewPdf = async (pdfUrl) => {
    try {
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
            toast.error('PDF not found. Please try downloading instead.')
            return
          }
        }
        
        // Create new blob with explicit PDF MIME type
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
      console.error('PDF view failed:', error)
      toast.error('Failed to view PDF. Please try downloading instead.')
    }
  }

  const handleViewPrescription = async (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available')
        return
      }

      const pdfUrl = patient.prescription.pdfPath ? getPDFUrl(patient.prescription.pdfPath) : null
      
      if (pdfUrl) {
        // Open PDF in new browser tab for viewing
        await viewPdf(pdfUrl)
      } else {
        toast.error('PDF not available for this prescription')
      }
    } catch (e) {
      console.error('View failed:', e)
      toast.error('Failed to view PDF')
    }
  }

  const fetchPatients = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) {
        setLoading(true)
      }
      const res = await api.get('/medical-records/prescriptions')
      setPatients(res.data.data || [])
    } catch (e) {
      if (!isBackgroundPoll) {
        toast.error('Failed to load prescriptions')
      }
    } finally {
      if (!isBackgroundPoll) {
        setLoading(false)
      }
    }
  }

  // Helper function to determine prescription status
  const getPrescriptionStatus = (patient) => {
    // Check if patient is marked for rechecking
    if (patient.isRecheck) {
      return {
        label: '🔄 Rechecking',
        color: 'blue',
        className: 'bg-blue-100 text-blue-700 border border-blue-200'
      }
    }
    
    // Check if prescription exists and is completed
    if (patient.prescription && patient.status === 'completed') {
      return {
        label: '✔ Completed',
        color: 'green',
        className: 'bg-green-100 text-green-700 border border-green-200'
      }
    }
    
    // Default to pending
    return {
      label: '⏳ Pending',
      color: 'yellow',
      className: 'bg-yellow-100 text-yellow-700 border border-yellow-200'
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/medical-records/stats')
      return res.data.data
    } catch (e) {
      console.error('Failed to load stats:', e)
      return { totalPrescriptions: 0, todayPrescriptions: 0 }
    }
  }

  const fetchMedicines = async (page = 1, search = '', sortField = 'name', sortDir = 'asc') => {
    try {
      setLoadingMedicines(true)
      const params = {
        page,
        limit: 50,
        sortBy: sortField,
        sortOrder: sortDir,
        ...(search && { search })
      }
      const res = await api.get('/inventory/medicines', { params })
      if (res.data.success) {
        setMedicines(res.data.data || [])
        setMedicineStats(res.data.stats || { total: 0, lowStock: 0, expiringSoon: 0, expired: 0 })
        setMedicinePagination(res.data.pagination || { page: 1, limit: 50, total: 0, pages: 1 })
      } else {
        throw new Error(res.data.message || 'Failed to load medicines')
      }
    } catch (e) {
      console.error('Error fetching medicines:', e)
      toast.error(e.response?.data?.message || 'Failed to load medicines. Please try again.')
      setMedicines([])
      setMedicineStats({ total: 0, lowStock: 0, expiringSoon: 0, expired: 0 })
    } finally {
      setLoadingMedicines(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await fetchPatients()
      const statsData = await fetchStats()
      setStats(statsData)
    }
    loadData()
  }, [])

  // Real-time polling for prescription status updates and date-based sorting
  useEffect(() => {
    if (activeTab !== 'prescriptions') return

    // Poll every 5 seconds for real-time updates
    const pollInterval = setInterval(async () => {
      await fetchPatients(true) // true = background poll (no loading state)
      // Also refresh stats to keep counts updated
      const statsData = await fetchStats()
      setStats(statsData)
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'medicines') {
      fetchMedicines(medicinePage, medicineQuery, sortBy, sortOrder)
    }
  }, [activeTab, medicinePage, medicineQuery, sortBy, sortOrder])

  // Helper function to get prescription date for sorting
  const getPrescriptionDate = (patient) => {
    // Priority: prescription.createdAt > prescription.updatedAt > createdAt > registrationDate
    if (patient.prescription?.createdAt) {
      return new Date(patient.prescription.createdAt).getTime()
    }
    if (patient.prescription?.updatedAt) {
      return new Date(patient.prescription.updatedAt).getTime()
    }
    if (patient.createdAt) {
      return new Date(patient.createdAt).getTime()
    }
    if (patient.registrationDate) {
      return new Date(patient.registrationDate).getTime()
    }
    return 0 // Fallback for records without dates
  }

  // Helper function to format date for display
  const formatPrescriptionDate = (patient) => {
    const date = patient.prescription?.createdAt || 
                 patient.prescription?.updatedAt || 
                 patient.createdAt || 
                 patient.registrationDate
    
    if (!date) return 'Date not available'
    
    const dateObj = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now - dateObj)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Format: "Today", "Yesterday", or "MMM DD, YYYY at HH:MM AM/PM"
    if (diffDays === 0) {
      return `Today at ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Yesterday at ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return dateObj.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  // Filter and sort prescriptions based on search query and date (newest first)
  const filteredPrescriptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    let filtered = patients
    
    // Apply search filter if query exists
    if (q) {
      filtered = patients.filter((p) => {
        return (
          p.fullName?.toLowerCase().includes(q) ||
          p.mobileNumber?.toLowerCase().includes(q) ||
          p.patientId?.toLowerCase().includes(q)
        )
      })
    }
    
    // Sort by prescription date (newest first - descending order)
    return [...filtered].sort((a, b) => {
      const dateA = getPrescriptionDate(a)
      const dateB = getPrescriptionDate(b)
      return dateB - dateA // Descending order (newest first)
    })
  }, [patients, query])

  // Pagination calculations for prescriptions
  const prescriptionsTotalPages = useMemo(() => {
    return Math.ceil(filteredPrescriptions.length / prescriptionsPerPage)
  }, [filteredPrescriptions.length, prescriptionsPerPage])

  const paginatedPrescriptions = useMemo(() => {
    const startIndex = (prescriptionsPage - 1) * prescriptionsPerPage
    const endIndex = startIndex + prescriptionsPerPage
    return filteredPrescriptions.slice(startIndex, endIndex)
  }, [filteredPrescriptions, prescriptionsPage, prescriptionsPerPage])

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPrescriptionsPage(1)
  }, [query])

  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      setSortOrder(newOrder)
    } else {
      // Set new sort field with ascending order
      setSortBy(field)
      setSortOrder('asc')
    }
    setMedicinePage(1) // Reset to first page when sorting
  }

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return (
        <span className="text-gray-400 ml-1">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      )
    }
    return sortOrder === 'asc' ? (
      <span className="text-purple-600 ml-1">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </span>
    ) : (
      <span className="text-purple-600 ml-1">
        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    )
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

  const handleDownload = async (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available')
        return
      }

      // First try to get the stored PDF URL
      const pdfUrl = patient.prescription.pdfPath ? getPDFUrl(patient.prescription.pdfPath) : null
      
      if (pdfUrl) {
        // Use the stored PDF - ensure .pdf extension in filename
        const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber}`
        downloadPdf(pdfUrl, fileName) // downloadPdf will ensure .pdf extension
      } else {
        // Generate PDF on the fly if no stored PDF exists
        try {
          const doctorInfo = patient.doctor || {}
          const pdfBase64 = generatePrescriptionPDF(patient, doctorInfo, patient.prescription)
          
          // Convert base64 to blob and download
          const base64Data = pdfBase64.split(',')[1]
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'application/pdf' })
          
          const url = window.URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          // Ensure .pdf extension is always present
          const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber}.pdf`
          anchor.download = fileName
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
          window.URL.revokeObjectURL(url)
          
          // Save PDF to backend so it's available for viewing
          try {
            await api.put(`/prescription/${patient._id}`, {
              diagnosis: patient.prescription.diagnosis,
              medicines: patient.prescription.medicines,
              notes: patient.prescription.notes || '',
              pdfData: pdfBase64
            })
            
            // Refresh the patient list to show the updated PDF path
            await fetchPatients()
            
            toast.success('Prescription downloaded and saved successfully')
          } catch (saveError) {
            console.error('Failed to save PDF to backend:', saveError)
            toast.success('Prescription downloaded successfully (not saved)')
          }
        } catch (err) {
          console.error('PDF generation failed:', err)
          toast.error('Failed to generate PDF. Please try again.')
        }
      }
    } catch (e) {
      console.error('Download failed:', e)
      toast.error('Failed to download PDF')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      {/* Top Header with Hospital Branding */}
      <header className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Hospital Logo and Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Medical Cross Icon */}
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-teal-600 rounded-xl shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                    Tekisky
                  </span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-700">
                    Hospital +
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
                  Secure, view-only access to doctor-issued prescriptions and patient history.
                </p>
              </div>
            </div>
            
            {/* User Info and Logout Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {/* Logged-in User Name */}
              {user?.fullName && (
                <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200/50 shadow-sm">
                  {/* Profile Icon */}
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  {/* User Name */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-600 hidden sm:inline">Logged in as</span>
                    <span className="text-sm sm:text-base font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-none">
                      {user.fullName}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Logout Button */}
              <button 
                onClick={logout} 
                className="self-start sm:self-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base active:scale-95 whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Medical Records Team Section */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-4 sm:mb-5">
            Medical Records Team
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-5">
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                activeTab === 'prescriptions'
                  ? 'bg-gradient-to-r from-blue-500 to-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setActiveTab('medicines')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                activeTab === 'medicines'
                  ? 'bg-gradient-to-r from-blue-500 to-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Medicines
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {activeTab === 'prescriptions' ? (
              <>
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs sm:text-sm text-blue-600 font-semibold uppercase tracking-wide mb-1">Total Prescriptions</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalPrescriptions}</p>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs sm:text-sm text-teal-600 font-semibold uppercase tracking-wide mb-1">Today</p>
                  <p className="text-2xl sm:text-3xl font-bold text-teal-700">{stats.todayPrescriptions}</p>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold uppercase tracking-wide mb-1">Logged in</p>
                  <p className="text-sm sm:text-base font-semibold text-slate-700 truncate">{user?.fullName || 'Medical Staff'}</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs sm:text-sm text-blue-600 font-semibold uppercase tracking-wide mb-1">Total Medicines</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700">{medicineStats.total}</p>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs sm:text-sm text-orange-600 font-semibold uppercase tracking-wide mb-1">Low Stock</p>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-700">{medicineStats.lowStock}</p>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs sm:text-sm text-red-600 font-semibold uppercase tracking-wide mb-1">Expiring Soon</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-700">{medicineStats.expiringSoon}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'prescriptions' ? (
          <>
            {loading ? (
              <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg border border-gray-100">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading prescriptions...</p>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="mb-5 sm:mb-6">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, mobile, or Patient ID..."
                    className="w-full sm:w-96 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white shadow-sm hover:shadow-md transition-all duration-200 text-sm sm:text-base"
                  />
                </div>

                {/* Prescription Records Section */}
                <div className="mb-4 sm:mb-5">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-3 sm:mb-4">Prescription Records</h3>
                </div>

                <div className="space-y-4 sm:space-y-5">
              {paginatedPrescriptions.map((p, index) => {
                  const pdfUrl = p.prescription?.pdfPath && getPDFUrl(p.prescription.pdfPath)
                  return (
                    <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
                      {/* Card Header */}
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4 sm:gap-5">
                          {/* Patient Info Section */}
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Number Badge */}
                            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-600 text-white font-bold flex items-center justify-center shadow-md text-sm sm:text-base">
                              {String((prescriptionsPage - 1) * prescriptionsPerPage + index + 1).padStart(2, '0')}
                            </div>
                            
                            {/* Patient Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-800">{p.fullName}</h3>
                                {p.patientId && (
                                  <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs sm:text-sm font-semibold border border-blue-200 shadow-sm">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                                    </svg>
                                    {p.patientId}
                                  </span>
                                )}
                                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-blue-100 text-blue-700 font-semibold">Token {p.tokenNumber}</span>
                                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg bg-teal-100 text-teal-700 font-medium">Age {p.age}</span>
                              </div>
                              
                              {/* Patient Info Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-600">Mobile:</span>
                                  <span className="text-xs sm:text-sm text-slate-700">{p.mobileNumber || 'Not provided'}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-600">Issue:</span>
                                  <span className="text-xs sm:text-sm text-slate-700 capitalize">{p.disease || '—'}</span>
                                </div>
                              </div>
                              
                              {/* Status Badges */}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                {/* Prescription Status Badge */}
                                {(() => {
                                  const status = getPrescriptionStatus(p)
                                  return (
                                    <span className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm ${status.className}`}>
                                      {status.label}
                                    </span>
                                  )
                                })()}
                                
                                {/* Fee Status Badge */}
                                <span className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-sm ${
                                  p.feeStatus === 'paid'
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : p.feeStatus === 'not_required'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-orange-100 text-orange-700 border border-orange-200'
                                }`}>
                                  {p.feeStatus === 'paid' ? '✓ Fees Paid' : p.feeStatus === 'not_required' ? 'No Fees Required' : '⏳ Fees Pending'}
                                </span>
                              </div>
                              
                              {/* Prescription Date - Clean Label */}
                              <div className="flex items-center gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-600">Prescribed:</span>
                                  <span className="text-xs sm:text-sm text-slate-700 font-medium">{formatPrescriptionDate(p)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                            <button
                              onClick={() => handleViewPrescription(p)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm sm:text-base active:scale-95"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>View Prescription</span>
                            </button>
                            <button
                              onClick={() => handleDownload(p)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-500 to-teal-600 text-white hover:from-blue-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm sm:text-base active:scale-95"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Medicines Table */}
                      {p.prescription?.medicines && p.prescription.medicines.length > 0 && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                          <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                            {/* Desktop Table View */}
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full text-sm text-left text-gray-700">
                                <thead className="bg-gradient-to-r from-blue-50 to-teal-50 text-xs uppercase text-gray-600 font-semibold">
                                  <tr>
                                    <th className="px-4 sm:px-6 py-3">Medicine</th>
                                    <th className="px-4 sm:px-6 py-3">Dosage</th>
                                    <th className="px-4 sm:px-6 py-3">Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.prescription.medicines.map((med, medIndex) => (
                                    <tr key={`${p._id}-${medIndex}`} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                      <td className="px-4 sm:px-6 py-3 font-semibold text-gray-900">{med.name || '—'}</td>
                                      <td className="px-4 sm:px-6 py-3 text-gray-700">{med.dosage || '—'}</td>
                                      <td className="px-4 sm:px-6 py-3 text-gray-700 font-medium">{med.duration || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="sm:hidden">
                              {p.prescription.medicines.map((med, medIndex) => (
                                <div key={`${p._id}-${medIndex}`} className="border-b border-gray-100 last:border-b-0 p-4">
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Medicine</p>
                                      <p className="text-sm font-semibold text-gray-900">{med.name || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Dosage</p>
                                      <p className="text-sm text-gray-700">{med.dosage || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Duration</p>
                                      <p className="text-sm text-gray-700 font-medium">{med.duration || '—'}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes Section */}
                      {p.prescription?.notes && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide mb-2 sm:mb-3">Notes</h4>
                            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                              {p.prescription.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                  {filteredPrescriptions.length === 0 && (
                    <div className="bg-white p-8 sm:p-12 rounded-2xl text-center shadow-lg border border-gray-200">
                      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-4">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No prescriptions available</p>
                      <p className="text-sm sm:text-base text-gray-500">Try adjusting your search criteria</p>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {prescriptionsTotalPages > 1 && (
                  <div className="mt-6 sm:mt-8 bg-white rounded-2xl border border-gray-200 shadow-md px-4 sm:px-6 py-4 sm:py-5">
                    {/* Desktop: Full Pagination with Page Numbers */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing <span className="font-semibold text-gray-800">{(prescriptionsPage - 1) * prescriptionsPerPage + 1}</span> to{' '}
                        <span className="font-semibold text-gray-800">{Math.min(prescriptionsPage * prescriptionsPerPage, filteredPrescriptions.length)}</span> of{' '}
                        <span className="font-semibold text-gray-800">{filteredPrescriptions.length}</span> prescriptions
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPrescriptionsPage(prev => Math.max(1, prev - 1))}
                          disabled={prescriptionsPage === 1}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                            prescriptionsPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                          }`}
                          aria-label="Previous page"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                          Previous
                        </button>

                        {/* Page Number Buttons */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: prescriptionsTotalPages }, (_, i) => i + 1).map((pageNum) => {
                            // Show first page, last page, current page, and pages around current
                            if (
                              pageNum === 1 ||
                              pageNum === prescriptionsTotalPages ||
                              (pageNum >= prescriptionsPage - 1 && pageNum <= prescriptionsPage + 1)
                            ) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setPrescriptionsPage(pageNum)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    prescriptionsPage === pageNum
                                      ? 'bg-purple-600 text-white shadow-md'
                                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                                  }`}
                                  aria-label={`Go to page ${pageNum}`}
                                >
                                  {pageNum}
                                </button>
                              )
                            } else if (
                              pageNum === prescriptionsPage - 2 ||
                              pageNum === prescriptionsPage + 2
                            ) {
                              return (
                                <span key={pageNum} className="px-2 text-gray-400">
                                  ...
                                </span>
                              )
                            }
                            return null
                          })}
                        </div>

                        <button
                          onClick={() => setPrescriptionsPage(prev => Math.min(prescriptionsTotalPages, prev + 1))}
                          disabled={prescriptionsPage === prescriptionsTotalPages}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                            prescriptionsPage === prescriptionsTotalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                          }`}
                          aria-label="Next page"
                        >
                          Next
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Mobile: Compact Pagination */}
                    <div className="md:hidden flex items-center justify-between gap-3">
                      <button
                        onClick={() => setPrescriptionsPage(prev => Math.max(1, prev - 1))}
                        disabled={prescriptionsPage === 1}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 touch-manipulation ${
                          prescriptionsPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm active:scale-95'
                        }`}
                        aria-label="Previous page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Previous</span>
                      </button>

                      <div className="flex-1 text-center">
                        <span className="text-sm text-gray-600">
                          Page <span className="font-semibold text-gray-800">{prescriptionsPage}</span> of <span className="font-semibold text-gray-800">{prescriptionsTotalPages}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => setPrescriptionsPage(prev => Math.min(prescriptionsTotalPages, prev + 1))}
                        disabled={prescriptionsPage === prescriptionsTotalPages}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 touch-manipulation ${
                          prescriptionsPage === prescriptionsTotalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm active:scale-95'
                        }`}
                        aria-label="Next page"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-5 sm:mb-6">
              <input
                type="text"
                value={medicineQuery}
                onChange={(e) => {
                  setMedicineQuery(e.target.value)
                  setMedicinePage(1)
                }}
                placeholder="Search medicines by name, generic name, or brand..."
                className="w-full sm:w-96 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white shadow-sm hover:shadow-md transition-all duration-200 text-sm sm:text-base"
              />
            </div>
            {loadingMedicines ? (
              <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg border border-gray-100">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading medicines...</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                  {medicines.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-700">
                          <thead className="bg-gradient-to-r from-blue-50 to-teal-50 text-xs uppercase text-gray-600 font-semibold">
                            <tr>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center">
                                  Name
                                  {getSortIcon('name')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('genericName')}
                              >
                                <div className="flex items-center">
                                  Generic Name
                                  {getSortIcon('genericName')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('manufacturer')}
                              >
                                <div className="flex items-center">
                                  Manufacturer
                                  {getSortIcon('manufacturer')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('form')}
                              >
                                <div className="flex items-center">
                                  Form
                                  {getSortIcon('form')}
                                </div>
                              </th>
                              <th className="px-4 py-3">Strength</th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('price')}
                              >
                                <div className="flex items-center">
                                  Price (₹)
                                  {getSortIcon('price')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('stockQuantity')}
                              >
                                <div className="flex items-center">
                                  Stock
                                  {getSortIcon('stockQuantity')}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('category')}
                              >
                                <div className="flex items-center">
                                  Category
                                  {getSortIcon('category')}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicines.map((med) => (
                              <tr key={med._id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{med.name || '—'}</td>
                                <td className="px-4 py-3 text-gray-700">{med.genericName || '—'}</td>
                                <td className="px-4 py-3 text-gray-700">{med.manufacturer || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                    {med.form || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{med.strength || '—'}</td>
                                <td className="px-4 py-3 text-gray-700 font-medium">
                                  {med.price ? `₹${med.price.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    med.stockQuantity <= med.minStockLevel
                                      ? 'bg-red-100 text-red-700'
                                      : med.stockQuantity <= med.minStockLevel * 2
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {med.stockQuantity || 0}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{med.category || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {medicinePagination.pages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Showing {((medicinePagination.page - 1) * medicinePagination.limit) + 1} to{' '}
                            {Math.min(medicinePagination.page * medicinePagination.limit, medicinePagination.total)} of{' '}
                            {medicinePagination.total} medicines
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setMedicinePage(p => Math.max(1, p - 1))}
                              disabled={medicinePage === 1}
                              className="px-3 py-1 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setMedicinePage(p => Math.min(medicinePagination.pages, p + 1))}
                              disabled={medicinePage === medicinePagination.pages}
                              className="px-3 py-1 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-10 text-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">No medicines found</p>
                      {medicineQuery && (
                        <p className="text-sm text-gray-500 mt-1">
                          Try adjusting your search: "{medicineQuery}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default MedicalDashboard




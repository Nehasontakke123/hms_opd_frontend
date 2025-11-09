import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'
import PatientLimitModal from '../components/PatientLimitModal'
import DoctorStatsNotification from '../components/DoctorStatsNotification'
import MedicalHistoryModal from '../components/MedicalHistoryModal'

// Mapping of doctor specializations to diagnoses
const SPECIALIZATION_DIAGNOSES = {
  'Cardiologist': [
    'Heart Disease',
    'High Blood Pressure',
    'Chest Pain',
    'Irregular Heartbeat',
    'Heart Attack Follow-up',
    'Shortness of Breath',
    'Coronary Artery Disease',
    'Arrhythmia',
    'Heart Failure'
  ],
  'Heart Specialist': [
    'Heart Disease',
    'High Blood Pressure',
    'Chest Pain',
    'Irregular Heartbeat',
    'Heart Attack Follow-up',
    'Shortness of Breath',
    'Coronary Artery Disease',
    'Arrhythmia',
    'Heart Failure'
  ],
  'Dermatologist': [
    'Acne',
    'Eczema',
    'Psoriasis',
    'Skin Rash',
    'Dermatitis',
    'Allergic Reactions',
    'Warts',
    'Melanoma',
    'Rosacea',
    'Vitiligo'
  ],
  'Neurologist': [
    'Migraine',
    'Epilepsy',
    'Stroke',
    'Headache',
    'Seizures',
    'Parkinson\'s Disease',
    'Alzheimer\'s Disease',
    'Multiple Sclerosis',
    'Neuropathy',
    'Concussion'
  ],
  'General Physician': [
    'Fever',
    'Cough & Cold',
    'Headache',
    'Body Pain',
    'Weakness / Fatigue',
    'Stomach Ache',
    'Common Cold',
    'Flu',
    'Diarrhea',
    'Vomiting'
  ],
  'Gynecologist': [
    'Irregular Periods',
    'Pregnancy Checkup',
    'PCOD / PCOS',
    'Lower Abdominal Pain',
    'Menstrual Cramps',
    'Menopause',
    'Endometriosis',
    'Cervical Issues',
    'Ovarian Cysts'
  ],
  'Psychiatrist': [
    'Depression',
    'Anxiety',
    'Stress',
    'Insomnia',
    'Bipolar Disorder',
    'PTSD',
    'OCD',
    'Panic Disorder',
    'Schizophrenia',
    'ADHD'
  ],
  'Orthopedic': [
    'Fracture',
    'Joint Pain',
    'Back Pain',
    'Arthritis',
    'Sprain',
    'Osteoporosis',
    'Tendonitis',
    'Bursitis',
    'Scoliosis'
  ],
  'Pediatrician': [
    'Childhood Fever',
    'Vaccination',
    'Growth Issues',
    'Developmental Delay',
    'Childhood Infections',
    'Asthma in Children',
    'Allergies',
    'Ear Infection',
    'Common Cold'
  ],
  'Endocrinologist': [
    'Diabetes',
    'Thyroid Disorders',
    'Hormonal Imbalance',
    'Obesity',
    'Metabolic Syndrome',
    'Growth Hormone Issues',
    'Adrenal Disorders',
    'Pituitary Disorders'
  ],
  'Gastroenterologist': [
    'Stomach Pain',
    'Acid Reflux',
    'IBS',
    'Ulcer',
    'Constipation',
    'Diarrhea',
    'Liver Disease',
    'Gallstones',
    'Crohn\'s Disease'
  ]
}

// Helper function to get diagnoses based on doctor specialization
const getDiagnosesForSpecialization = (specialization) => {
  if (!specialization) return []
  
  // Normalize specialization (case-insensitive, handle variations)
  const normalized = specialization.trim()
  
  // Check exact match first
  if (SPECIALIZATION_DIAGNOSES[normalized]) {
    return SPECIALIZATION_DIAGNOSES[normalized]
  }
  
  // Check case-insensitive match
  const lowerNormalized = normalized.toLowerCase()
  for (const key in SPECIALIZATION_DIAGNOSES) {
    if (key.toLowerCase() === lowerNormalized) {
      return SPECIALIZATION_DIAGNOSES[key]
    }
  }
  
  // If no match found, return empty array
  return []
}

// Mapping of doctor specializations to tests
const SPECIALIZATION_TESTS = {
  'Cardiologist': [
    'ECG',
    '2D Echo',
    'Cholesterol Test',
    'Blood Pressure Monitoring',
    'Stress Test',
    'Holter Monitor',
    'Echocardiogram',
    'Cardiac Catheterization',
    'Coronary Angiography'
  ],
  'Heart Specialist': [
    'ECG',
    '2D Echo',
    'Cholesterol Test',
    'Blood Pressure Monitoring',
    'Stress Test',
    'Holter Monitor',
    'Echocardiogram',
    'Cardiac Catheterization',
    'Coronary Angiography'
  ],
  'Dermatologist': [
    'Skin Biopsy',
    'Patch Test',
    'Dermoscopy',
    'Wood\'s Lamp Examination',
    'Fungal Culture',
    'Allergy Test',
    'Blood Test',
    'Skin Scraping'
  ],
  'Neurologist': [
    'EEG',
    'MRI Brain',
    'Nerve Conduction Study',
    'CT Scan Brain',
    'EMG',
    'Lumbar Puncture',
    'Neuropsychological Testing',
    'PET Scan',
    'MRA (Magnetic Resonance Angiography)'
  ],
  'General Physician': [
    'Blood Test',
    'Sugar Test',
    'Typhoid Test',
    'CBC (Complete Blood Count)',
    'Lipid Profile',
    'Liver Function Test',
    'Kidney Function Test',
    'Urine Test',
    'X-Ray Chest'
  ],
  'Gynecologist': [
    'Pregnancy Test',
    'Pelvic Ultrasound',
    'Hormone Test',
    'Pap Smear',
    'Mammography',
    'Transvaginal Ultrasound',
    'HSG (Hysterosalpingography)',
    'Laparoscopy',
    'Endometrial Biopsy'
  ],
  'Psychiatrist': [
    'Mental Health Evaluation',
    'Sleep Study',
    'Anxiety & Depression Assessment',
    'Cognitive Function Test',
    'Psychological Testing',
    'Brain Imaging',
    'Blood Test (Medication Levels)',
    'Thyroid Function Test'
  ],
  'Orthopedic': [
    'X-Ray',
    'MRI Bone Scan',
    'Calcium Level Test',
    'Bone Density Test',
    'Arthroscopy',
    'CT Scan',
    'Ultrasound Joint',
    'EMG',
    'Bone Scan'
  ],
  'Orthopedic Surgeon': [
    'X-Ray',
    'MRI Bone Scan',
    'Calcium Level Test',
    'Bone Density Test',
    'Arthroscopy',
    'CT Scan',
    'Ultrasound Joint',
    'EMG',
    'Bone Scan'
  ],
  'Pediatrician': [
    'Blood Test',
    'Growth Hormone Test',
    'Vaccination Status Check',
    'Developmental Assessment',
    'Hearing Test',
    'Vision Test',
    'Chest X-Ray',
    'Urine Test'
  ],
  'Endocrinologist': [
    'Blood Sugar Test',
    'Thyroid Function Test',
    'Hormone Test',
    'Insulin Level Test',
    'Cortisol Test',
    'Growth Hormone Test',
    'Adrenal Function Test',
    'Pituitary Function Test'
  ],
  'Gastroenterologist': [
    'Endoscopy',
    'Colonoscopy',
    'Ultrasound Abdomen',
    'CT Scan Abdomen',
    'Liver Function Test',
    'Stool Test',
    'H. Pylori Test',
    'ERCP',
    'Capsule Endoscopy'
  ]
}

// Helper function to get tests based on doctor specialization
const getTestsForSpecialization = (specialization) => {
  if (!specialization) return []
  
  // Normalize specialization (case-insensitive, handle variations)
  const normalized = specialization.trim()
  
  // Check exact match first
  if (SPECIALIZATION_TESTS[normalized]) {
    return SPECIALIZATION_TESTS[normalized]
  }
  
  // Check case-insensitive match
  const lowerNormalized = normalized.toLowerCase()
  for (const key in SPECIALIZATION_TESTS) {
    if (key.toLowerCase() === lowerNormalized) {
      return SPECIALIZATION_TESTS[key]
    }
  }
  
  // If no match found, return empty array
  return []
}

const DoctorDashboard = () => {
  const { user, logout, updateUser, setUserData } = useAuth()
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
      anchor.download = `${fileName}.pdf`
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
      console.error('PDF view failed:', error)
      toast.error('Failed to view PDF. Please try downloading instead.')
    }
  }

  const [activeTab, setActiveTab] = useState('today') // 'today', 'history', or 'medical'
  const [patients, setPatients] = useState([])
  const [patientHistory, setPatientHistory] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingMedical, setLoadingMedical] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showStatsNotification, setShowStatsNotification] = useState(true)
  const [doctorStats, setDoctorStats] = useState(null)
  const [searchToday, setSearchToday] = useState('')
  const [searchHistory, setSearchHistory] = useState('')
  const [searchMedical, setSearchMedical] = useState('')
  const PAGE_SIZE_TODAY = 5
  const PAGE_SIZE_HISTORY = 6
  const [todayPage, setTodayPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [prescriptionData, setPrescriptionData] = useState({
    diagnosis: '',
    medicines: [{
      name: '',
      dosage: '',
      duration: '',
      times: { morning: false, afternoon: false, night: false },
      dosageNotes: '',
      dosageInstructions: ''
    }],
    notes: '',
    selectedTest: ''
  })
  const [medicineSuggestions, setMedicineSuggestions] = useState([[]])
  const [loadingSuggestions, setLoadingSuggestions] = useState({})
  const suggestionTimers = useRef({})
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const fileInputRef = useRef(null)
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false)
  const [medicalHistoryPatientId, setMedicalHistoryPatientId] = useState(null)
  const [medicalHistoryPatientName, setMedicalHistoryPatientName] = useState(null)
  const [medicalHistoryPatientMobile, setMedicalHistoryPatientMobile] = useState(null)

  const fetchTodayPatients = useCallback(
    async ({ showLoader = false } = {}) => {
      if (!user?.id) return
      if (showLoader) setLoading(true)
      try {
        const response = await api.get(`/patient/today/${user.id}`)
        setPatients(response.data.data)
      } catch (error) {
        toast.error('Failed to fetch patients')
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [user?.id]
  )

  const fetchDoctorStats = useCallback(async () => {
    if (!user?.id) return
    try {
      const response = await api.get(`/doctor/${user.id}/stats`)
      setDoctorStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch doctor stats:', error)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchTodayPatients({ showLoader: true })
      fetchDoctorStats()
    }
  }, [user?.id, fetchTodayPatients, fetchDoctorStats])

  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(() => {
      fetchTodayPatients()
      fetchDoctorStats()
    }, 5000)
    return () => clearInterval(interval)
  }, [user?.id, fetchTodayPatients, fetchDoctorStats])

  const handleToggleAvailability = async () => {
    try {
      const response = await api.put(`/doctor/${user?.id}/availability`, {
        isAvailable: !doctorStats?.isAvailable
      })
      toast.success(response.data.message)
      await fetchDoctorStats() // Refresh stats
      fetchTodayPatients() // Refresh today's patients
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update availability')
    }
  }

  const handleMarkAsPaid = async (patient) => {
    if (!patient || !patient._id) {
      toast.error('Invalid patient data')
      return
    }

    if (patient.isRecheck) {
      toast.error('Recheck-up patients do not require payment')
      return
    }

    if (patient.feeStatus === 'paid') {
      toast.error('Payment is already marked as paid')
      return
    }

    try {
      const response = await api.put(`/patient/${patient._id}/payment`, {
        paymentAmount: patient.fees || 0
      })

      if (response.data.success) {
        toast.success('Payment marked as paid successfully')
        // Refresh patient lists
        fetchTodayPatients()
        if (activeTab === 'history') {
          fetchPatientHistory()
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment status')
    }
  }

  const fetchMedicalRecords = useCallback(async () => {
    if (!user?.id) return
    setLoadingMedical(true)
    try {
      const response = await api.get('/patient')
      const allPatients = response.data.data || []
      const recordsWithPrescriptions = allPatients.filter(
        p => (p.doctor?._id === user.id || p.doctor === user.id) && p.prescription
      )
      recordsWithPrescriptions.sort((a, b) =>
        new Date(b.prescription?.createdAt || b.createdAt) - new Date(a.prescription?.createdAt || a.createdAt)
      )
      setMedicalRecords(recordsWithPrescriptions)
    } catch (error) {
      console.error('Error fetching medical records:', error)
      toast.error('Failed to fetch medical records')
    } finally {
      setLoadingMedical(false)
    }
  }, [user?.id])

  const fetchPatientHistory = useCallback(async () => {
    if (!user?.id) return
    setLoadingHistory(true)
    try {
      const response = await api.get(`/doctor/${user.id}/patients/history`)
      const myPatients = response.data.data || []
      setPatientHistory(myPatients)
    } catch (error) {
      console.error('Error fetching patient history:', error)
      toast.error('Failed to fetch patient history')
    } finally {
      setLoadingHistory(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPatientHistory()
    } else if (activeTab === 'medical') {
      fetchMedicalRecords()
    } else if (activeTab === 'today') {
      fetchTodayPatients()
      fetchDoctorStats()
    }
  }, [activeTab, fetchPatientHistory, fetchMedicalRecords, fetchTodayPatients, fetchDoctorStats])

  const filterPatients = (list, query) => {
    if (!query) return list
    const q = query.toLowerCase()
    return list.filter((patient) => {
      const nameMatch = patient.fullName?.toLowerCase().includes(q)
      const mobileMatch = patient.mobileNumber?.toLowerCase().includes(q)
      const tokenMatch = patient.tokenNumber?.toString().includes(q)
      const issueMatch = patient.disease?.toLowerCase().includes(q)
      return nameMatch || mobileMatch || tokenMatch || issueMatch
    })
  }

  const handleDownloadPrescription = (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available to download')
        return
      }

      const pdfUrl = getPDFUrl(patient.prescription.pdfPath)

      if (pdfUrl) {
        downloadPdf(pdfUrl, `prescription_${patient.fullName}_${patient.tokenNumber}`)
      } else {
        toast.error('PDF not available')
      }
    } catch (e) {
      console.error('Failed to download PDF:', e)
      toast.error('Failed to download PDF')
    }
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

  const ensureTimesShape = (medicine) => ({
    morning: medicine?.times?.morning || false,
    afternoon: medicine?.times?.afternoon || false,
    night: medicine?.times?.night || false
  })

  const formatDosage = (times, notes, instructions) => {
    const selected = []
    if (times.morning) selected.push('Morning')
    if (times.afternoon) selected.push('Afternoon')
    if (times.night) selected.push('Night')
    let result = selected.join(', ')
    
    // Add dosage instructions if provided
    if (instructions && instructions.trim()) {
      result = result ? `${result} - ${instructions.trim()}` : instructions.trim()
    }
    
    // Add custom notes if provided
    if (notes && notes.trim()) {
      result = result ? `${result} | ${notes.trim()}` : notes.trim()
    }
    
    return result
  }

  const updateMedicineSuggestions = (index, suggestions) => {
    setMedicineSuggestions((prev) => {
      const updated = [...prev]
      updated[index] = suggestions
      return updated
    })
  }

  const fetchMedicineSuggestions = async (query, index) => {
    if (!query || query.trim().length < 2) {
      updateMedicineSuggestions(index, [])
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }))
      return
    }

    try {
      setLoadingSuggestions(prev => ({ ...prev, [index]: true }))
      // Fetch medicines from MongoDB collection
      const response = await api.get(`/inventory/medicines/search/suggestions`, {
        params: { query: query.trim(), limit: 20 }
      })

      if (response.data && response.data.success && response.data.data) {
        const suggestions = response.data.data.map(med => {
          let displayName = med.name || ''
          // Add generic name if different from name
          if (med.genericName && med.genericName !== med.name) {
            displayName += ` (${med.genericName})`
          }
          // Add brand name if available and different
          if (med.brandName && med.brandName !== med.name && med.brandName !== med.genericName) {
            displayName += ` [${med.brandName}]`
          }
          // Add strength if available
          if (med.strength) {
            displayName += ` - ${med.strength}`
          }
          // Add form if available
          if (med.form) {
            displayName += ` (${med.form})`
          }
          return displayName
        })
        updateMedicineSuggestions(index, suggestions)
      } else {
        updateMedicineSuggestions(index, [])
      }
    } catch (error) {
      console.error('Error fetching medicine suggestions:', error)
      updateMedicineSuggestions(index, [])
      // Only show error toast for actual errors, not empty results
      if (error.response?.status !== 200) {
        toast.error('Failed to fetch medicine suggestions')
      }
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }))
    }
  }

  const handleMedicineChange = (index, field, value, options = {}) => {
    const updatedMedicines = [...prescriptionData.medicines]
    const target = { ...updatedMedicines[index] }
    target[field] = value

    if (!target.times) {
      target.times = ensureTimesShape(target)
    }

    if (field === 'dosageNotes') {
      target.dosage = formatDosage(target.times, value, target.dosageInstructions)
    }
    
    if (field === 'dosageInstructions') {
      target.dosage = formatDosage(target.times, target.dosageNotes, value)
    }

    updatedMedicines[index] = target
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines })

    if (field === 'name') {
      if (suggestionTimers.current[index]) {
        clearTimeout(suggestionTimers.current[index])
      }

      if (options.skipLookup) {
        updateMedicineSuggestions(index, [])
      } else {
        suggestionTimers.current[index] = setTimeout(() => {
          fetchMedicineSuggestions(value, index)
        }, 300)
      }
    }
  }

  const handleDosageToggle = (index, timeKey) => {
    const updatedMedicines = [...prescriptionData.medicines]
    const target = { ...updatedMedicines[index] }
    target.times = ensureTimesShape(target)
    target.times[timeKey] = !target.times[timeKey]
    target.dosage = formatDosage(target.times, target.dosageNotes, target.dosageInstructions)
    updatedMedicines[index] = target
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines })
  }

  const addMedicineField = () => {
    setPrescriptionData({
      ...prescriptionData,
      medicines: [
        ...prescriptionData.medicines,
        {
          name: '',
          dosage: '',
          duration: '',
          times: { morning: false, afternoon: false, night: false },
          dosageNotes: '',
          dosageInstructions: ''
        }
      ]
    })
    setMedicineSuggestions((prev) => [...prev, []])
  }

  const removeMedicineField = (index) => {
    if (prescriptionData.medicines.length > 1) {
      const updatedMedicines = prescriptionData.medicines.filter((_, i) => i !== index)
      setPrescriptionData({
        ...prescriptionData,
        medicines: updatedMedicines
      })
      setMedicineSuggestions((prev) => prev.filter((_, i) => i !== index))
      // Clean up loading state for removed field
      setLoadingSuggestions((prev) => {
        const updated = { ...prev }
        delete updated[index]
        // Reindex remaining loading states
        const reindexed = {}
        Object.keys(updated).forEach(key => {
          const keyNum = parseInt(key)
          if (keyNum > index) {
            reindexed[keyNum - 1] = updated[key]
          } else if (keyNum < index) {
            reindexed[keyNum] = updated[key]
          }
        })
        return reindexed
      })
    }
  }

  const handleOpenPrescriptionModal = (patient) => {
    setSelectedPatient(patient)
    setPrescriptionData({
      diagnosis: patient?.disease || '', // Auto-fill diagnosis from patient registration
      medicines: [{
        name: '',
        dosage: '',
        duration: '',
        times: { morning: false, afternoon: false, night: false },
        dosageNotes: '',
        dosageInstructions: ''
      }],
      notes: '',
      selectedTest: ''
    })
    setMedicineSuggestions([[]])
    setLoadingSuggestions({})
    setShowPrescriptionModal(true)
  }

  const handleSubmitPrescription = async () => {
    // Validate medicines
    const validMedicines = prescriptionData.medicines.filter(
      med => med.name.trim() && med.dosage.trim() && med.duration.trim()
    )

    if (!prescriptionData.diagnosis.trim() || validMedicines.length === 0) {
      toast.error('Please provide diagnosis and at least one complete medicine')
      return
    }

    try {
      // First, generate PDF to get base64 data
      // Use selectedPatient data for PDF generation
      const tempPrescription = {
        diagnosis: prescriptionData.diagnosis,
        medicines: validMedicines,
        notes: prescriptionData.notes || '',
        createdAt: new Date()
      }

      // Generate PDF and get base64 (also downloads locally)
      const pdfBase64 = generatePrescriptionPDF(
        selectedPatient,
        { 
          fullName: user.fullName, 
          specialization: user.specialization,
          qualification: user.qualification 
        },
        tempPrescription
      )

      // Save prescription with PDF data in one call
      const response = await api.put(`/prescription/${selectedPatient._id}`, {
        diagnosis: prescriptionData.diagnosis,
        medicines: validMedicines,
        notes: prescriptionData.notes,
        pdfData: pdfBase64 // Send PDF as base64
      })

      toast.success(response.data.message || 'Prescription saved, PDF generated and stored in medical section!')
      setShowPrescriptionModal(false)
      fetchTodayPatients()
      // Always refresh medical records so the badge count is updated
      fetchMedicalRecords()
      if (activeTab === 'history') {
        fetchPatientHistory()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save prescription')
    }
  }

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size should be less than 2MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadProfilePhoto = async () => {
    if (!profileImageFile) {
      toast.error('Please select an image file')
      return
    }

    try {
      const formData = new FormData()
      formData.append('profileImage', profileImageFile)

      // Get token for manual request
      const token = localStorage.getItem('token')
      
      // Use fetch instead of axios for file uploads to properly handle multipart/form-data
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/doctor/${user?.id}/profile-image`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it with boundary
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload profile photo')
      }

      // Update user data in context with the new profile image
      if (data.data && data.data.profileImage) {
        // Update localStorage and context immediately with new profile image
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        const updatedUser = {
          ...currentUser,
          profileImage: data.data.profileImage
        }
        
        // Update context immediately so image shows right away
        if (setUserData) {
          setUserData(updatedUser)
        } else {
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
        
        // Fetch complete updated user data from backend to ensure all fields are current
        if (updateUser) {
          try {
            await updateUser()
          } catch (err) {
            console.error('Failed to fetch updated user from backend:', err)
            // User context is already updated with profileImage, so continue
          }
        }
      }

      toast.success('Profile photo updated successfully!')
      setShowProfileModal(false)
      setProfileImageFile(null)
      setProfileImagePreview(null)
      
      // Small delay to let toast show, then reload to ensure everything is synced
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload profile photo')
    }
  }

  const openProfileModal = () => {
    setShowProfileModal(true)
    setProfileImagePreview(user?.profileImage || null)
  }

  const filteredTodayPatients = filterPatients(patients, searchToday)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime()
      const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime()
      return dateB - dateA
    })
  const filteredHistoryPatients = filterPatients(patientHistory, searchHistory)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime()
      const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime()
      return dateB - dateA
    })
  const filteredMedicalRecords = filterPatients(medicalRecords, searchMedical)
  const todayTotalPages = Math.max(1, Math.ceil(filteredTodayPatients.length / PAGE_SIZE_TODAY))
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryPatients.length / PAGE_SIZE_HISTORY))
  const paginatedTodayPatients = useMemo(
    () =>
      filteredTodayPatients.slice(
        (todayPage - 1) * PAGE_SIZE_TODAY,
        todayPage * PAGE_SIZE_TODAY
      ),
    [filteredTodayPatients, todayPage]
  )
  const paginatedHistoryPatients = useMemo(
    () =>
      filteredHistoryPatients.slice(
        (historyPage - 1) * PAGE_SIZE_HISTORY,
        historyPage * PAGE_SIZE_HISTORY
      ),
    [filteredHistoryPatients, historyPage]
  )

  useEffect(() => {
    setTodayPage(1)
  }, [searchToday])

  useEffect(() => {
    setHistoryPage(1)
  }, [searchHistory])

  useEffect(() => {
    setTodayPage(1)
  }, [filteredTodayPatients.length])

  useEffect(() => {
    setHistoryPage(1)
  }, [filteredHistoryPatients.length])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Doctor Profile Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-md p-4 mb-4">
            <div className="flex items-center gap-4">
              {/* Profile Photo */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-lg border-4 border-white overflow-hidden">
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user?.fullName || 'Doctor'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {(user?.fullName || 'D').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Upload Button Overlay */}
                <button
                  onClick={openProfileModal}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-all duration-200 border-2 border-white"
                  title="Upload Profile Photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* Doctor Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-purple-600">Tekisky</span>
                  <span className="text-xl sm:text-2xl font-semibold text-slate-800">Hospital</span>
                </div>
                {/* Doctor's Name - Highlighted */}
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 mt-2" style={{ fontSize: '24px', fontWeight: 700 }}>
                  Dr. {user?.fullName || 'Doctor'}
                </h2>
                {/* Education/Qualification */}
                {user?.qualification && (
                  <p className="text-sm sm:text-base font-medium text-gray-700 mb-1" style={{ fontSize: '16px', fontWeight: 500 }}>
                    {user.qualification}
                  </p>
                )}
                {/* Specialization Badge */}
                {user?.specialization && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold shadow-sm mt-1">
                    <span className="text-base" role="img" aria-label="Specialization">🩺</span>
                    <span className="capitalize">{user.specialization}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left Side: Dashboard Info */}
            <div>
              <p className="mt-1 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 rounded-full">
                Doctor Dashboard
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">Track patient rounds, craft prescriptions, and review medical records in one place.</p>
            </div>
            
            {/* Right Side: Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => setShowLimitModal(true)}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm whitespace-nowrap"
              >
                Set Patient Limit
              </button>
              <button
                onClick={logout}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Daily Statistics Section */}
          {doctorStats && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Daily Limit</p>
                    <p className="text-2xl font-bold text-purple-600">{doctorStats.dailyPatientLimit}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Patients</p>
                    <p className="text-2xl font-bold text-gray-800">{doctorStats.todayPatientCount}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining Slots</p>
                    <p className={`text-2xl font-bold ${doctorStats.remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {doctorStats.remainingSlots}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>


      {/* Limit Reached Banner */}
      {doctorStats && doctorStats.isLimitReached && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="mb-6 p-4 border-2 border-red-500 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-semibold text-red-800">⚠️ Daily limit reached!</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients Today
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient History
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'medical'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Records
              {medicalRecords.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {medicalRecords.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Patients Today Tab */}
        {activeTab === 'today' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Patients Today</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : filteredTodayPatients.length === 0 && !searchToday ? (
              <div className="bg-white rounded-3xl border border-purple-100 shadow-lg p-12 text-center">
                <p className="text-gray-500 text-lg">No patients have registered today yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border border-purple-100 rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-6 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Today's Queue</p>
                      <h3 className="text-xl font-semibold text-slate-800 mt-1">Manage active consultations effortlessly</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {filteredTodayPatients.length} {filteredTodayPatients.length === 1 ? 'patient' : 'patients'} in line • {patients.filter(p => p.status === 'waiting').length} waiting
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 text-purple-600 px-3 py-1.5 text-sm font-semibold shadow-inner">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {patients.filter((patient) => patient.status === 'completed').length} completed
                      </div>
                      <input
                        type="text"
                        value={searchToday}
                        onChange={(e) => setSearchToday(e.target.value)}
                        placeholder="Search patient, token, issue..."
                        className="w-full sm:w-72 rounded-full border border-purple-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      />
                    </div>
                  </div>

                  {filteredTodayPatients.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500 border-t border-purple-100 bg-white/70">
                      {searchToday
                        ? 'No matching patients for your search. Try adjusting the filters.'
                        : 'No patients have registered today yet.'}
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:grid grid-cols-12 gap-6 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-white/70 border-t border-purple-100">
                        <span className="col-span-3">Patient</span>
                        <span className="col-span-2">Issue</span>
                        <span className="col-span-2">Vitals</span>
                        <span className="col-span-2">Schedule</span>
                        <span className="col-span-1">Status</span>
                        <span className="col-span-2 text-right">Actions</span>
                      </div>
                      <div className="px-4 py-5 space-y-4 bg-white/60">
                        {paginatedTodayPatients.map((patient) => {
                          const hasPendingFees = !patient.isRecheck && patient.feeStatus !== 'not_required' && patient.feeStatus === 'pending'
                          const formattedToken = (patient.tokenNumber ?? '-').toString().padStart(2, '0')
                          const registrationDate = patient.visitDate
                            ? new Date(`${patient.visitDate}T00:00:00`)
                            : new Date(patient.registrationDate)
                          const visitDateFormatted = registrationDate.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                          const visitTimeFormatted = patient.visitTime
                            ? patient.visitTime
                            : new Date(patient.registrationDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                          const sugarFormatted =
                            patient.sugarLevel !== undefined && patient.sugarLevel !== null && patient.sugarLevel !== ''
                              ? `${patient.sugarLevel} mg/dL`
                              : null

                          return (
                            <div
                              key={patient._id}
                              className={`relative rounded-2xl border ${
                                hasPendingFees ? 'border-orange-200 bg-orange-50/40' : 'border-purple-100 bg-white'
                              } shadow-sm transition-all duration-200 hover:shadow-md`}
                            >
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                                  hasPendingFees
                                    ? 'bg-gradient-to-b from-orange-400 via-orange-500 to-red-400'
                                    : 'bg-gradient-to-b from-purple-400 via-purple-500 to-blue-500'
                                }`}
                              ></div>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 px-5 py-5">
                                <div className="md:col-span-3 flex items-start gap-4">
                                  <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-full font-semibold text-white shadow-md ${
                                      hasPendingFees
                                        ? 'bg-gradient-to-br from-orange-500 to-red-500'
                                        : 'bg-gradient-to-br from-purple-500 to-blue-600'
                                    }`}
                                  >
                                    {formattedToken}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-800">{patient.fullName}</p>
                                      <span className="text-xs text-slate-500">• {patient.age} yrs</span>
                                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-600">
                                        Token #{formattedToken}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500">Mobile: {patient.mobileNumber}</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      {patient.isRecheck || patient.feeStatus === 'not_required' ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                          <span className="text-base">↺</span>
                                          Recheck-up
                                        </span>
                                      ) : (
                                        <span
                                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                            patient.feeStatus === 'paid'
                                              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                              : 'border-orange-100 bg-orange-50 text-orange-600'
                                          }`}
                                        >
                                          {patient.feeStatus === 'paid' ? '✓ Fees Paid' : 'Pending Fees'}
                                        </span>
                                      )}
                                      {patient.behaviorRating && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
                                          ★ {patient.behaviorRating}/5
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Issue</span>
                                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600 shadow-sm">
                                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                    {patient.disease || 'Not specified'}
                                  </span>
                                  {patient.notes && (
                                    <p className="text-xs text-slate-500 break-words">{patient.notes}</p>
                                  )}
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Vitals</span>
                                  <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                    {patient.bloodPressure ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1">
                                        <svg className="h-3.5 w-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.654 0-3 1.346-3 3 0 1.933 3 5 3 5s3-3.067 3-5c0-1.654-1.346-3-3-3z" />
                                        </svg>
                                        BP: {patient.bloodPressure}
                                      </span>
                                    ) : null}
                                    {sugarFormatted ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1">
                                        <svg className="h-3.5 w-3.5 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v5a4 4 0 004 4h6a4 4 0 004-4v-5a2 2 0 00-2-2z" />
                                        </svg>
                                        Sugar: {sugarFormatted}
                                      </span>
                                    ) : null}
                                    {!patient.bloodPressure && !sugarFormatted && (
                                      <span className="text-xs text-slate-400">No vitals recorded</span>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Schedule</span>
                                  <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-1 shadow-sm">
                                      <svg className="h-4 w-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                                      </svg>
                                      {visitTimeFormatted}
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-3 py-1 shadow-sm">
                                      <svg className="h-4 w-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {visitDateFormatted}
                                    </span>
                                  </div>
                                </div>

                                <div className="md:col-span-1 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                                  <span
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                                      patient.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : patient.status === 'in-progress'
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                        : 'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}
                                  >
                                    {patient.status === 'completed'
                                      ? 'Completed'
                                      : patient.status === 'in-progress'
                                      ? 'In Progress'
                                      : 'Waiting'}
                                  </span>
                                </div>

                                <div className="md:col-span-2 flex flex-wrap gap-2 justify-start md:justify-end">
                                  {hasPendingFees && (
                                    <button
                                      onClick={() => handleMarkAsPaid(patient)}
                                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                                    >
                                      Mark as Paid
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setMedicalHistoryPatientId(patient._id)
                                      setMedicalHistoryPatientName(patient.fullName)
                                      setMedicalHistoryPatientMobile(patient.mobileNumber)
                                      setShowMedicalHistoryModal(true)
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                                  >
                                    View History
                                  </button>
                                  {patient.status !== 'completed' && (
                                    <button
                                      onClick={() => handleOpenPrescriptionModal(patient)}
                                      className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                                    >
                                      Add Prescription
                                    </button>
                                  )}
                                  {patient.status === 'completed' && patient.prescription && (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                                      ✓ Prescribed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {todayTotalPages > 1 && (
                        <div className="px-6 pb-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-purple-50/60 border border-purple-100 px-4 py-3">
                            <span className="text-sm text-slate-600">
                              Showing{' '}
                              <span className="font-semibold text-slate-900">
                                {(todayPage - 1) * PAGE_SIZE_TODAY + 1}
                              </span>{' '}
                              –{' '}
                              <span className="font-semibold text-slate-900">
                                {Math.min(todayPage * PAGE_SIZE_TODAY, filteredTodayPatients.length)}
                              </span>{' '}
                              of{' '}
                              <span className="font-semibold text-slate-900">{filteredTodayPatients.length}</span> patients
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setTodayPage((page) => Math.max(1, page - 1))}
                                disabled={todayPage === 1}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                  todayPage === 1
                                    ? 'bg-purple-100 text-purple-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm hover:from-purple-600 hover:to-purple-700'
                                }`}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Prev
                              </button>
                              <span className="text-xs font-semibold text-purple-600">
                                Page {todayPage} / {todayTotalPages}
                              </span>
                              <button
                                onClick={() => setTodayPage((page) => Math.min(todayTotalPages, page + 1))}
                                disabled={todayPage === todayTotalPages}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                  todayPage === todayTotalPages
                                    ? 'bg-purple-100 text-purple-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm hover:from-purple-600 hover:to-purple-700'
                                }`}
                              >
                                Next
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Patient History Tab */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient History</h2>

            {loadingHistory ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : patientHistory.length === 0 ? (
              <div className="bg-white rounded-3xl border border-purple-100 shadow-lg p-12 text-center">
                <p className="text-gray-500 text-lg">No patient history available</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border border-purple-100 rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-6 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Patient History</p>
                      <h3 className="text-xl font-semibold text-slate-800 mt-1">Review previous consultations at a glance</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Showing {filteredHistoryPatients.length} record{filteredHistoryPatients.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 text-purple-600 px-3 py-1.5 text-sm font-semibold shadow-inner">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5a7 7 0 00-7 7v5l1.5 1.5h11L19 17v-5a7 7 0 00-7-7z" />
                        </svg>
                        {patientHistory.filter((patient) => patient.status === 'completed').length} completed visits
                      </div>
                      <input
                        type="text"
                        value={searchHistory}
                        onChange={(e) => setSearchHistory(e.target.value)}
                        placeholder="Search patient, token, issue..."
                        className="w-full sm:w-80 rounded-full border border-purple-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      />
                    </div>
                  </div>

                  {filteredHistoryPatients.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500 border-t border-purple-100 bg-white/70">
                      No matching history entries. Try refining your search.
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:grid grid-cols-12 gap-6 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-white/70 border-t border-purple-100">
                        <span className="col-span-2">Visit</span>
                        <span className="col-span-2">Token</span>
                        <span className="col-span-3">Patient</span>
                        <span className="col-span-2">Issue</span>
                        <span className="col-span-1">Status</span>
                        <span className="col-span-2 text-right">Prescription</span>
                      </div>
                      <div className="px-4 py-5 space-y-4 bg-white/60">
                        {paginatedHistoryPatients.map((patient) => {
                          const hasPendingFees = !patient.isRecheck && patient.feeStatus === 'pending'
                          const hasPrescription = Boolean(patient.prescription)
                          const formattedToken = (patient.tokenNumber ?? '-').toString().padStart(2, '0')
                          const visitDate = new Date(patient.registrationDate || patient.createdAt)
                          const visitDateDisplay = visitDate.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                          const visitTimeDisplay = visitDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })

                          return (
                            <div
                              key={patient._id || `${patient.tokenNumber}-${patient.registrationDate}`}
                              className={`relative rounded-2xl border ${
                                hasPendingFees ? 'border-orange-200 bg-orange-50/40' : 'border-purple-100 bg-white'
                              } shadow-sm transition-all duration-200 hover:shadow-md`}
                            >
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                                  hasPrescription
                                    ? 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600'
                                    : 'bg-gradient-to-b from-purple-400 via-purple-500 to-blue-500'
                                }`}
                              ></div>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 px-5 py-5">
                                <div className="md:col-span-2 space-y-1">
                                  <p className="text-xs font-semibold text-slate-700">Visit Date</p>
                                  <p className="text-sm font-medium text-slate-900">{visitDateDisplay}</p>
                                  <p className="text-xs text-slate-500">{visitTimeDisplay}</p>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Token</span>
                                  <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-600 shadow-sm">
                                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                                    #{formattedToken}
                                  </span>
                                </div>

                                <div className="md:col-span-3 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-800">{patient.fullName}</p>
                                    <span className="text-xs text-slate-500">Age {patient.age}</span>
                                  </div>
                                  <p className="text-xs text-slate-500">Mobile: {patient.mobileNumber || '—'}</p>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {patient.isRecheck || patient.feeStatus === 'not_required' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                        Recheck-up
                                      </span>
                                    ) : (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                          patient.feeStatus === 'paid'
                                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                            : 'border-orange-100 bg-orange-50 text-orange-600'
                                        }`}
                                      >
                                        {patient.feeStatus === 'paid' ? '✓ Fees Paid' : 'Pending Fees'}
                                      </span>
                                    )}
                                    {patient.behaviorRating && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
                                        ★ {patient.behaviorRating}/5
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Issue</span>
                                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600 shadow-sm">
                                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                    {patient.disease || 'Not specified'}
                                  </span>
                                </div>

                                <div className="md:col-span-1 flex flex-col gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                                  <span
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                                      patient.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : patient.status === 'in-progress'
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                        : 'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}
                                  >
                                    {patient.status === 'completed'
                                      ? 'Completed'
                                      : patient.status === 'in-progress'
                                      ? 'In Progress'
                                      : 'Waiting'}
                                  </span>
                                </div>

                                <div className="md:col-span-2 flex flex-col items-start md:items-end justify-between gap-3">
                                  <button
                                    onClick={() => {
                                      setMedicalHistoryPatientId(patient._id)
                                      setMedicalHistoryPatientName(patient.fullName)
                                      setMedicalHistoryPatientMobile(patient.mobileNumber)
                                      setShowMedicalHistoryModal(true)
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                                  >
                                    View History
                                  </button>
                                  {hasPrescription ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                      Prescribed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                                      <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                                      No Prescription
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {historyTotalPages > 1 && (
                        <div className="px-6 pb-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-purple-50/60 border border-purple-100 px-4 py-3">
                            <span className="text-sm text-slate-600">
                              Showing{' '}
                              <span className="font-semibold text-slate-900">
                                {(historyPage - 1) * PAGE_SIZE_HISTORY + 1}
                              </span>{' '}
                              –{' '}
                              <span className="font-semibold text-slate-900">
                                {Math.min(historyPage * PAGE_SIZE_HISTORY, filteredHistoryPatients.length)}
                              </span>{' '}
                              of{' '}
                              <span className="font-semibold text-slate-900">{filteredHistoryPatients.length}</span> records
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                                disabled={historyPage === 1}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                  historyPage === 1
                                    ? 'bg-purple-100 text-purple-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm hover:from-purple-600 hover:to-purple-700'
                                }`}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Prev
                              </button>
                              <span className="text-xs font-semibold text-purple-600">
                                Page {historyPage} / {historyTotalPages}
                              </span>
                              <button
                                onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                                disabled={historyPage === historyTotalPages}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                  historyPage === historyTotalPages
                                    ? 'bg-purple-100 text-purple-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm hover:from-purple-600 hover:to-purple-700'
                                }`}
                              >
                                Next
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Medical Records Tab */}
        {activeTab === 'medical' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold uppercase tracking-wide">Tekisky Records</span>
              <span>Doctor View</span>
            </h2>
            <p className="text-sm text-slate-500 mb-6">Review previously issued prescriptions and regenerate PDFs for your patients.</p>

            {loadingMedical ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : medicalRecords.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">No medical records available</p>
                <p className="text-gray-400 text-sm mt-2">Prescriptions will appear here after you add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <input
                    type="text"
                    value={searchMedical}
                    onChange={(e) => setSearchMedical(e.target.value)}
                    placeholder="Search patient, token, issue..."
                    className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                {filteredMedicalRecords.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500 text-lg">No matching records</p>
                  </div>
                ) : (
                  filteredMedicalRecords.map((patient) => (
                  <div key={patient._id} className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-sm">
                            Token: {patient.tokenNumber}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            ✓ Prescribed
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">{patient.fullName}</h3>
                        <p className="text-sm text-gray-600">
                          {patient.age} years • {patient.mobileNumber} • {patient.disease}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {patient.isRecheck || patient.feeStatus === 'not_required' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                              No Fees Required
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              patient.feeStatus === 'paid'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}>
                              {patient.feeStatus === 'paid' ? '✓ Fees Paid' : '⏳ Pending'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Prescribed on: {new Date(patient.prescription?.createdAt || patient.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {patient.prescription?.pdfPath && getPDFUrl(patient.prescription.pdfPath) ? (
                          <>
                            <button
                              onClick={() => viewPdf(getPDFUrl(patient.prescription.pdfPath))}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View PDF
                            </button>
                            <button
                              onClick={() => handleDownloadPrescription(patient)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M6 20h12" />
                              </svg>
                              Download
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleDownloadPrescription(patient)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                            title="Generate and download PDF"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-3-3m3 3l3-3M6 20h12" />
                            </svg>
                            Download PDF
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Prescription Details */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Diagnosis</h4>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{patient.prescription?.diagnosis || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Medicines Prescribed</h4>
                          <div className="bg-gray-50 p-3 rounded space-y-2">
                            {patient.prescription?.medicines?.map((medicine, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium text-gray-900">{idx + 1}. {medicine.name}</span>
                                <span className="text-gray-600"> • {medicine.dosage} • {medicine.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {patient.prescription?.notes && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{patient.prescription.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-2xl font-bold mb-4">
              Create Prescription - {selectedPatient.fullName}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="diagnosis-options"
                    value={prescriptionData.diagnosis}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                    placeholder="Select or type diagnosis..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm"
                    required
                  />
                  <datalist id="diagnosis-options">
                    {(() => {
                      const specialization = user?.specialization || ''
                      const diagnoses = getDiagnosesForSpecialization(specialization)
                      
                      if (diagnoses.length === 0) {
                        return (
                          <option value="No specific diagnoses available. Please type your diagnosis." disabled>
                            No specific diagnoses available. Please type your diagnosis.
                          </option>
                        )
                      }
                      
                      return diagnoses.map((diagnosis) => (
                        <option key={diagnosis} value={diagnosis}>
                          {diagnosis}
                        </option>
                      ))
                    })()}
                  </datalist>
                </div>
                {user?.specialization && (() => {
                  const diagnoses = getDiagnosesForSpecialization(user.specialization)
                  if (diagnoses.length > 0) {
                    return (
                      <p className="mt-1 text-xs text-gray-500">
                        Suggestions for <span className="font-semibold">{user.specialization}</span>. You can also type a custom diagnosis.
                      </p>
                    )
                  }
                  return (
                    <p className="mt-1 text-xs text-gray-500">
                      No specific diagnoses available for <span className="font-semibold">{user.specialization}</span>. Please type your diagnosis.
                    </p>
                  )
                })()}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Prescribed Medicines *
                  </label>
                  <button
                    type="button"
                    onClick={addMedicineField}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold shadow-sm"
                  >
                    <span className="text-base">➕</span>
                    Add Medicine
                  </button>
                </div>
                {prescriptionData.medicines.map((medicine, index) => (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Medicine</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Start typing to search..."
                            value={medicine.name}
                            onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                          />
                          {loadingSuggestions[index] && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                <span>Searching medicines...</span>
                              </div>
                            </div>
                          )}
                          {!loadingSuggestions[index] && medicineSuggestions[index] && medicineSuggestions[index].length > 0 && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {medicineSuggestions[index].map((suggestion) => (
                                <button
                                  type="button"
                                  key={suggestion}
                                  onClick={() => {
                                    handleMedicineChange(index, 'name', suggestion, { skipLookup: true })
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 border-b border-gray-100 last:border-b-0"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                        <input
                          type="text"
                          placeholder="e.g. 5 days"
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                        />
                      </div>

                      <div className="lg:col-span-5">
                        <fieldset className="border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                          <legend className="text-xs font-semibold text-gray-500 px-1">Dosage Times</legend>
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            {[
                              { key: 'morning', label: 'Morning' },
                              { key: 'afternoon', label: 'Afternoon' },
                              { key: 'night', label: 'Night' }
                            ].map((time) => (
                              <label key={time.key} className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 px-3 py-1 rounded-lg hover:border-purple-300 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={ensureTimesShape(medicine)[time.key]}
                                  onChange={() => handleDosageToggle(index, time.key)}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-medium text-purple-700 text-xs uppercase">{time.label}</span>
                              </label>
                            ))}
                            
                            {/* Additional Instructions Dropdown - Right next to dosage times */}
                            <div className="flex-1 min-w-[200px]">
                              <select
                                value={medicine.dosageInstructions || ''}
                                onChange={(e) => handleMedicineChange(index, 'dosageInstructions', e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-xs bg-white shadow-sm"
                              >
                                <option value="">Additional Instructions...</option>
                                <option value="Take pill after meal 🍛">Take pill after meal 🍛</option>
                                <option value="Take pill before meal 🥗">Take pill before meal 🥗</option>
                                <option value="Take pill with water 💧">Take pill with water 💧</option>
                                <option value="Take pill on empty stomach ☀️">Take pill on empty stomach ☀️</option>
                              </select>
                            </div>
                          </div>
                          {/* Custom Instructions Input (optional) */}
                          <input
                            type="text"
                            placeholder="Custom instructions (optional)"
                            value={medicine.dosageNotes || ''}
                            onChange={(e) => handleMedicineChange(index, 'dosageNotes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                          />
                        </fieldset>
                      </div>
                    </div>
                    {medicine.dosage && (
                      <p className="mt-2 text-xs text-gray-500">Generated dosage: {medicine.dosage}</p>
                    )}
                    {prescriptionData.medicines.length > 1 && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeMedicineField(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Medicine
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes / Test Required
                </label>
                
                {/* Test Dropdown - Based on Doctor's Specialization */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      list="test-options"
                      value={prescriptionData.selectedTest || ''}
                      onChange={(e) => {
                        const selectedTest = e.target.value
                        const currentNotes = prescriptionData.notes || ''
                        
                        // If test is selected, add it to notes if not already present
                        if (selectedTest) {
                          const updatedNotes = currentNotes.includes(selectedTest) 
                            ? currentNotes 
                            : currentNotes 
                              ? `${currentNotes}\n${selectedTest}` 
                              : selectedTest
                          setPrescriptionData({
                            ...prescriptionData,
                            selectedTest,
                            notes: updatedNotes
                          })
                        } else {
                          setPrescriptionData({
                            ...prescriptionData,
                            selectedTest: ''
                          })
                        }
                      }}
                      placeholder="Select or type test..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white shadow-sm text-sm font-medium"
                    />
                    <datalist id="test-options">
                      {(() => {
                        const specialization = user?.specialization || ''
                        const tests = getTestsForSpecialization(specialization)
                        
                        if (tests.length === 0) {
                          return (
                            <option value="No specific tests available. Please type your test." disabled>
                              No specific tests available. Please type your test.
                            </option>
                          )
                        }
                        
                        return tests.map((test) => (
                          <option key={test} value={test}>
                            {test}
                          </option>
                        ))
                      })()}
                    </datalist>
                  </div>
                  {user?.specialization && (() => {
                    const tests = getTestsForSpecialization(user.specialization)
                    if (tests.length > 0) {
                      return (
                        <p className="mt-1 text-xs text-gray-500">
                          Test suggestions for <span className="font-semibold">{user.specialization}</span>. You can also type a custom test.
                        </p>
                      )
                    }
                    return (
                      <p className="mt-1 text-xs text-gray-500">
                        No specific tests available for <span className="font-semibold">{user.specialization}</span>. Please type your test.
                      </p>
                    )
                  })()}
                </div>
                
                {/* Additional Notes Textarea */}
                <textarea
                  value={prescriptionData.notes}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                  rows="3"
                  placeholder="Add any additional notes or observations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitPrescription}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Save & Generate PDF
              </button>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Limit Modal */}
      <PatientLimitModal
        doctor={{ _id: user?.id, fullName: user?.fullName }}
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpdate={fetchDoctorStats}
      />

      {/* Stats Notification Popup */}
      <DoctorStatsNotification
        doctorId={user?.id}
        show={showStatsNotification}
        onClose={() => setShowStatsNotification(false)}
      />

      {/* Profile Photo Upload Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Upload Profile Photo</h3>
            
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-lg border-4 border-gray-200 overflow-hidden">
                  {profileImagePreview ? (
                    <img 
                      src={profileImagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {(user?.fullName || 'D').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image (Max 2MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium border border-gray-300"
                >
                  Choose Image
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUploadProfilePhoto}
                  disabled={!profileImageFile}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                    profileImageFile
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Upload Photo
                </button>
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    setProfileImageFile(null)
                    setProfileImagePreview(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical History Modal */}
      <MedicalHistoryModal
        isOpen={showMedicalHistoryModal}
        onClose={() => {
          setShowMedicalHistoryModal(false)
          setMedicalHistoryPatientId(null)
          setMedicalHistoryPatientName(null)
          setMedicalHistoryPatientMobile(null)
        }}
        patientId={medicalHistoryPatientId}
        patientName={medicalHistoryPatientName}
        patientMobile={medicalHistoryPatientMobile}
      />
    </div>
  )
}

export default DoctorDashboard

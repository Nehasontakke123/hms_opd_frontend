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

const INVENTORY_LIBRARY = {
  injections: [
    {
      name: 'Vitamin B12 Injection',
      code: 'INJ-B12',
      dosage: '1 ml IM',
      usage: 'Vitamin deficiency, fatigue management'
    },
    {
      name: 'Ceftriaxone Injection',
      code: 'INJ-CEF',
      dosage: '1 g IV/IM',
      usage: 'Broad-spectrum antibiotic coverage'
    },
    {
      name: 'Dexamethasone Injection',
      code: 'INJ-DEX',
      dosage: '4 mg IV/IM',
      usage: 'Anti-inflammatory, allergy management'
    },
    {
      name: 'Insulin Regular Injection',
      code: 'INJ-INS',
      dosage: 'As per sliding scale',
      usage: 'Blood sugar stabilization'
    },
    {
      name: 'Ondansetron Injection',
      code: 'INJ-OND',
      dosage: '4 mg IV/IM',
      usage: 'Anti-emetic for nausea/vomiting'
    }
  ],
  surgical: [
    {
      name: 'Sterile Gauze Pads',
      code: 'SUR-GAU',
      dosage: '4x4 inch, pack of 10',
      usage: 'Wound dressing and absorption'
    },
    {
      name: 'Disposable Syringe',
      code: 'SUR-SYR',
      dosage: '5 ml, sterile',
      usage: 'Medication administration'
    },
    {
      name: 'IV Cannula',
      code: 'SUR-IVC',
      dosage: '18G / 20G',
      usage: 'Intravenous access setup'
    },
    {
      name: 'Surgical Gloves',
      code: 'SUR-GLV',
      dosage: 'Latex-free, pair',
      usage: 'Sterile procedure preparation'
    },
    {
      name: 'Suture Kit',
      code: 'SUR-SUT',
      dosage: '3-0 Nylon with needle',
      usage: 'Minor wound closure'
    }
  ]
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

  const [activeTab, setActiveTab] = useState('today') // 'today', 'active', 'emergency', 'history', 'medical', or 'medicine'
  const [patients, setPatients] = useState([])
  const [emergencyPatients, setEmergencyPatients] = useState([])
  const [patientHistory, setPatientHistory] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingEmergency, setLoadingEmergency] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingMedical, setLoadingMedical] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [activePatientFilter, setActivePatientFilter] = useState(null) // Patient ID to filter by
  const [newPatients, setNewPatients] = useState([]) // Newly registered patients
  const seenPatientIdsRef = useRef(new Set()) // Track seen patients using ref to avoid dependency issues
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const notificationRef = useRef(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showStatsNotification, setShowStatsNotification] = useState(true)
  const [doctorStats, setDoctorStats] = useState(null)
  const [searchToday, setSearchToday] = useState('')
  const [searchHistory, setSearchHistory] = useState('')
  const [searchMedical, setSearchMedical] = useState('')
  // Medicine search states
  const [medicineSearch, setMedicineSearch] = useState('')
  const [medicineSearchDebounced, setMedicineSearchDebounced] = useState('')
  const [medicines, setMedicines] = useState([])
  const [loadingMedicines, setLoadingMedicines] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [showMedicineModal, setShowMedicineModal] = useState(false)
  const [medicineCategory, setMedicineCategory] = useState('')
  const [searchMedicineSuggestions, setSearchMedicineSuggestions] = useState([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  const [showInventoryPanel, setShowInventoryPanel] = useState(false)
  const [inventoryTab, setInventoryTab] = useState('injections')
  const [inventorySearch, setInventorySearch] = useState('')
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([])
  const [showInventorySummary, setShowInventorySummary] = useState(true)
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
  const todaysPatientsRef = useRef(null)

  const fetchTodayPatients = useCallback(
    async ({ showLoader = false } = {}) => {
      if (!user?.id) return
      if (showLoader) setLoading(true)
      try {
        const response = await api.get(`/patient/today/${user.id}`)
        const newPatientsList = response.data.data || []
        
        // Deduplicate patients by _id to prevent duplicate entries
        const uniquePatientsMap = new Map()
        newPatientsList.forEach(patient => {
          if (patient._id && !uniquePatientsMap.has(patient._id)) {
            uniquePatientsMap.set(patient._id, patient)
          }
        })
        const deduplicatedPatients = Array.from(uniquePatientsMap.values())
        
        // Detect new patients
        if (seenPatientIdsRef.current.size > 0) {
          const newlyRegistered = deduplicatedPatients.filter(
            patient => patient._id && !seenPatientIdsRef.current.has(patient._id)
          )
          
          if (newlyRegistered.length > 0) {
            setNewPatients(prev => {
              // Add new patients to the list, avoiding duplicates
              const existingIds = new Set(prev.map(p => p._id).filter(Boolean))
              const uniqueNew = newlyRegistered.filter(p => p._id && !existingIds.has(p._id))
              return [...prev, ...uniqueNew]
            })
            
            // Show toast notification for new patients
            if (newlyRegistered.length === 1) {
              toast.success(`New patient registered: ${newlyRegistered[0].fullName}`, {
                icon: '👤',
                duration: 4000
              })
            } else {
              toast.success(`${newlyRegistered.length} new patients registered`, {
                icon: '👥',
                duration: 4000
              })
            }
          }
        }
        
        // Update seen patients
        const newSeenIds = new Set(deduplicatedPatients.map(p => p._id).filter(Boolean))
        seenPatientIdsRef.current = newSeenIds
        
        // Only update state if data actually changed (by comparing patient IDs)
        setPatients(prev => {
          const prevIds = new Set(prev.map(p => p._id).filter(Boolean))
          const newIds = new Set(deduplicatedPatients.map(p => p._id).filter(Boolean))
          
          // If IDs are the same, return previous to prevent re-render
          if (prevIds.size === newIds.size && 
              [...prevIds].every(id => newIds.has(id)) &&
              [...newIds].every(id => prevIds.has(id))) {
            return prev
          }
          
          // Data changed, return deduplicated list
          return deduplicatedPatients
        })
      } catch (error) {
        console.error('Failed to fetch patients:', error)
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

  const fetchEmergencyPatients = useCallback(async (showLoader = false) => {
    if (!user?.id) return
    if (showLoader) setLoadingEmergency(true)
    try {
      const response = await api.get(`/patient/emergency/${user.id}`)
      // Only update state if we have valid data and it's different from current
      const newData = response?.data?.data || response?.data || []
      const emergencyData = Array.isArray(newData) ? newData : []
      
      // Only update if data actually changed to prevent unnecessary re-renders
      // Compare by checking array length and patient IDs for efficiency
      setEmergencyPatients(prev => {
        // If lengths are different, definitely update
        if (prev.length !== emergencyData.length) {
          return emergencyData
        }
        // If both are empty, no update needed
        if (prev.length === 0 && emergencyData.length === 0) {
          return prev
        }
        // Compare patient IDs to see if data actually changed
        const prevIds = new Set(prev.map(p => p._id || p.id).filter(Boolean))
        const newIds = new Set(emergencyData.map(p => p._id || p.id).filter(Boolean))
        
        // If IDs are different, update
        if (prevIds.size !== newIds.size || 
            [...prevIds].some(id => !newIds.has(id)) ||
            [...newIds].some(id => !prevIds.has(id))) {
          return emergencyData
        }
        // Data is the same, return previous to prevent re-render
        return prev
      })
    } catch (error) {
      console.error('Failed to fetch emergency patients:', error)
      // Don't clear existing data on error - preserve what we have
      // Use functional update to check current state without dependency
      setEmergencyPatients(prev => {
        // Only show error if we don't have any data yet
        if (prev.length === 0) {
          toast.error('Failed to fetch emergency patients')
        }
        // Return previous state to preserve it
        return prev
      })
    } finally {
      if (showLoader) setLoadingEmergency(false)
    }
  }, [user?.id])

  // Medicine search functions
  const fetchMedicines = useCallback(async (searchTerm = '', category = '') => {
    setLoadingMedicines(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (category) params.append('category', category)
      params.append('limit', '50')
      params.append('sortBy', 'name')
      params.append('sortOrder', 'asc')

      const response = await api.get(`/inventory/medicines?${params.toString()}`)
      setMedicines(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch medicines:', error)
      toast.error('Failed to fetch medicines')
      setMedicines([])
    } finally {
      setLoadingMedicines(false)
    }
  }, [])

  const fetchSearchMedicineSuggestions = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchMedicineSuggestions([])
      return
    }
    try {
      const response = await api.get(`/inventory/medicines/search/suggestions?query=${encodeURIComponent(searchTerm)}`)
      setSearchMedicineSuggestions(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSearchMedicineSuggestions([])
    }
  }, [])

  // Debounce medicine search
  useEffect(() => {
    const timer = setTimeout(() => {
      setMedicineSearchDebounced(medicineSearch)
    }, 300)

    return () => clearTimeout(timer)
  }, [medicineSearch])

  // Fetch medicines when debounced search changes
  useEffect(() => {
    if (activeTab === 'medicine') {
      fetchMedicines(medicineSearchDebounced, medicineCategory)
    }
  }, [medicineSearchDebounced, medicineCategory, activeTab, fetchMedicines])

  // Fetch suggestions for auto-complete
  useEffect(() => {
    if (medicineSearch && medicineSearch.length >= 2) {
      fetchSearchMedicineSuggestions(medicineSearch)
      setShowSearchSuggestions(true)
    } else {
      setSearchMedicineSuggestions([])
      setShowSearchSuggestions(false)
    }
  }, [medicineSearch, fetchSearchMedicineSuggestions])

  // Voice search setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setMedicineSearch(transcript)
        setIsListening(false)
        toast.success('Voice search completed')
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.')
        } else {
          toast.error('Voice search failed. Please try again.')
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startVoiceSearch = () => {
    if (!recognitionRef.current) {
      toast.error('Voice search is not supported in your browser')
      return
    }
    try {
      setIsListening(true)
      recognitionRef.current.start()
      toast.success('Listening... Speak the medicine name')
    } catch (error) {
      console.error('Failed to start voice search:', error)
      setIsListening(false)
      toast.error('Failed to start voice search')
    }
  }

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleMedicineSelect = (medicine) => {
    setSelectedMedicine(medicine)
    setShowMedicineModal(true)
    setShowSearchSuggestions(false)
  }

  const handleSuggestionClick = (suggestion) => {
    setMedicineSearch(suggestion.name)
    setShowSearchSuggestions(false)
    fetchMedicines(suggestion.name, medicineCategory)
  }

  const clearMedicineSearch = () => {
    setMedicineSearch('')
    setMedicineCategory('')
    setSearchMedicineSuggestions([])
    setShowSearchSuggestions(false)
    fetchMedicines('', '')
  }

  // Export medicines to PDF
  const exportMedicinesToPDF = () => {
    // This would use jsPDF - implementation similar to prescription PDF
    toast.success('PDF export feature coming soon')
  }

  // Export medicines to Excel
  const exportMedicinesToExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (medicineSearchDebounced) params.append('search', medicineSearchDebounced)
      if (medicineCategory) params.append('category', medicineCategory)
      
      const response = await api.get(`/inventory/export/excel?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `medicines_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Medicines exported to Excel successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export medicines')
    }
  }

  // Initial load - only run once when user.id is available
  useEffect(() => {
    if (user?.id) {
      fetchTodayPatients({ showLoader: true })
      fetchDoctorStats()
    }
    // Only depend on user?.id to prevent re-runs on tab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    
    // Use ref to track if component is mounted to prevent state updates after unmount
    let isMounted = true
    
    const interval = setInterval(() => {
      if (!isMounted) return
      
      // Only fetch if we're on relevant tabs to prevent unnecessary API calls
      if (activeTab === 'today' || activeTab === 'active') {
        fetchTodayPatients()
        fetchDoctorStats()
      }
      // Only fetch emergency patients if we're currently viewing the emergency tab
      if (activeTab === 'emergency') {
        fetchEmergencyPatients(false)
      }
    }, 5000)
    
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user?.id, activeTab, fetchTodayPatients, fetchDoctorStats, fetchEmergencyPatients])

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

  const openMedicalHistory = (patient) => {
    if (!patient?._id) return
    setMedicalHistoryPatientId(patient._id)
    setMedicalHistoryPatientName(patient.fullName)
    setMedicalHistoryPatientMobile(patient.mobileNumber)
    setShowMedicalHistoryModal(true)
  }

  const handleShowTodaysPatients = () => {
    setActiveTab('today')
    setSearchToday('')
    setActivePatientFilter(null)
    requestAnimationFrame(() => {
      todaysPatientsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handlePatientNotificationClick = (patient) => {
    setActivePatientFilter(patient._id)
    setSelectedPatient(patient)
    setActiveTab('active')
    setShowNotificationDropdown(false)
    // Remove from new patients list if it was a new patient
    setNewPatients(prev => prev.filter(p => p._id !== patient._id))
    toast.success(`Viewing patient: ${patient.fullName}`, { icon: '👤' })
  }

  const handleClearActiveFilter = () => {
    setActivePatientFilter(null)
    setSelectedPatient(null)
    setActiveTab('today')
  }

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    } else if (activeTab === 'emergency') {
      // Only fetch when switching to emergency tab, with loader
      fetchEmergencyPatients(true)
    } else if (activeTab === 'medical') {
      fetchMedicalRecords()
    } else if (activeTab === 'today' || activeTab === 'active') {
      fetchTodayPatients()
      fetchDoctorStats()
    }
  }, [activeTab, fetchPatientHistory, fetchMedicalRecords, fetchTodayPatients, fetchDoctorStats, fetchEmergencyPatients])

  // Ensure diagnosis is pre-filled when prescription modal opens
  useEffect(() => {
    if (showPrescriptionModal && selectedPatient && !prescriptionData.diagnosis) {
      const initialDiagnosis = selectedPatient?.prescription?.diagnosis || selectedPatient?.disease || ''
      if (initialDiagnosis) {
        setPrescriptionData(prev => ({
          ...prev,
          diagnosis: initialDiagnosis
        }))
      }
    }
  }, [showPrescriptionModal, selectedPatient])

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

  const filteredInventoryItems = useMemo(() => {
    const catalog = INVENTORY_LIBRARY[inventoryTab] || []
    if (!inventorySearch.trim()) return catalog
    const q = inventorySearch.toLowerCase()
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.usage.toLowerCase().includes(q)
    )
  }, [inventoryTab, inventorySearch])

  const toggleInventoryItem = (item) => {
    setSelectedInventoryItems((prev) => {
      const exists = prev.some((selected) => selected.code === item.code)
      if (exists) {
        return prev.filter((selected) => selected.code !== item.code)
      }
      return [...prev, item]
    })
  }

  const appendInventorySelectionToNotes = () => {
    if (selectedInventoryItems.length === 0) {
      toast.error('Select at least one item to add to notes')
      return
    }

    const summary = selectedInventoryItems
      .map((item) => `${item.name} (${item.code})`)
      .join(', ')

    setPrescriptionData((prev) => {
      const existing = prev.notes?.trim()
      const addition = `Items required: ${summary}`
      return {
        ...prev,
        notes: existing ? `${existing}\n${addition}` : addition
      }
    })

    setShowInventorySummary(true)

    toast.success('Selected items added to notes')
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
    const baseURL = api.defaults.baseURL || (import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api')
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
    
    // Priority: Use existing prescription diagnosis if available, otherwise use patient's disease/health issue
    const initialDiagnosis = patient?.prescription?.diagnosis || patient?.disease || ''
    
    setPrescriptionData({
      diagnosis: initialDiagnosis, // Auto-fill diagnosis from existing prescription or patient registration
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
    setShowInventoryPanel(false)
    setInventoryTab('injections')
    setInventorySearch('')
    setSelectedInventoryItems([])
    setShowInventorySummary(true)
    setShowPrescriptionModal(true)
  }

  const handleClosePrescriptionModal = () => {
    setShowPrescriptionModal(false)
    setShowInventoryPanel(false)
    setInventoryTab('injections')
    setInventorySearch('')
    setSelectedInventoryItems([])
    setShowInventorySummary(true)
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
        createdAt: new Date(),
        inventoryItems: selectedInventoryItems.map((item) => ({
          name: item.name,
          code: item.code,
          usage: item.usage,
          dosage: item.dosage
        }))
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
        inventoryItems: selectedInventoryItems.map((item) => ({
          name: item.name,
          code: item.code,
          usage: item.usage,
          dosage: item.dosage
        })),
        pdfData: pdfBase64 // Send PDF as base64
      })

      toast.success(response.data.message || 'Prescription saved, PDF generated and stored in medical section!')
      
      // Update selected patient with the response data if it's the same patient
      if (selectedPatient && response.data.data) {
        setSelectedPatient(response.data.data)
      }
      
      handleClosePrescriptionModal()
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
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB. Please compress or select a smaller image.')
        if (e.target) {
          e.target.value = ''
        }
        return
      }
      
      // Validate MIME type - accept common image formats (including mobile variations)
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ]
      
      // Normalize MIME type (handle variations like image/jpeg vs image/jpg, and mobile-specific types)
      let normalizedMimeType = file.type.toLowerCase().trim()
      
      // Handle mobile-specific MIME type variations
      // Some mobile devices may report different MIME types
      if (!normalizedMimeType && file.name) {
        const ext = file.name.toLowerCase().split('.').pop()
        const mimeMap = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
          'gif': 'image/gif'
        }
        normalizedMimeType = mimeMap[ext] || ''
      }
      
      // Check if MIME type is valid
      const isValidMimeType = normalizedMimeType && (
        normalizedMimeType.startsWith('image/') && 
        (allowedMimeTypes.includes(normalizedMimeType) ||
         normalizedMimeType === 'image/jpeg' ||
         normalizedMimeType.includes('jpeg') ||
         normalizedMimeType.includes('jpg'))
      )
      
      // Additional validation: Check file extension as fallback (important for mobile)
      const fileName = file.name.toLowerCase()
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
      
      // File must have valid MIME type OR valid extension (mobile-friendly)
      if (!isValidMimeType && !hasValidExtension) {
        toast.error('Only image files are allowed (JPG, JPEG, PNG, WEBP). Please select a valid image file.')
        // Reset file input
        if (e.target) {
          e.target.value = ''
        }
        return
      }
      
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result)
      }
      reader.onerror = () => {
        toast.error('Failed to read image file. Please try another image or check if the file is corrupted.')
        if (e.target) {
          e.target.value = ''
        }
        setProfileImageFile(null)
        setProfileImagePreview(null)
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
      // Mobile-friendly: Ensure proper headers and error handling
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api'}/doctor/${user?.id}/profile-image`
      
      // Create AbortController for timeout (mobile-friendly)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        },
        body: formData,
        signal: controller.signal
      }).catch((fetchError) => {
        clearTimeout(timeoutId)
        // Handle network errors (common on mobile)
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout — please check your connection and try again')
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          throw new Error('Network error — please check your internet connection')
        }
        throw fetchError
      })
      
      clearTimeout(timeoutId)

      // Mobile-friendly: Handle response parsing errors
      let data
      try {
        const responseText = await response.text()
        if (!responseText) {
          throw new Error('Empty response from server')
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Response parsing error:', parseError)
        throw new Error('Server response error — please try again')
      }

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
      // Mobile-friendly error messages
      if (error.message && error.message.includes('fetch')) {
        toast.error('Upload failed — please check your internet connection and try again')
      } else if (error.message && error.message.includes('network')) {
        toast.error('Network error — please try again or select a valid image')
      } else {
        toast.error(error.message || 'Upload failed — please try again or select a valid image')
      }
    }
  }

  const handleRemoveProfilePhoto = async () => {
    if (!user?.id) {
      toast.error('User information not available')
      return
    }

    if (!window.confirm('Are you sure you want to remove your profile photo? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api'}/doctor/${user.id}/profile-image`
      
      // Mobile-friendly: Add timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }).catch((fetchError) => {
        clearTimeout(timeoutId)
        // Handle network errors (common on mobile)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout — please check your connection and try again')
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          throw new Error('Network error — please check your internet connection')
        }
        throw fetchError
      })
      
      clearTimeout(timeoutId)

      // Mobile-friendly: Handle response parsing errors
      let data
      try {
        const responseText = await response.text()
        if (!responseText) {
          throw new Error('Empty response from server')
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Response parsing error:', parseError)
        throw new Error('Server response error — please try again')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove profile photo')
      }

      // Update user data in context
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedUser = {
        ...currentUser,
        profileImage: null
      }
      
      if (setUserData) {
        setUserData(updatedUser)
      } else {
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
      
      // Fetch complete updated user data from backend
      if (updateUser) {
        try {
          await updateUser()
        } catch (err) {
          console.error('Failed to fetch updated user from backend:', err)
        }
      }

      toast.success('Profile photo removed successfully!')
      setShowProfileModal(false)
      setProfileImageFile(null)
      setProfileImagePreview(null)
      
      // Small delay to let toast show, then reload
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Remove error:', error)
      // Mobile-friendly error messages
      if (error.message && error.message.includes('fetch')) {
        toast.error('Remove failed — please check your internet connection and try again')
      } else if (error.message && error.message.includes('network')) {
        toast.error('Network error — please try again')
      } else {
        toast.error(error.message || 'Failed to remove profile photo. Please try again.')
      }
    }
  }

  const openProfileModal = () => {
    setShowProfileModal(true)
    setProfileImagePreview(user?.profileImage || null)
  }

  // Deduplicate patients before filtering to prevent duplicate entries in UI
  const uniquePatients = useMemo(() => {
    const seenIds = new Set()
    return patients.filter(patient => {
      if (!patient._id) return false
      if (seenIds.has(patient._id)) {
        console.warn('Duplicate patient detected:', patient._id, patient.fullName)
        return false
      }
      seenIds.add(patient._id)
      return true
    })
  }, [patients])

  const filteredTodayPatients = filterPatients(uniquePatients, searchToday)
    .slice()
    .filter(patient => {
      // If active patient filter is set, only show that patient
      if (activePatientFilter) {
        return patient._id === activePatientFilter
      }
      return true
    })
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

  const inventorySelectionSummary = selectedInventoryItems.length > 0 ? (
    <div className="mb-6 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-purple-50/80 shadow-sm">
      <button
        type="button"
        onClick={() => setShowInventorySummary((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 shadow-inner">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8m12 0a8 8 0 11-16 0 8 8 0 0116 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-purple-900">Added Injections &amp; Surgical Items</p>
            <p className="text-xs text-purple-500">{selectedInventoryItems.length} item{selectedInventoryItems.length > 1 ? 's' : ''} included below.</p>
          </div>
        </div>
        <span className={`transition-transform duration-200 ${showInventorySummary ? 'rotate-0' : '-rotate-90'}`}>
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {showInventorySummary && (
        <div className="border-t border-purple-100 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            {selectedInventoryItems.map((item) => (
              <div
                key={item.code}
                className="group relative overflow-hidden rounded-xl border border-purple-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 opacity-80" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-purple-600 transition">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.usage}</p>
                  </div>
                  <span className="ml-3 inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                    {item.code}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  <span>Recommended dose: <span className="font-semibold">{item.dosage}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      {/* CSS Animations for Modal */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
      
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
              {/* Notification Icon */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => {
                    const wasOpen = showNotificationDropdown
                    setShowNotificationDropdown(!showNotificationDropdown)
                    // Clear new patients indicator when opening the dropdown (doctor has viewed the list)
                    if (!wasOpen && newPatients.length > 0) {
                      setNewPatients([])
                    }
                  }}
                  className={`relative p-2 rounded-lg transition-all duration-200 ${
                    newPatients.length > 0 && !showNotificationDropdown
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 animate-pulse'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  title={
                    newPatients.length > 0 && !showNotificationDropdown 
                      ? `${newPatients.length} new patient${newPatients.length > 1 ? 's' : ''} arrived! (${patients.length} total waiting)` 
                      : `${patients.length} patient${patients.length !== 1 ? 's' : ''} waiting today`
                  }
                >
                  <svg 
                    className={`w-6 h-6 transition-transform duration-200 ${
                      newPatients.length > 0 && !showNotificationDropdown ? 'animate-bounce' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Patient count badge - always visible when there are patients */}
                  {patients.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-[10px] sm:text-xs font-bold text-white shadow-lg ring-2 ring-white z-10">
                      {patients.length > 99 ? '99+' : patients.length}
                    </span>
                  )}
                  {/* New patients pulsing indicator - only when there are new patients */}
                  {newPatients.length > 0 && !showNotificationDropdown && (
                    <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center pointer-events-none">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 flex items-center justify-between">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Patients Today ({patients.length})
                        {newPatients.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                            {newPatients.length} new
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowNotificationDropdown(false)}
                        className="text-white hover:text-gray-200 text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {patients.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-sm">No patients registered today</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {patients
                            .slice()
                            .sort((a, b) => {
                              const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime()
                              const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime()
                              return dateB - dateA
                            })
                            .map((patient) => {
                              const isNew = newPatients.some(p => p._id === patient._id)
                              return (
                                <button
                                  key={patient._id}
                                  onClick={() => handlePatientNotificationClick(patient)}
                                  className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors duration-150 group ${
                                    isNew ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="relative flex-shrink-0">
                                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-md ${
                                        isNew ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                                      }`}>
                                        {patient.fullName?.charAt(0).toUpperCase() || 'P'}
                                      </div>
                                      {isNew && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                          <span className="text-[8px] text-white font-bold">!</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                                            {patient.fullName}
                                          </p>
                                          {isNew && (
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                                              NEW
                                            </span>
                                          )}
                                        </div>
                                        <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                                          #{patient.tokenNumber}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-1">
                                        {patient.disease || 'No issue specified'}
                                      </p>
                                      <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {patient.age && (
                                          <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {patient.age} {patient.gender ? `• ${patient.gender}` : ''}
                                          </span>
                                        )}
                                        {patient.mobileNumber && (
                                          <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            {patient.mobileNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </button>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
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
                  <button
                    type="button"
                    onClick={handleShowTodaysPatients}
                    className="text-left px-3 py-2 rounded-lg transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      Today's Patients
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </p>
                    <p className="text-2xl font-bold text-gray-800">{doctorStats.todayPatientCount}</p>
                  </button>
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
              onClick={() => {
                setActiveTab('today')
                setActivePatientFilter(null)
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients Today
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'active'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Patients
              {activePatientFilter && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold animate-pulse">
                  Active
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'emergency'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Emergency
              {emergencyPatients.length > 0 && (
                <>
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                    {emergencyPatients.length}
                  </span>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </>
              )}
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
            <button
              onClick={() => setActiveTab('medicine')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'medicine'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View Medicine
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Patients Today Tab */}
        {activeTab === 'today' && (
          <div ref={todaysPatientsRef}>
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

                          // Check if patient is waiting (not completed and not in-progress)
                          const isWaiting = patient.status !== 'completed' && patient.status !== 'in-progress'
                          
                          // Handle row click - open prescription modal for Waiting status, otherwise open medical history
                          const handleRowClick = (event) => {
                            // Don't trigger if clicking on buttons or interactive elements
                            if (event.target.closest('button') || event.target.closest('a')) {
                              return
                            }
                            
                            if (isWaiting) {
                              // Open prescription modal for waiting patients
                              handleOpenPrescriptionModal(patient)
                            } else {
                              // Open medical history for completed or in-progress patients
                              openMedicalHistory(patient)
                            }
                          }

                          return (
                            <div
                              key={patient._id}
                              role="button"
                              tabIndex={0}
                              aria-label={isWaiting ? `Add prescription for ${patient.fullName}` : `View medical history for ${patient.fullName}`}
                              onClick={handleRowClick}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  if (isWaiting) {
                                    handleOpenPrescriptionModal(patient)
                                  } else {
                                    openMedicalHistory(patient)
                                  }
                                }
                              }}
                              className={`relative rounded-2xl border ${
                                hasPendingFees ? 'border-orange-200 bg-orange-50/40' : 'border-purple-100 bg-white'
                              } shadow-sm transition-all duration-200 hover:shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/60 ${
                                isWaiting ? 'hover:border-purple-300' : ''
                              }`}
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
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleMarkAsPaid(patient)
                                      }}
                                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                                    >
                                      Mark as Paid
                                    </button>
                                  )}
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openMedicalHistory(patient)
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                                  >
                                    View History
                                  </button>
                                  {patient.status !== 'completed' && (
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleOpenPrescriptionModal(patient)
                                      }}
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

        {/* Active Patients Tab */}
        {activeTab === 'active' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Active Patients</h2>
              {activePatientFilter && (
                <button
                  onClick={handleClearActiveFilter}
                  className="px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filter
                </button>
              )}
            </div>

            {!activePatientFilter ? (
              <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-3xl shadow-lg p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Patient Selected</h3>
                  <p className="text-gray-600 mb-4">
                    Click on a patient from the notification dropdown or select a patient from "Patients Today" to view their details here.
                  </p>
                  <button
                    onClick={() => setActiveTab('today')}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                  >
                    View All Patients
                  </button>
                </div>
              </div>
            ) : filteredTodayPatients.length === 0 ? (
              <div className="bg-white rounded-3xl border border-purple-100 shadow-lg p-12 text-center">
                <p className="text-gray-500 text-lg">Patient not found or no longer available.</p>
                <button
                  onClick={handleClearActiveFilter}
                  className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Clear Filter
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Consultation Header */}
                <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border border-purple-100 rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-6 py-6 bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-white/90">Active Consultation</p>
                          <h3 className="text-2xl font-bold text-white mt-1">Currently Treating Patient</h3>
                        </div>
                      </div>
                      <span className="px-5 py-2.5 bg-white/25 backdrop-blur-sm text-white rounded-full text-sm font-bold shadow-lg ring-2 ring-white/30 animate-pulse">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-6 space-y-6">
                    {filteredTodayPatients.map((patient) => {
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
                          : 'N/A'

                      return (
                        <div
                          key={patient._id}
                          className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                        >
                          {/* Patient Header */}
                          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 px-6 py-5 border-b-2 border-purple-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                <div className="relative">
                                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-purple-100">
                                    {patient.fullName?.charAt(0).toUpperCase() || 'P'}
                                  </div>
                                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full border-3 border-white flex items-center justify-center shadow-lg">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{patient.fullName}</h4>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-sm font-bold shadow-sm border border-purple-200">
                                      <span className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                                      Token #{formattedToken}
                                    </span>
                                    {patient.age && (
                                      <span className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">
                                        {patient.age} {patient.gender ? `• ${patient.gender}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right bg-white/80 rounded-xl px-4 py-3 border border-purple-100 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Mobile</p>
                                <p className="text-base font-bold text-gray-900">{patient.mobileNumber}</p>
                              </div>
                            </div>
                          </div>

                          {/* Patient Details Grid */}
                          <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gradient-to-br from-white to-purple-50/30">
                            {/* Left Column */}
                            <div className="space-y-5">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Health Issue
                                </p>
                                <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                                  <span className="h-3 w-3 rounded-full bg-blue-500 shadow-sm"></span>
                                  <p className="font-bold text-lg text-gray-900">{patient.disease || 'Not specified'}</p>
                                </div>
                              </div>

                              {/* Diagnosis Section - Show prescription diagnosis if available */}
                              {patient.prescription?.diagnosis && (
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Diagnosis
                                  </p>
                                  <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                                    <span className="h-3 w-3 rounded-full bg-green-500 shadow-sm"></span>
                                    <p className="font-bold text-lg text-gray-900">{patient.prescription.diagnosis}</p>
                                  </div>
                                </div>
                              )}

                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  Vitals
                                </p>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-sm">
                                    <span className="h-3 w-3 rounded-full bg-purple-500 shadow-sm"></span>
                                    <span className="text-sm font-semibold text-gray-600">BP:</span>
                                    <span className="font-bold text-lg text-gray-900">{patient.bloodPressure || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-sm">
                                    <span className="h-3 w-3 rounded-full bg-purple-500 shadow-sm"></span>
                                    <span className="text-sm font-semibold text-gray-600">Sugar:</span>
                                    <span className="font-bold text-lg text-gray-900">{sugarFormatted}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-5">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Schedule
                                </p>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border-2 border-slate-200 shadow-sm">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-base font-bold text-gray-900">{visitDateFormatted}</span>
                                  </div>
                                  <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border-2 border-slate-200 shadow-sm">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-base font-bold text-gray-900">{visitTimeFormatted}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Status
                                </p>
                                <span className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${
                                  patient.status === 'completed'
                                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-2 border-green-300'
                                    : patient.status === 'in-progress'
                                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-2 border-yellow-300'
                                    : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-2 border-purple-300'
                                }`}>
                                  <span className={`w-3 h-3 rounded-full shadow-sm ${
                                    patient.status === 'completed' ? 'bg-green-500'
                                    : patient.status === 'in-progress' ? 'bg-yellow-500'
                                    : 'bg-purple-500 animate-pulse'
                                  }`}></span>
                                  {patient.status === 'completed' ? 'Completed' : patient.status === 'in-progress' ? 'In Progress' : 'Waiting'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-purple-50/50 border-t-2 border-purple-100 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              {patient.feeStatus === 'paid' && (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-bold border-2 border-green-300 shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Fees Paid
                                </span>
                              )}
                              {patient.behaviorRating && (
                                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 text-sm font-bold border-2 border-yellow-300 shadow-sm">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                  {patient.behaviorRating}/5
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openMedicalHistory(patient)}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 transition-all font-bold text-sm flex items-center gap-2 shadow-sm hover:shadow-md"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View History
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPatient(patient)
                                  setShowPrescriptionModal(true)
                                }}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:via-purple-800 hover:to-blue-700 transition-all font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Prescription
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency Tab */}
        {activeTab === 'emergency' && (
          <div key="emergency-tab-content">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold uppercase tracking-wide">Emergency</span>
              <span>Emergency Patients</span>
            </h2>

            {loadingEmergency ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-500">Loading emergency patients...</p>
              </div>
            ) : emergencyPatients.length === 0 ? (
              <div className="bg-white rounded-3xl border border-red-100 shadow-lg p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-semibold">No Emergency Patients</p>
                <p className="text-gray-400 text-sm mt-2">Emergency patients will appear here when registered.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white via-red-50 to-orange-50 border border-red-100 rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-6 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Emergency Queue</p>
                      <h3 className="text-xl font-semibold text-slate-800 mt-1">Urgent patient care required</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {emergencyPatients.length} {emergencyPatients.length === 1 ? 'emergency patient' : 'emergency patients'} requiring immediate attention
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-100 text-red-600 px-4 py-2 text-sm font-semibold shadow-inner">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {emergencyPatients.length} Urgent
                    </div>
                  </div>

                  <div className="px-4 py-5 space-y-4 bg-white/60">
                    {emergencyPatients.map((patient) => {
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
                          className="relative rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50 shadow-lg transition-all duration-200 hover:shadow-xl"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl bg-gradient-to-b from-red-500 via-red-600 to-orange-600"></div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 px-6 py-5">
                            <div className="md:col-span-3 flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full font-semibold text-white shadow-md bg-gradient-to-br from-red-500 to-orange-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800">{patient.fullName}</p>
                                  <span className="text-xs text-slate-500">• {patient.age} yrs</span>
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                                    EMERGENCY
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
                                </div>
                              </div>
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-2">
                              <span className="text-xs uppercase tracking-wide text-slate-400">Issue</span>
                              <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                {patient.disease || 'Not specified'}
                              </span>
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-2">
                              <span className="text-xs uppercase tracking-wide text-slate-400">Vitals</span>
                              <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                {patient.bloodPressure ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1">
                                    <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.654 0-3 1.346-3 3 0 1.933 3 5 3 5s3-3.067 3-5c0-1.654-1.346-3-3-3z" />
                                    </svg>
                                    BP: {patient.bloodPressure}
                                  </span>
                                ) : null}
                                {sugarFormatted ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1">
                                    <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                                <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-white px-3 py-1 shadow-sm">
                                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {visitTimeFormatted}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-white px-3 py-1 shadow-sm">
                                  <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {visitDateFormatted}
                                </span>
                              </div>
                            </div>

                            <div className="md:col-span-1 flex flex-col gap-2">
                              <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                              <span className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                                Urgent
                              </span>
                            </div>

                            <div className="md:col-span-2 flex flex-wrap gap-2 justify-start md:justify-end">
                              {!patient.isRecheck && patient.feeStatus === 'pending' && (
                                <button
                                  onClick={() => handleMarkAsPaid(patient)}
                                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                                >
                                  Mark as Paid
                                </button>
                              )}
                              <button
                                onClick={() => openMedicalHistory(patient)}
                                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                              >
                                View History
                              </button>
                              {patient.status !== 'completed' && (
                                <button
                                  onClick={() => handleOpenPrescriptionModal(patient)}
                                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
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

        {/* View Medicine Tab */}
        {activeTab === 'medicine' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold uppercase tracking-wide">💊</span>
                  <span>View Medicine</span>
                </h2>
                <p className="text-sm text-gray-500">Search medicines by name or composition in real-time</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportMedicinesToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel
                </button>
              </div>
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6">
              <div className="space-y-4">
                {/* Search Bar with Voice Search */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={medicineSearch}
                        onChange={(e) => {
                          setMedicineSearch(e.target.value)
                          setShowSearchSuggestions(true)
                        }}
                        onFocus={() => {
                          if (searchMedicineSuggestions.length > 0) setShowSearchSuggestions(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSearchSuggestions(false), 200)
                        }}
                        placeholder="Search by medicine name or composition..."
                        className="w-full pl-12 pr-32 py-3 border-2 border-green-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition text-sm"
                      />
                      {medicineSearch && (
                        <button
                          onClick={clearMedicineSearch}
                          className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {isListening && (
                        <div className="absolute right-24 top-1/2 -translate-y-1/2 flex items-center gap-2 text-red-500">
                          <span className="animate-pulse">●</span>
                          <span className="text-xs font-semibold">Listening...</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition ${
                        isListening
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                      title="Voice Search"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>

                  {/* Auto-suggestions Dropdown */}
                  {showSearchSuggestions && searchMedicineSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-green-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {searchMedicineSuggestions.slice(0, 5).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 transition border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-green-600">💊</span>
                            <div>
                              <p className="font-semibold text-gray-800">{suggestion.name}</p>
                              {suggestion.genericName && (
                                <p className="text-xs text-gray-500">{suggestion.genericName}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-gray-700">Filter by Category:</label>
                  <select
                    value={medicineCategory}
                    onChange={(e) => setMedicineCategory(e.target.value)}
                    className="px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Painkillers">Painkillers</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Hypertension">Hypertension</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {loadingMedicines ? (
              <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Searching medicines...</p>
              </div>
            ) : medicines.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 text-lg font-semibold mb-2">No medicines found</p>
                <p className="text-gray-400 text-sm">
                  {medicineSearchDebounced
                    ? 'Try adjusting your search terms or filters'
                    : 'Start typing to search for medicines'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-50 to-green-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">💊 Medicine</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🧪 Composition</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">💰 Price</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🕒 Dosage</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🏭 Manufacturer</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📦 Stock</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {medicines.map((medicine) => (
                        <tr key={medicine._id} className="hover:bg-green-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{medicine.name}</p>
                              {medicine.brandName && (
                                <p className="text-xs text-gray-500">{medicine.brandName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{medicine.genericName || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-semibold text-green-600">₹{medicine.price || 0}</p>
                            {medicine.unit && (
                              <p className="text-xs text-gray-500">per {medicine.unit}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">
                              {medicine.strength || 'N/A'} {medicine.form || ''}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700">{medicine.manufacturer || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              (medicine.stockQuantity || 0) <= (medicine.minStockLevel || 10)
                                ? 'bg-red-100 text-red-800'
                                : (medicine.stockQuantity || 0) > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {medicine.stockQuantity || 0} {medicine.unit || 'units'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleMedicineSelect(medicine)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={handleClosePrescriptionModal}
        >
          <div 
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Close Button */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Create Prescription - {selectedPatient.fullName}
                </h3>
                <button
                  onClick={handleClosePrescriptionModal}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
                  aria-label="Close modal"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
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
                <div className={`flex flex-col ${showInventoryPanel ? 'lg:flex-row lg:items-start lg:gap-6' : ''}`}>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Prescribed Medicines *
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowInventoryPanel((prev) => !prev)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition shadow-sm ${
                            showInventoryPanel
                              ? 'border-purple-300 bg-purple-100 text-purple-700'
                              : 'border-purple-200 bg-white text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" />
                          </svg>
                          {showInventoryPanel ? 'Hide' : 'View'} Injections & Surgical Items
                          {selectedInventoryItems.length > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-purple-600 text-white text-[11px] px-2 py-0.5">
                              {selectedInventoryItems.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={addMedicineField}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold shadow-sm"
                        >
                          <span className="text-base">➕</span>
                          Add Medicine
                        </button>
                      </div>
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
                                    <option value="Take the tablet after meals | जेवणानंतर गोळी घ्या | भोजन के बाद टैबलेट लें">
                                      Take the tablet after meals | जेवणानंतर गोळी घ्या | भोजन के बाद टैबलेट लें
                                    </option>
                                    <option value="Take the tablet before meals | जेवणापूर्वी गोळी घ्या | भोजन से पहले टैबलेट लें">
                                      Take the tablet before meals | जेवणापूर्वी गोळी घ्या | भोजन से पहले टैबलेट लें
                                    </option>
                                    <option value="Take the tablet with water | पाण्यासोबत गोळी घ्या | पानी के साथ टैबलेट लें">
                                      Take the tablet with water | पाण्यासोबत गोळी घ्या | पानी के साथ टैबलेट लें
                                    </option>
                                    <option value="Take the tablet on an empty stomach | रिकाम्या पोटी गोळी घ्या | खाली पेट टैबलेट लें">
                                      Take the tablet on an empty stomach | रिकाम्या पोटी गोळी घ्या | खाली पेट टैबलेट लें
                                    </option>
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

                  {showInventoryPanel && (
                    <aside className="mt-4 lg:mt-0 lg:w-80 w-full bg-purple-50/60 border border-purple-100 rounded-2xl p-4 shadow-inner">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-purple-900">Injections & Surgical Items</h4>
                          <p className="text-[11px] text-purple-600">Quickly reference inventory without leaving the chart.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInventoryPanel(false)
                            setInventorySearch('')
                          }}
                          className="text-xs text-purple-500 hover:text-purple-700 font-semibold"
                        >
                          Close
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-2 bg-white border border-purple-100 rounded-xl p-1.5">
                        {[
                          { key: 'injections', label: 'Injections' },
                          { key: 'surgical', label: 'Surgical Items' }
                        ].map((tab) => {
                          const active = inventoryTab === tab.key
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => {
                                setInventoryTab(tab.key)
                                setInventorySearch('')
                              }}
                              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                active
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'text-purple-600 hover:bg-purple-100'
                              }`}
                            >
                              {tab.label}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-3">
                        <div className="relative">
                          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                          </svg>
                          <input
                            type="text"
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder={`Search ${inventoryTab === 'injections' ? 'injections' : 'surgical items'}...`}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-300 bg-white shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                        {filteredInventoryItems.length === 0 ? (
                          <div className="rounded-xl border border-purple-100 bg-white px-3 py-4 text-center text-xs text-purple-500">
                            No items found. Try a different search term.
                          </div>
                        ) : (
                          filteredInventoryItems.map((item) => {
                            const selected = selectedInventoryItems.some((selectedItem) => selectedItem.code === item.code)
                            return (
                              <button
                                type="button"
                                key={item.code}
                                onClick={() => toggleInventoryItem(item)}
                                className={`w-full text-left border rounded-xl px-3 py-3 text-sm transition shadow-sm ${
                                  selected
                                    ? 'border-purple-400 bg-white ring-2 ring-purple-200'
                                    : 'border-purple-100 bg-white hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-purple-900">{item.name}</p>
                                    <p className="text-[11px] text-purple-500 mt-0.5">{item.usage}</p>
                                  </div>
                                  <span className={`text-[11px] font-bold uppercase tracking-wide ${selected ? 'text-purple-600' : 'text-purple-400'}`}>
                                    {item.code}
                                  </span>
                                </div>
                                <p className="mt-2 text-[11px] text-purple-600/90">Recommended dose: {item.dosage}</p>
                                {selected && (
                                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Selected
                                  </div>
                                )}
                              </button>
                            )
                          })
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        {selectedInventoryItems.length > 0 && (
                          <div className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs text-purple-600">
                            <p className="font-semibold text-purple-800 mb-1">Selected ({selectedInventoryItems.length}):</p>
                            <ul className="list-disc list-inside space-y-1">
                              {selectedInventoryItems.map((item) => (
                                <li key={item.code}>{item.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={appendInventorySelectionToNotes}
                          className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition ${
                            selectedInventoryItems.length === 0
                              ? 'bg-purple-200 text-purple-500 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700 shadow'
                          }`}
                          disabled={selectedInventoryItems.length === 0}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add selected to notes
                        </button>
                      </div>
                    </aside>
                  )}
                </div>

                {inventorySelectionSummary}
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
                onClick={handleClosePrescriptionModal}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
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
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex gap-3">
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
                {user?.profileImage && (
                  <button
                    onClick={handleRemoveProfilePhoto}
                    className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 border border-red-200 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove Profile Photo
                  </button>
                )}
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

      {showInventoryPanel && (
        <aside className="mt-4 lg:mt-0 lg:w-80 w-full bg-purple-50/60 border border-purple-100 rounded-2xl p-4 shadow-inner">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-purple-900">Injections & Surgical Items</h4>
              <p className="text-[11px] text-purple-600">Quickly reference inventory without leaving the chart.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowInventoryPanel(false)
                setInventorySearch('')
              }}
              className="text-xs text-purple-500 hover:text-purple-700 font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 bg-white border border-purple-100 rounded-xl p-1.5">
            {[
              { key: 'injections', label: 'Injections' },
              { key: 'surgical', label: 'Surgical Items' }
            ].map((tab) => {
              const active = inventoryTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setInventoryTab(tab.key)
                    setInventorySearch('')
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="mt-3">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder={`Search ${inventoryTab === 'injections' ? 'injections' : 'surgical items'}...`}
                className="w-full pl-9 pr-3 py-2 text-sm border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-300 bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredInventoryItems.length === 0 ? (
              <div className="rounded-xl border border-purple-100 bg-white px-3 py-4 text-center text-xs text-purple-500">
                No items found. Try a different search term.
              </div>
            ) : (
              filteredInventoryItems.map((item) => {
                const selected = selectedInventoryItems.some((selectedItem) => selectedItem.code === item.code)
                return (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => toggleInventoryItem(item)}
                    className={`w-full text-left border rounded-xl px-3 py-3 text-sm transition shadow-sm ${
                      selected
                        ? 'border-purple-400 bg-white ring-2 ring-purple-200'
                        : 'border-purple-100 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-purple-900">{item.name}</p>
                        <p className="text-[11px] text-purple-500 mt-0.5">{item.usage}</p>
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${selected ? 'text-purple-600' : 'text-purple-400'}`}>
                        {item.code}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-purple-600/90">Recommended dose: {item.dosage}</p>
                    {selected && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Selected
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </aside>
      )}

      {/* Medicine Details Modal */}
      {showMedicineModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💊</span>
                <div>
                  <h3 className="text-2xl font-bold">{selectedMedicine.name}</h3>
                  {selectedMedicine.brandName && (
                    <p className="text-green-100 text-sm">Brand: {selectedMedicine.brandName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMedicineModal(false)
                  setSelectedMedicine(null)
                }}
                className="text-white hover:text-gray-200 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">🧪 Composition</p>
                  <p className="text-gray-900 font-medium">{selectedMedicine.genericName || 'N/A'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">💰 Price</p>
                  <p className="text-gray-900 font-medium">₹{selectedMedicine.price || 0} per {selectedMedicine.unit || 'unit'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">🕒 Dosage Frequency</p>
                  <p className="text-gray-900 font-medium">
                    {selectedMedicine.strength || 'N/A'} {selectedMedicine.form || ''}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">🏭 Manufacturer</p>
                  <p className="text-gray-900 font-medium">{selectedMedicine.manufacturer || 'N/A'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">📦 Stock Availability</p>
                  <p className={`font-medium ${
                    (selectedMedicine.stockQuantity || 0) <= (selectedMedicine.minStockLevel || 10)
                      ? 'text-red-600'
                      : (selectedMedicine.stockQuantity || 0) > 0
                      ? 'text-green-600'
                      : 'text-gray-600'
                  }`}>
                    {selectedMedicine.stockQuantity || 0} {selectedMedicine.unit || 'units'}
                    {(selectedMedicine.stockQuantity || 0) <= (selectedMedicine.minStockLevel || 10) && (
                      <span className="ml-2 text-xs">(Low Stock)</span>
                    )}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">📋 Category</p>
                  <p className="text-gray-900 font-medium">{selectedMedicine.category || 'N/A'}</p>
                </div>
              </div>

              {/* Description */}
              {selectedMedicine.description && (
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-2">📝 Medicine Description</h4>
                  <p className="text-gray-700 bg-gray-50 rounded-xl p-4">{selectedMedicine.description}</p>
                </div>
              )}

              {/* Usage Instructions */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">💡 Usage Instructions</h4>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-gray-700">
                    {selectedMedicine.form === 'Tablet' && 'Take the tablet with water as directed by your doctor.'}
                    {selectedMedicine.form === 'Capsule' && 'Swallow the capsule whole with water. Do not crush or chew.'}
                    {selectedMedicine.form === 'Syrup' && 'Take the syrup as measured by the provided spoon or cup.'}
                    {selectedMedicine.form === 'Injection' && 'For injection use only. Administer as directed by healthcare professional.'}
                    {selectedMedicine.form === 'Cream' && 'Apply a thin layer to the affected area as directed.'}
                    {selectedMedicine.form === 'Ointment' && 'Apply to the affected area 2-3 times daily or as directed.'}
                    {!selectedMedicine.form && 'Follow the dosage instructions provided by your doctor.'}
                  </p>
                </div>
              </div>

              {/* Side Effects */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">⚠️ Side Effects</h4>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-gray-700">
                    Common side effects may include nausea, dizziness, or mild stomach upset. 
                    If you experience severe side effects or allergic reactions, stop taking the medicine 
                    and consult your doctor immediately.
                  </p>
                </div>
              </div>

              {/* Storage Information */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">🌡️ Storage Information</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <ul className="text-gray-700 space-y-2">
                    <li>• Store in a cool, dry place away from direct sunlight</li>
                    <li>• Keep out of reach of children</li>
                    {selectedMedicine.expiryDate && (
                      <li>• Expiry Date: {new Date(selectedMedicine.expiryDate).toLocaleDateString()}</li>
                    )}
                    {selectedMedicine.batchNumber && (
                      <li>• Batch Number: {selectedMedicine.batchNumber}</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedMedicine.expiryDate && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Expiry Date</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(selectedMedicine.expiryDate).toLocaleDateString()}
                      {new Date(selectedMedicine.expiryDate) < new Date() && (
                        <span className="ml-2 text-red-600 text-xs">(Expired)</span>
                      )}
                    </p>
                  </div>
                )}
                {selectedMedicine.batchNumber && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-700 uppercase mb-1">Batch Number</p>
                    <p className="text-gray-900 font-medium">{selectedMedicine.batchNumber}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMedicineModal(false)
                  setSelectedMedicine(null)
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default DoctorDashboard
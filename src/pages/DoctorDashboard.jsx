import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import generatePrescriptionPDF from '../utils/generatePrescriptionPDF'
import generateTraditionalPrescriptionPDF from '../utils/generateTraditionalPrescriptionPDF'
import PatientLimitModal from '../components/PatientLimitModal'
import DoctorStatsNotification from '../components/DoctorStatsNotification'
import MedicalHistoryModal from '../components/MedicalHistoryModal'
import useVoiceRecognition from '../hooks/useVoiceRecognition'

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

  const [activeTab, setActiveTab] = useState('active') // default to 'active' per user request
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
  const [expandedInlineHistoryPanels, setExpandedInlineHistoryPanels] = useState({})
  const notificationRef = useRef(null)
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showStatsNotification, setShowStatsNotification] = useState(true)
  const [showCompletedPatientsPanel, setShowCompletedPatientsPanel] = useState(false)
  const [doctorStats, setDoctorStats] = useState(null)
  const [openInstructionsDropdown, setOpenInstructionsDropdown] = useState(null) // Track which medicine dropdown is open
  const [showPrescriptionSuccessToast, setShowPrescriptionSuccessToast] = useState(false)
  const [savedPrescriptionData, setSavedPrescriptionData] = useState(null)
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
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const PAGE_SIZE_TODAY = 5
  const PAGE_SIZE_HISTORY = 6
  const PAGE_SIZE_MEDICAL = 10 // Default items per page for Medical Records
  const [todayPage, setTodayPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [medicalPage, setMedicalPage] = useState(1)
  const [prescriptionData, setPrescriptionData] = useState({
    diagnosis: '',
    diagnosisNotes: '',
    medicines: [{
      name: '',
      dosage: '',
      duration: '',
      times: { morning: false, afternoon: false, night: false },
      dosageNotes: '',
      dosageInstructions: ''
    }],
    notes: '',
    selectedTests: []
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
  const [medicalHistoryIsRecheck, setMedicalHistoryIsRecheck] = useState(false)
  const [medicalHistoryCurrentPatient, setMedicalHistoryCurrentPatient] = useState(null)
  const [patientInlineHistory, setPatientInlineHistory] = useState({})
  const [patientInlineHistoryLoading, setPatientInlineHistoryLoading] = useState({})
  const todaysPatientsRef = useRef(null)
  const testInputRef = useRef(null)
  const [showTestDropdown, setShowTestDropdown] = useState(false)
  const [testSearchValue, setTestSearchValue] = useState('')
  const testDropdownRef = useRef(null)

  const completedPatients = useMemo(
    () => patients.filter((patient) => patient.status === 'completed'),
    [patients]
  )

  const remainingPatients = useMemo(
    () => patients.filter((patient) => patient.status !== 'completed'),
    [patients]
  )

  const formatConsultationFee = useCallback((fee) => {
    const amount = Number(fee)
    if (!Number.isNaN(amount) && amount > 0) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount)
    }
    return '₹500'
  }, [])

  const normalizeHistoryRecords = (records = []) =>
    records
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.visitDate || b.registrationDate || 0).getTime() -
          new Date(a.visitDate || a.registrationDate || 0).getTime()
      )

  const mergeMedicalHistoryData = useCallback((primaryData, fallbackData) => {
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
  }, [])

  const requestMedicalHistory = useCallback(async (params) => {
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
  }, [])

  const deriveFrequencyPattern = (medicine = {}) => {
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

  const resolvePatientHistoryKey = useCallback((patient) => {
    if (!patient) return null
    if (patient.patientId && String(patient.patientId).trim()) {
      return String(patient.patientId).trim()
    }
    if (patient._id) {
      return patient._id
    }
    return null
  }, [])

  const fetchInlineHistory = useCallback(
    async (patient) => {
      if (!patient) return
      const patientKey = resolvePatientHistoryKey(patient)
      const fallbackKey = patient?.mobileNumber ? patient.mobileNumber.trim() : null
      const storageKey = patientKey || fallbackKey
      if (!storageKey) return

      setPatientInlineHistoryLoading((prev) => ({
        ...prev,
        [storageKey]: true
      }))

      try {
        let primaryData = patientKey ? await requestMedicalHistory({ patientId: patientKey }) : null
        let finalData = primaryData

        if ((!finalData || finalData.totalVisits <= 1) && patient?.mobileNumber) {
          const fallbackData = await requestMedicalHistory({ mobileNumber: patient.mobileNumber.trim() })
          if (fallbackData) {
            finalData = mergeMedicalHistoryData(primaryData, fallbackData)
          } else if (!finalData) {
            finalData = fallbackData
          }
        }

        if (!finalData) {
          finalData = { patientInfo: null, medicalHistory: [], totalVisits: 0 }
        }

        setPatientInlineHistory((prev) => ({
          ...prev,
          [storageKey]: finalData
        }))
      } catch (error) {
        console.error('Error fetching inline medical history:', error)
        if (error.response?.status !== 404) {
          toast.error('Unable to fetch recent medical history for this patient')
        }
        setPatientInlineHistory((prev) => ({
          ...prev,
          [storageKey]: { patientInfo: null, medicalHistory: [], totalVisits: 0 }
        }))
      } finally {
        setPatientInlineHistoryLoading((prev) => ({
          ...prev,
          [storageKey]: false
        }))
      }
    },
    [resolvePatientHistoryKey, mergeMedicalHistoryData, requestMedicalHistory]
  )

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

  // Select from suggestions → fill input, search immediately, close dropdown
  const handleSelectSuggestion = (name) => {
    setMedicineSearch(name)
    setShowSearchSuggestions(false)
    fetchMedicines(name, medicineCategory) // bypass debounce for click
  }

  const handleSuggestionClick = (suggestion) => {
    handleSelectSuggestion(suggestion.name)
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
    const patientKey = resolvePatientHistoryKey(patient)
    if (!patientKey) return
    setMedicalHistoryPatientId(patientKey)
    setMedicalHistoryPatientName(patient?.fullName || null)
    setMedicalHistoryPatientMobile(patient?.mobileNumber || null)
    setMedicalHistoryIsRecheck(Boolean(patient?.isRecheck))
    setMedicalHistoryCurrentPatient(patient || null)
    setShowMedicalHistoryModal(true)
  }

  const toggleInlineHistoryPanel = useCallback((panelKey) => {
    if (!panelKey) return
    setExpandedInlineHistoryPanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey]
    }))
  }, [])

  const renderInlineHistoryPanel = (patient, meta = {}) => {
    const { formattedToken, visitDateFormatted, visitTimeFormatted } = meta
    const historyKey = resolvePatientHistoryKey(patient)
    const fallbackKey = patient?.mobileNumber ? patient.mobileNumber.trim() : null
    const storageKey = historyKey || fallbackKey
    const inlineHistoryData = storageKey ? patientInlineHistory[storageKey] : null
    const inlineHistoryLoadingState = storageKey ? patientInlineHistoryLoading[storageKey] : false
    const pastVisitsRaw = inlineHistoryData?.medicalHistory || []
    const { dateLabel: fallbackDateLabel, timeLabel: fallbackTimeLabel } = formatVisitDateTime(
      patient.registrationDate || patient.createdAt
    )
    const currentVisitDateLabel = visitDateFormatted || fallbackDateLabel
    const currentVisitTimeLabel = visitTimeFormatted || fallbackTimeLabel
    const patientIdentifier =
      inlineHistoryData?.patientInfo?.patientId || historyKey || fallbackKey || 'Not Assigned'
    const panelKey = storageKey || patient?._id || patient?.mobileNumber || `patient-${patient?._id || 'unknown'}`
    const isExpanded = expandedInlineHistoryPanels[panelKey] ?? false

    const sanitizeText = (value, fallback = 'Not recorded') => {
      if (value === null || value === undefined) return fallback
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : fallback
      }
      return value || fallback
    }

    const formatStatus = (status) => {
      if (!status) return 'Waiting'
      const cleaned = status.replace(/_/g, ' ').replace(/-/g, ' ')
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }

    const formatSugarValue = (value) => {
      if (value === null || value === undefined || value === '') return '0 mg/dL'
      if (typeof value === 'string' && value.toLowerCase().includes('mg')) return value
      return `${value} mg/dL`
    }

    const formatVitals = (source = {}) => {
      return {
        bloodPressure: sanitizeText(source.bloodPressure, 'N/A'),
        sugarLevel: formatSugarValue(source.sugarLevel),
        temperature: sanitizeText(source.temperature, 'N/A')
      }
    }

    const normalizeToken = (tokenValue) => {
      if (tokenValue === null || tokenValue === undefined || tokenValue === '-') return null
      const tokenString = tokenValue.toString().trim()
      if (!tokenString) return null
      return tokenString.padStart(2, '0')
    }

    const todaysVisit = {
      id: `today-${patient._id}`,
      label: "Today's Visit",
      dateLabel: currentVisitDateLabel,
      timeLabel: currentVisitTimeLabel,
      tokenDisplay: normalizeToken(formattedToken) || formattedToken || '--',
      consultationType: patient.isRecheck ? 'Recheck-up' : 'New Visit',
      doctorName: user?.fullName ? `Dr. ${user.fullName}` : 'Doctor not recorded',
      status: formatStatus(patient.status),
      issue: sanitizeText(patient.disease, 'Not recorded'),
      diagnosis: sanitizeText(patient.prescription?.diagnosis, 'Not recorded'),
      vitals: formatVitals({
        bloodPressure: patient.bloodPressure,
        sugarLevel: patient.sugarLevel,
        temperature: patient.temperature
      }),
      medicines: patient.prescription?.medicines || [],
      inventoryItems: patient.prescription?.inventoryItems || [],
      notes: patient.prescription?.notes,
      pdfPath: patient.prescription?.pdfPath || null,
      selectedTests: patient.prescription?.selectedTests || []
    }

    // Get current visit date for filtering
    const currentVisitDate = patient.registrationDate || patient.createdAt || patient.visitDate
    const currentVisitDateStr = currentVisitDate ? new Date(currentVisitDate).toDateString() : null
    const currentVisitId = patient._id

    const normalizedPastVisits = pastVisitsRaw
      .filter(Boolean)
      // Filter out the current visit - exclude by ID and date to avoid duplicates
      .filter((visit) => {
        const visitId = visit._id || visit.visitDetails?._id
        const visitDate = visit.visitDate || visit.createdAt
        const visitDateStr = visitDate ? new Date(visitDate).toDateString() : null
        
        // Exclude if it's the current visit (by ID or same date)
        if (visitId === currentVisitId) return false
        if (currentVisitDateStr && visitDateStr === currentVisitDateStr) return false
        
        // Include all past visits from the database (they are already past visits)
        return true
      })
      .map((visit, idx) => {
        const { dateLabel, timeLabel } = formatVisitDateTime(visit.visitDate || visit.createdAt)
        const tokenSource = visit.tokenNumber ?? visit.visitDetails?.tokenNumber
        const consultationType = visit.visitDetails?.isRecheck ? 'Recheck-up' : 'New Visit'
        const visitDoctorName = visit.doctor?.name ? `Dr. ${visit.doctor.name}` : visit.doctorName
        const visitVitalsRaw = visit.vitals || {}
        return {
          ...visit,
          id: visit._id || visit.visitDetails?._id || `${historyKey || patient._id}-past-${idx}`,
          label: visit.label || `Visit on ${dateLabel}`,
          dateLabel,
          timeLabel,
          tokenDisplay: normalizeToken(tokenSource) || '--',
          consultationType,
          doctorName: sanitizeText(visitDoctorName, 'Doctor not recorded'),
          status: formatStatus(visit.visitDetails?.status || visit.status),
          issue: sanitizeText(visit.patientInfo?.disease || visit.issue, 'Not recorded'),
          diagnosis: sanitizeText(visit.prescription?.diagnosis || visit.diagnosis, 'Not recorded'),
          vitals: formatVitals({
            bloodPressure: visitVitalsRaw.bloodPressure,
            sugarLevel: visitVitalsRaw.sugarLevel,
            temperature: visitVitalsRaw.temperature
          }),
          medicines: visit.prescription?.medicines || visit.medicines || [],
          inventoryItems: visit.prescription?.inventoryItems || visit.inventoryItems || [],
          notes: visit.prescription?.notes || visit.notes,
          pdfPath: visit.prescription?.pdfPath || visit.pdfPath || null,
          selectedTests: visit.prescription?.selectedTests || visit.selectedTests || []
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.visitDate || a.createdAt || 0).getTime()
        const dateB = new Date(b.visitDate || b.createdAt || 0).getTime()
        return dateB - dateA
      })

    // Only show past visits if there are actual previous completed visits from the database
    // If patient is visiting for the first time (no past visits), hide the section
    const hasPastVisits = normalizedPastVisits.length > 0

    const renderMedicinesTable = (visit) => {
      const medicines = visit.medicines || []
      const hasMedicines = medicines.length > 0
      return (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
            Prescribed Medicines
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
                {hasMedicines ? (
                  medicines.map((med, idx) => (
                    <tr key={`med-${visit.id}-${idx}`} className="hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-2 font-semibold text-gray-900">{med.name || 'Not recorded'}</td>
                      <td className="px-4 py-2 text-gray-700">{med.dosage || '—'}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                        {deriveFrequencyPattern(med)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{med.duration || '—'}</td>
                      <td className="px-4 py-2 text-gray-600 min-w-[160px]">
                        {med.dosageInstructions || med.dosageNotes || 'No instructions'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      No medicines recorded for this visit
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    const renderInventoryItems = (visit) => {
      if (!visit.inventoryItems || visit.inventoryItems.length === 0) return null
      return (
        <div className="border border-cyan-100 rounded-xl p-4 bg-cyan-50/40">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-700 mb-2">
            Injections & Surgical Items
          </p>
          <div className="space-y-1 text-sm text-cyan-900">
            {visit.inventoryItems.map((item, idx) => (
              <div key={`inv-${visit.id}-${idx}`} className="flex flex-col border border-cyan-100 rounded-lg p-3 bg-white">
                <span className="font-semibold">{item.name}</span>
                <span className="text-xs text-cyan-700">
                  {[item.dosage, item.usage].filter(Boolean).join(' • ') || 'Usage not recorded'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    const statusChipClass = (status) => {
      if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      if (status === 'in-progress') return 'bg-amber-50 text-amber-700 border border-amber-200'
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    }

    const renderTests = (tests = []) => {
      if (!Array.isArray(tests) || tests.length === 0) return null
      return (
        <div className="flex flex-wrap gap-2">
          {tests.map((test, idx) => (
            <span
              key={`test-${idx}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium border border-cyan-100"
            >
              {typeof test === 'string' ? test : test?.name || 'Test'}
            </span>
          ))}
        </div>
      )
    }

    const renderVisitCard = (visit, { title }) => {
      const vitals = visit.vitals || {}
      const medicinesSection = renderMedicinesTable(visit)
      const inventorySection = renderInventoryItems(visit)
      return (
        <div key={visit.id} className="rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {visit.dateLabel} · {visit.timeLabel}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                  {visit.tokenDisplay && (
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium border border-gray-200">
                      Token #{visit.tokenDisplay}
                    </span>
                  )}
                  {visit.consultationType && (
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-[#6C63FF]/10 text-[#6C63FF] text-xs font-medium border border-[#6C63FF]/20">
                      {visit.consultationType}
                    </span>
                  )}
                  {visit.status && (
                    <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-xs font-medium ${statusChipClass(visit.status)}`}>
                      {visit.status?.replace('-', ' ') || 'Status not recorded'}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right min-w-0 sm:min-w-[140px]">
                <p className="text-xs text-gray-500">Doctor</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {visit.doctorName || 'Not recorded'}
                </p>
                {visit.pdfPath && (
                  <button
                    type="button"
                    onClick={() => {
                      const pdfUrl = getPDFUrl(visit.pdfPath)
                      if (pdfUrl) viewPdf(pdfUrl)
                    }}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-blue-50 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-blue-600 border border-blue-100 hover:bg-blue-100 transition w-full sm:w-auto min-h-[36px]"
                  >
                    View PDF
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Health Issue</p>
                  <p className="text-sm font-semibold text-gray-900 break-words">{visit.issue || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Diagnosis</p>
                  <p className="text-sm font-semibold text-gray-900 break-words">{visit.diagnosis || 'Not recorded'}</p>
                </div>
                {visit.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Doctor Notes</p>
                    <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line break-words">{visit.notes}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 border border-gray-200 text-center">
                    <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wide">BP</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 break-words">
                      {vitals.bloodPressure || 'N/A'}
                    </p>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 border border-gray-200 text-center">
                    <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wide">Sugar</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 break-words">
                      {vitals.sugarLevel || 'N/A'}
                    </p>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 border border-gray-200 text-center">
                    <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wide">Temp</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 break-words">
                      {vitals.temperature || 'N/A'}
                    </p>
                  </div>
                </div>
                {renderTests(visit.selectedTests)}
              </div>
            </div>
          </div>

          {(visit.medicines?.length > 0 || visit.inventoryItems?.length > 0) && (
            <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
              {visit.medicines?.length > 0 && medicinesSection}
              {visit.inventoryItems?.length > 0 && inventorySection}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
        <div className="bg-white/90 rounded-xl sm:rounded-2xl border border-gray-200 shadow-inner p-3 sm:p-4 md:p-5">
          <button
            type="button"
            onClick={() => toggleInlineHistoryPanel(panelKey)}
            className="flex w-full items-center justify-between gap-2 sm:gap-3 text-left group min-h-[44px]"
            aria-expanded={isExpanded}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6C63FF] flex items-center gap-1.5 sm:gap-2 group-hover:underline">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate">Previous Medical History</span>
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">Auto-fetched via Patient ID {patientIdentifier}</p>
            </div>
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 text-gray-600 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${isExpanded ? 'mt-5 max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
            aria-hidden={!isExpanded}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={!historyKey || inlineHistoryLoadingState}
                  onClick={() => historyKey && fetchInlineHistory(historyKey)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition min-h-[44px] w-full sm:w-auto ${
                    inlineHistoryLoadingState
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-white'
                  }`}
                >
                  {inlineHistoryLoadingState ? 'Fetching…' : 'Refresh'}
                </button>
                <button
                  type="button"
                  onClick={() => openMedicalHistory(patient)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-sm min-h-[44px] w-full sm:w-auto"
                >
                  View Full History
                </button>
              </div>
            </div>

            {!historyKey ? (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Assign a hospital Patient ID to view history for this patient.
              </div>
            ) : !inlineHistoryData ? (
              <div className="mt-5 flex flex-col items-center justify-center py-10 gap-3">
                <div className="h-10 w-10 rounded-full border-b-2 border-[#6C63FF] animate-spin"></div>
                <p className="text-sm text-gray-500">Fetching previous visits…</p>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {renderVisitCard(todaysVisit, { title: "Today's Visit" })}

                {hasPastVisits ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Past Medical History</p>
                      <span className="text-xs text-gray-500">
                        {normalizedPastVisits.length} visit{normalizedPastVisits.length > 1 ? 's' : ''} found
                      </span>
                    </div>
                    <div className="space-y-4">
                      {normalizedPastVisits.map((visit) =>
                        renderVisitCard(visit, { title: visit.label || 'Past Visit' })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const handleShowTodaysPatients = () => {
    setActiveTab('today')
    setSearchToday('')
    setActivePatientFilter(null)
    requestAnimationFrame(() => {
      todaysPatientsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

const handleToggleCompletedPatients = () => {
  setShowCompletedPatientsPanel((prev) => !prev)
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

  // Close instructions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown button or menu
      const isOutside = !event.target.closest('[data-instructions-dropdown]')
      if (isOutside) {
        setOpenInstructionsDropdown(null)
      }
    }
    if (openInstructionsDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openInstructionsDropdown])

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
      const patientIdMatch = patient.patientId?.toLowerCase().includes(q)
      const issueMatch = patient.disease?.toLowerCase().includes(q) || patient?.prescription?.diagnosis?.toLowerCase().includes(q)
      return nameMatch || mobileMatch || tokenMatch || patientIdMatch || issueMatch
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

  const formatVisitDateTime = (dateValue) => {
    if (!dateValue) {
      return {
        dateLabel: 'Date not available',
        timeLabel: 'Time not available'
      }
    }
    const parsedDate = new Date(dateValue)
    if (Number.isNaN(parsedDate.getTime())) {
      return {
        dateLabel: 'Date not available',
        timeLabel: 'Time not available'
      }
    }
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

  const getFrequencyPattern = (times = {}) => {
    if (!times) return '0-0-0'
    const morning = times.morning ? 1 : 0
    const afternoon = times.afternoon ? 1 : 0
    const night = times.night ? 1 : 0
    return `${morning}-${afternoon}-${night}`
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

  // ---------- Validation Helpers ----------
  const [medicineErrors, setMedicineErrors] = useState([]) // per index: { name?, duration?, times? }

  const isValidDuration = (value) => {
    if (!value) return false
    const v = value.toString().trim().toLowerCase()
    // Accept "5", "5 days", "5 day"
    if (/^\d+$/.test(v)) return true
    if (/^\d+\s*(day|days)$/.test(v)) return true
    return false
  }

  const hasAnyTime = (times) => {
    const t = ensureTimesShape({ times })
    return !!(t.morning || t.afternoon || t.night)
  }

  const validateMedicineAt = (index, medOverride) => {
    const med = medOverride || prescriptionData.medicines[index] || {}
    const errs = {}
    if (!med.name || !med.name.trim()) errs.name = 'Medicine name is required.'
    if (!isValidDuration(med.duration)) errs.duration = 'Enter duration like 5 or 5 days.'
    if (!hasAnyTime(med.times)) errs.times = 'Select at least one time.'
    setMedicineErrors((prev) => {
      const next = [...prev]
      next[index] = errs
      return next
    })
    return Object.keys(errs).length === 0
  }

  const isFormValid = useMemo(() => {
    if (!prescriptionData?.medicines?.length) return false
    return prescriptionData.medicines.every((m, i) => {
      const ok =
        m?.name?.trim() &&
        isValidDuration(m?.duration) &&
        hasAnyTime(m?.times)
      return !!ok
    })
  }, [prescriptionData])

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
    // Re-validate this row on changes
    validateMedicineAt(index, target)

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
    validateMedicineAt(index, target)
  }

  // ---------- Voice Recognition Utilities ----------
  const [listeningMedicineIndex, setListeningMedicineIndex] = useState(null)
  const [listeningDosageIndex, setListeningDosageIndex] = useState(null)
  const [listeningNotesIndex, setListeningNotesIndex] = useState(null)
  // Refs to avoid stale closures in voice callbacks
  const listeningMedicineIndexRef = useRef(null)
  const listeningDosageIndexRef = useRef(null)
  const listeningNotesIndexRef = useRef(null)
  useEffect(() => { listeningMedicineIndexRef.current = listeningMedicineIndex }, [listeningMedicineIndex])
  useEffect(() => { listeningDosageIndexRef.current = listeningDosageIndex }, [listeningDosageIndex])
  useEffect(() => { listeningNotesIndexRef.current = listeningNotesIndex }, [listeningNotesIndex])
  const [autoSelectIfSingle, setAutoSelectIfSingle] = useState({})

  const dosageFromSpeech = (spoken) => {
    const t = (spoken || '').toLowerCase()
    const hasMorning = t.includes('morning')
    const hasAfternoon = t.includes('afternoon') || t.includes('noon')
    const hasNight = t.includes('night') || t.includes('nite')
    const allThree = t.includes('all three') || (hasMorning && hasAfternoon && hasNight)
    // If "only" present, treat only mentioned; else select mentioned flags as spoken
    const only = t.includes('only')
    const flags = { morning: false, afternoon: false, night: false }
    if (allThree) return { morning: true, afternoon: true, night: true }
    if (hasMorning) flags.morning = true
    if (hasAfternoon) flags.afternoon = true
    if (hasNight) flags.night = true
    if (!only && !hasMorning && !hasAfternoon && !hasNight) return flags
    return flags
  }

  const applyDosageFlags = (index, flags) => {
    const updated = [...prescriptionData.medicines]
    const target = { ...updated[index] }
    const existing = ensureTimesShape(target)
    const merged = { ...existing, ...flags }
    target.times = merged
    target.dosage = formatDosage(merged, target.dosageNotes, target.dosageInstructions)
    updated[index] = target
    setPrescriptionData({ ...prescriptionData, medicines: updated })
  }

  const {
    start: startMedicineVoice,
    stop: stopMedicineVoice,
    isSupported: isVoiceSupportedMedicine,
  } = useVoiceRecognition({
    onStart: () => { toast.dismiss(); toast.success('Listening…'); },
    onEnd: () => { setListeningMedicineIndex(null); toast.dismiss(); },
    onResult: (spoken) => {
      const i = listeningMedicineIndexRef.current
      if (i === null || i === undefined) return
      // Clean transcript and insert into input
      const cleaned = String(spoken || '')
        .toLowerCase()
        .replace(/\s+(tablet|tab|capsule|cap|syrup|dose|mg|milligram|ml)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Update input value using the same handler as typing
      handleMedicineChange(i, 'name', cleaned)

      // Immediately trigger the same search API used by debounced typing
      // This ensures instant results without waiting for debounce
      fetchMedicineSuggestions(cleaned, i)

      // Enable auto-select when only one suggestion arrives
      setAutoSelectIfSingle(prev => ({ ...prev, [i]: true }))

      // Stop listening to remove glow and restore placeholder quickly
      try { stopMedicineVoice() } catch {}
      setListeningMedicineIndex(null)
    }
  })

  const {
    start: startDosageVoice,
    stop: stopDosageVoice,
    isSupported: isVoiceSupportedDosage,
  } = useVoiceRecognition({
    onEnd: () => setListeningDosageIndex(null),
    onResult: (spoken) => {
      const i = listeningDosageIndexRef.current
      if (i === null || i === undefined) return
      const flags = dosageFromSpeech(spoken)
      applyDosageFlags(i, flags)
    }
  })

  const {
    start: startNotesVoice,
    stop: stopNotesVoice,
    isSupported: isVoiceSupportedNotes,
  } = useVoiceRecognition({
    onEnd: () => setListeningNotesIndex(null),
    onResult: (spoken) => {
      const i = listeningNotesIndexRef.current
      if (i === null || i === undefined) return
      const current = prescriptionData.medicines[i]?.dosageNotes || ''
      const appended = current ? `${current} ${spoken}` : spoken
      handleMedicineChange(i, 'dosageNotes', appended)
    }
  })

  // Auto-select single suggestion after voice search
  useEffect(() => {
    Object.keys(autoSelectIfSingle).forEach(k => {
      const idx = parseInt(k)
      if (autoSelectIfSingle[idx] && medicineSuggestions[idx] && medicineSuggestions[idx].length === 1) {
        const suggestion = medicineSuggestions[idx][0]
        handleMedicineChange(idx, 'name', suggestion, { skipLookup: true })
        setAutoSelectIfSingle(prev => ({ ...prev, [idx]: false }))
      }
    })
  }, [medicineSuggestions]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Duration Voice ----------
  const [listeningDurationIndex, setListeningDurationIndex] = useState(null)
  const listeningDurationIndexRef = useRef(null)
  useEffect(() => { listeningDurationIndexRef.current = listeningDurationIndex }, [listeningDurationIndex])

  const wordsToNumber = (text) => {
    const t = (text || '').toLowerCase().trim()
    const digitMatch = t.match(/(\d+)/)
    if (digitMatch) return parseInt(digitMatch[1], 10)
    const map = {
      zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
      ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19,
      twenty:20, thirty:30
    }
    let total = 0
    t.split(/[\s-]+/).forEach(w => {
      if (map[w] !== undefined) total += map[w]
    })
    return total > 0 ? total : null
  }

  const {
    start: startDurationVoice,
    stop: stopDurationVoice,
    isSupported: isVoiceSupportedDuration,
  } = useVoiceRecognition({
    onEnd: () => setListeningDurationIndex(null),
    onResult: (spoken) => {
      const i = listeningDurationIndexRef.current
      if (i === null || i === undefined) return
      const n = wordsToNumber(spoken)
      if (n && Number.isFinite(n)) {
        const formatted = `${n} days`
        handleMedicineChange(i, 'duration', formatted)
        validateMedicineAt(i)
      } else {
        toast.error('Could not detect a duration number')
      }
      try { stopDurationVoice() } catch {}
      setListeningDurationIndex(null)
    }
  })

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
      diagnosisNotes: '',
      medicines: [{
        name: '',
        dosage: '',
        duration: '',
        times: { morning: false, afternoon: false, night: false },
        dosageNotes: '',
        dosageInstructions: ''
      }],
      notes: '',
      selectedTests: []
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
    // Clear test input
    setTestSearchValue('')
    setShowTestDropdown(false)
    if (testInputRef.current) {
      testInputRef.current.value = ''
    }
  }

  const handleSubmitPrescription = async () => {
    // Run strict validations
    const results = prescriptionData.medicines.map((_, i) => validateMedicineAt(i))
    const allValid = results.every(Boolean)
    if (!allValid || !prescriptionData.diagnosis.trim()) {
      toast.error('Please fix validation errors before saving.')
      return
    }
    const validMedicines = prescriptionData.medicines.filter((_, i) => results[i])

    setSavingPrescription(true)
    try {
      // Combine selected tests with notes
      const testsText = prescriptionData.selectedTests.length > 0 
        ? `Tests Required: ${prescriptionData.selectedTests.join(', ')}` 
        : ''
      const combinedNotes = [
        prescriptionData.diagnosisNotes,
        testsText,
        prescriptionData.notes
      ].filter(Boolean).join('\n\n')

      // First, generate PDF to get base64 data
      // Use selectedPatient data for PDF generation
      const tempPrescription = {
        diagnosis: prescriptionData.diagnosis,
        diagnosisNotes: prescriptionData.diagnosisNotes,
        medicines: validMedicines,
        notes: combinedNotes,
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
          qualification: user.qualification,
          mobileNumber: user.mobileNumber,
          clinicAddress: user.clinicAddress
        },
        tempPrescription
      )

      // Save prescription with PDF data in one call
      const response = await api.put(`/prescription/${selectedPatient._id}`, {
        diagnosis: prescriptionData.diagnosis,
        diagnosisNotes: prescriptionData.diagnosisNotes,
        medicines: validMedicines,
        notes: combinedNotes,
        selectedTests: prescriptionData.selectedTests,
        inventoryItems: selectedInventoryItems.map((item) => ({
          name: item.name,
          code: item.code,
          usage: item.usage,
          dosage: item.dosage
        })),
        pdfData: pdfBase64 // Send PDF as base64
      })

      // Store prescription data for PDF generation
      setSavedPrescriptionData({
        patient: selectedPatient,
        doctor: {
          fullName: user.fullName,
          specialization: user.specialization,
          qualification: user.qualification,
          mobileNumber: user.mobileNumber,
          clinicAddress: user.clinicAddress,
          registrationNo: user.registrationNo || user.registrationNumber || 'REG-12345',
          clinicName: user.clinicName || user.hospitalName || 'Tekisky Hospital',
          hospitalPhone: user.hospitalPhone || user.mobileNumber || '9359481880',
          hospitalEmail: user.hospitalEmail || user.email || 'info@hospital.com',
          hospitalAddress: user.clinicAddress || user.hospitalAddress || '123 Medical Center, City'
        },
        prescription: {
          ...tempPrescription,
          selectedTests: prescriptionData.selectedTests
        },
        responseData: response.data.data
      })

      setShowPrescriptionSuccessToast(true)
      
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
    } finally {
      setSavingPrescription(false)
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

  useEffect(() => {
    if (activeTab !== 'active') return
    filteredTodayPatients.forEach((patient) => {
      const historyKey = resolvePatientHistoryKey(patient)
      const fallbackKey = patient?.mobileNumber ? patient.mobileNumber.trim() : null
      const storageKey = historyKey || fallbackKey
      if (!storageKey) return
      if (!patientInlineHistory[storageKey] && !patientInlineHistoryLoading[storageKey]) {
        fetchInlineHistory(patient)
      }
    })
  }, [
    activeTab,
    filteredTodayPatients,
    patientInlineHistory,
    patientInlineHistoryLoading,
    fetchInlineHistory,
    resolvePatientHistoryKey
  ])

  const filteredHistoryPatients = filterPatients(patientHistory, searchHistory)
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime()
      const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime()
      return dateB - dateA
    })
  const filteredMedicalRecords = filterPatients(medicalRecords, searchMedical)
  
  // Pagination for Medical Records
  const medicalTotalPages = Math.ceil(filteredMedicalRecords.length / PAGE_SIZE_MEDICAL) || 1
  const paginatedMedicalRecords = useMemo(() => {
    const startIndex = (medicalPage - 1) * PAGE_SIZE_MEDICAL
    const endIndex = startIndex + PAGE_SIZE_MEDICAL
    return filteredMedicalRecords.slice(startIndex, endIndex)
  }, [filteredMedicalRecords, medicalPage])
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setMedicalPage(1)
  }, [searchMedical])
  
  // Scroll to top when page changes
  const medicalRecordsRef = useRef(null)
  useEffect(() => {
    if (medicalRecordsRef.current && medicalPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [medicalPage])
  
  const handleMedicalPageChange = (newPage) => {
    setMedicalPage(newPage)
  }
  
  const handleMedicalPrevious = () => {
    if (medicalPage > 1) {
      setMedicalPage(medicalPage - 1)
    }
  }
  
  const handleMedicalNext = () => {
    if (medicalPage < medicalTotalPages) {
      setMedicalPage(medicalPage + 1)
    }
  }

  // Handle clicking outside test dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (testDropdownRef.current && !testDropdownRef.current.contains(event.target)) {
        setShowTestDropdown(false)
      }
    }

    if (showTestDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showTestDropdown])
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
    <div className="mb-6 rounded-[20px] border border-[#6C63FF]/20 bg-gradient-to-br from-[#6C63FF]/5 via-white to-[#6C63FF]/5 shadow-sm">
      <button
        type="button"
        onClick={() => setShowInventorySummary((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#6C63FF]/5 transition-colors rounded-t-[20px]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#8B7FFF] text-white shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8m12 0a8 8 0 11-16 0 8 8 0 0116 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Added Injections &amp; Surgical Items</p>
            <p className="text-xs text-gray-500 mt-0.5">{selectedInventoryItems.length} item{selectedInventoryItems.length > 1 ? 's' : ''} included below.</p>
          </div>
        </div>
        <span className={`transition-transform duration-200 ${showInventorySummary ? 'rotate-0' : '-rotate-90'}`}>
          <svg className="w-5 h-5 text-[#6C63FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {showInventorySummary && (
        <div className="border-t border-[#6C63FF]/20 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            {selectedInventoryItems.map((item) => (
              <div
                key={item.code}
                className="group relative overflow-hidden rounded-[16px] border border-[#6C63FF]/20 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#6C63FF]/40"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#6C63FF] via-[#8B7FFF] to-[#6C63FF] opacity-80" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#6C63FF] transition-colors">{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.usage}</p>
                  </div>
                  <span className="ml-3 inline-flex items-center rounded-full bg-[#6C63FF]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]">
                    {item.code}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#6C63FF]">
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
      {showPrescriptionSuccessToast && (
        <CenteredPrescriptionToast
          message="Prescription saved and PDF stored in medical section"
          onClose={() => {
            setShowPrescriptionSuccessToast(false)
            setSavedPrescriptionData(null)
          }}
          prescriptionData={savedPrescriptionData}
        />
      )}

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
        @keyframes dropdown-fade-in {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-dropdown-fade-in {
          animation: dropdown-fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* Centered toast & overlay */
        .toast-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.2);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 950;
          animation: toastOverlayIn 0.3s ease forwards;
        }

        .toast-overlay-hide {
          animation: toastOverlayOut 0.3s ease forwards;
        }

        .toast-wrapper {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1000;
          width: 100%;
          max-width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .centered-prescription-toast {
          width: 90%;
          max-width: 650px;
          min-width: 320px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(240, 253, 250, 0.92) 50%,
            rgba(236, 253, 245, 0.92) 100%
          );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-radius: 24px;
          padding: clamp(1.25rem, 2.5vw, 1.5rem) clamp(1.25rem, 2.5vw, 1.75rem);
          box-shadow:
            0 32px 64px rgba(16, 185, 129, 0.2),
            0 16px 32px rgba(58, 158, 194, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          position: relative;
          overflow: visible;
          pointer-events: auto;
          border: 1px solid rgba(255, 255, 255, 0.6);
        }


        .toast-enter {
          animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .toast-exit {
          animation: toastOut 0.3s ease forwards;
        }

        .toast-icon-shell {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 8px 24px rgba(16, 185, 129, 0.4),
            0 0 0 4px rgba(255, 255, 255, 0.3),
            0 0 40px rgba(16, 185, 129, 0.3);
          flex-shrink: 0;
          z-index: 2;
          animation: iconGlow 2s ease-in-out infinite;
        }

        /* Enhanced glow animation */
        @keyframes iconGlow {
          0%, 100% {
            box-shadow: 
              0 8px 24px rgba(16, 185, 129, 0.4),
              0 0 0 4px rgba(255, 255, 255, 0.3),
              0 0 40px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 
              0 8px 24px rgba(16, 185, 129, 0.6),
              0 0 0 4px rgba(255, 255, 255, 0.4),
              0 0 60px rgba(16, 185, 129, 0.5);
          }
        }

        /* 3-step pulse animation with glowing ring */
        .toast-icon-shell::before {
          content: '';
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(16, 185, 129, 0.5) 0%,
            rgba(16, 185, 129, 0.3) 40%,
            rgba(16, 185, 129, 0.1) 70%,
            transparent 100%
          );
          animation: iconPulse3Step 2s ease-in-out infinite;
          z-index: -1;
        }

        .toast-icon-shell svg {
          position: relative;
          width: 26px;
          height: 26px;
          color: white;
          stroke-width: 3.5;
          z-index: 1;
        }

        .toast-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
          cursor: pointer;
          z-index: 10;
        }

        .toast-close-btn:hover {
          transform: scale(1.05);
          background: rgba(107, 114, 128, 0.15);
          color: #374151;
        }

        .toast-close-btn:active {
          transform: scale(0.95);
        }

        .toast-body {
          display: flex;
          align-items: flex-start;
          gap: clamp(0.875rem, 2vw, 1.125rem);
        }

        .toast-text {
          flex: 1;
          min-width: 0;
        }

        .toast-text h4 {
          font-size: clamp(1rem, 2vw, 1.125rem);
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.375rem;
          line-height: 1.3;
        }

          .toast-text p {
            font-size: clamp(0.875rem, 1.8vw, 0.9375rem);
            color: #475569;
            line-height: 1.5;
          }

        .toast-actions {
          margin-top: clamp(0.875rem, 2vw, 1rem);
          padding-top: clamp(0.875rem, 2vw, 1rem);
          border-top: 1px solid rgba(229, 231, 235, 0.8);
          display: flex;
          gap: 0.75rem;
        }

        .toast-print-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: clamp(0.625rem, 1.5vw, 0.75rem) clamp(1rem, 2vw, 1.25rem);
          background: linear-gradient(135deg, #3A9EC2 0%, #14B8A6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: clamp(0.875rem, 1.8vw, 0.9375rem);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(58, 158, 194, 0.3);
          min-height: 44px;
        }

        .toast-print-btn:hover {
          background: linear-gradient(135deg, #2A8EAC 0%, #0D9488 100%);
          box-shadow: 0 6px 16px rgba(58, 158, 194, 0.4);
          transform: translateY(-1px);
        }

        .toast-print-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(58, 158, 194, 0.3);
        }

        .toast-print-btn svg {
          flex-shrink: 0;
        }

        .toast-preview-container {
          margin-top: clamp(1rem, 2vw, 1.25rem);
          padding-top: clamp(1rem, 2vw, 1.25rem);
          border-top: 1px solid rgba(229, 231, 235, 0.8);
        }

        .toast-preview-label {
          font-size: clamp(0.75rem, 1.5vw, 0.875rem);
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.5rem;
        }

        .toast-preview-wrapper {
          width: 100%;
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(229, 231, 235, 0.6);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          background: white;
          position: relative;
        }

        .toast-preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          transform: scale(0.3);
          transform-origin: top left;
          width: 333.33%;
          height: 333.33%;
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .toast-actions {
            margin-top: 0.875rem;
            padding-top: 0.875rem;
          }

          .toast-print-btn {
            padding: 0.625rem 1rem;
            min-height: 44px;
          }
        }
          color: #475569;
          line-height: 1.5;
          margin: 0;
          word-wrap: break-word;
        }

        /* Tablet Responsive */
        @media (min-width: 641px) and (max-width: 1024px) {
          .centered-prescription-toast {
            width: 420px;
            max-width: 420px;
            min-width: 420px;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .centered-prescription-toast {
            border-radius: 18px;
            min-width: unset;
            width: 90%;
            max-width: 90%;
            padding: 1rem 1.125rem;
          }

          .toast-icon-shell {
            width: 44px;
            height: 44px;
          }

          .toast-icon-shell svg {
            width: 22px;
            height: 22px;
          }

          .toast-icon-shell::before {
            inset: -8px;
          }

          .toast-close-btn {
            width: 28px;
            height: 28px;
            top: 0.75rem;
            right: 0.75rem;
          }

          .toast-close-btn svg {
            width: 14px;
            height: 14px;
          }

          .toast-body {
            gap: 0.875rem;
          }
        }

        /* Small Mobile */
        @media (max-width: 360px) {
          .toast-icon-shell {
            width: 36px;
            height: 36px;
          }

          .toast-icon-shell svg {
            width: 18px;
            height: 18px;
          }

          .toast-text h4 {
            font-size: 0.9375rem;
          }

          .toast-text p {
            font-size: 0.8125rem;
          }
        }

        .emergency-tab-label {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding-right: 1.5rem;
          font-weight: inherit;
        }

        .emergency-count-badge {
          position: absolute;
          top: -0.45rem;
          right: 0;
          background: #ff4d4f;
          color: #fff;
          font-size: 0.75rem;
          line-height: 1;
          padding: 0.125rem 0.375rem;
          border-radius: 50px;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(255, 77, 79, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.35);
          transform-origin: top right;
          animation: badgePop 0.18s ease-out;
        }

        .emergency-alert-dot {
          position: absolute;
          top: -0.2rem;
          right: 0.2rem;
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 999px;
          background: #ff4d4f;
          box-shadow: 0 0 0 6px rgba(255, 77, 79, 0.15);
        }

        @keyframes badgePop {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes toastIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes toastOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(18px) scale(0.95);
          }
        }

        @keyframes toastOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes toastOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* 3-step pulse animation */
        @keyframes iconPulse3Step {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          33% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          66% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* Medical Records Pagination Styles */
        .medical-pagination-wrapper {
          padding: 1.5rem 0;
          margin-top: 1.5rem;
          border-top: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pagination-info {
          text-align: center;
          padding: 0.5rem 0;
        }

        .pagination-info-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6B7280;
        }

        .medical-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .pagination-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          background: transparent;
          border: 1px solid #DDD;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 40px;
          min-width: 100px;
        }

        .pagination-btn:hover:not(.disabled) {
          background: #F9FAFB;
          border-color: #6C5CE7;
          color: #6C5CE7;
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.15);
          transform: translateY(-1px);
        }

        .pagination-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #F3F4F6;
          color: #9CA3AF;
        }

        .pagination-icon {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
        }

        .pagination-btn-text {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .pagination-numbers-desktop {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-wrap: wrap;
        }

        .pagination-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          background: transparent;
          border: 1px solid #DDD;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-number:hover {
          background: #F9FAFB;
          border-color: #6C5CE7;
          color: #6C5CE7;
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.15);
          transform: translateY(-1px);
        }

        .pagination-number.active {
          background: #6C5CE7;
          border-color: #6C5CE7;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
          transform: scale(1.05);
          animation: paginationScaleIn 0.2s ease-out;
        }

        @keyframes paginationScaleIn {
          0% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        .pagination-ellipsis {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          padding: 0 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6B7280;
          user-select: none;
        }

        .pagination-numbers-mobile {
          display: none;
        }

        .pagination-current-mobile {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        /* Medical Records Content Fade Animation */
        .medical-records-content {
          animation: paginationFadeIn 0.3s ease-out forwards;
        }

        @keyframes paginationFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile Responsive - Pagination */
        @media (max-width: 768px) {
          .medical-pagination-wrapper {
            padding: 1rem 0;
            margin-top: 1rem;
            gap: 0.875rem;
          }

          .pagination-info {
            padding: 0.25rem 0;
          }

          .pagination-info-text {
            font-size: 0.8125rem;
          }

          .pagination-numbers-desktop {
            display: none;
          }

          .pagination-numbers-mobile {
            display: block;
          }

          .pagination-btn {
            min-width: 90px;
            min-height: 44px;
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }

          .pagination-current-mobile {
            min-height: 44px;
            font-size: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .medical-pagination-wrapper {
            padding: 0.875rem 0;
            gap: 0.75rem;
          }

          .pagination-info-text {
            font-size: 0.75rem;
          }

          .pagination-btn {
            min-width: 80px;
            padding: 0.625rem 0.875rem;
            font-size: 0.8125rem;
          }

          .pagination-btn-text {
            font-size: 0.8125rem;
          }

          .pagination-icon {
            width: 0.875rem;
            height: 0.875rem;
          }

          .pagination-current-mobile {
            font-size: 0.8125rem;
          }
        }
      `}</style>
      
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Doctor Profile Section - Mobile Optimized */}
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded-2xl shadow-sm border border-blue-100/50 p-3 sm:p-4 mb-3 sm:mb-4">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Profile Photo - Fixed 80px on mobile */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-md border-3 border-white overflow-hidden">
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user?.fullName || 'Doctor'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl sm:text-2xl font-bold text-white">
                      {(user?.fullName || 'D').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Upload Button Overlay - Fixed position */}
                <button
                  onClick={openProfileModal}
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-all duration-200 border-2 border-white"
                  title="Upload Profile Photo"
                  aria-label="Upload Profile Photo"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* Doctor Info - Compact Layout */}
              <div className="flex-1 min-w-0">
                {/* Hospital Name - Left Aligned, No Overflow */}
                <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <span className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-purple-600 truncate">Tekisky</span>
                  <span className="text-sm sm:text-lg md:text-xl font-semibold text-slate-800 whitespace-nowrap">Hospital</span>
                  <span className="text-base sm:text-xl md:text-2xl font-bold text-slate-800">+</span>
                </div>
                
                {/* Doctor's Name - Proper Line Height */}
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1 leading-tight truncate">
                  Dr. {user?.fullName || 'Doctor'}
                </h2>
                
                {/* Degree (MD) */}
                {user?.qualification && (
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2 leading-snug">
                    {user.qualification}
                  </p>
                )}
                
                {/* Specialization Badge - Compact */}
                {user?.specialization && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-blue-200/50">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="capitalize truncate">{user.specialization}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 md:gap-4">
            {/* Left Side: Dashboard Info */}
            <div className="flex-1 min-w-0">
              <p className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 rounded-full border border-purple-100">
                Doctor Dashboard
              </p>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">Track patient rounds, craft prescriptions, and review medical records in one place.</p>
            </div>
            
            {/* Right Side: Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  className={`relative p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
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
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 ${
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
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-4 w-4 sm:h-5 sm:w-5 min-w-[16px] sm:min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-[9px] sm:text-[10px] md:text-xs font-bold text-white shadow-lg ring-1 sm:ring-2 ring-white z-10">
                      {patients.length > 99 ? '99+' : patients.length}
                    </span>
                  )}
                  {/* New patients pulsing indicator - only when there are new patients */}
                  {newPatients.length > 0 && !showNotificationDropdown && (
                    <span className="absolute top-0 right-0 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center pointer-events-none">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown / Mobile Bottom Drawer */}
                {showNotificationDropdown && (
                  <>
                    {/* Backdrop - Mobile Only */}
                    <div 
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] sm:hidden animate-[fadeIn_0.2s_ease-out]"
                      onClick={() => setShowNotificationDropdown(false)}
                    />
                    
                    {/* Dropdown (Desktop) / Bottom Drawer (Mobile) */}
                    <div className={`
                      fixed bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-none
                      sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:translate-x-0 sm:translate-y-2
                      sm:w-80 md:w-96
                      bg-white rounded-t-[20px] sm:rounded-xl
                      shadow-2xl border border-gray-200
                      z-[50] 
                      max-h-[85vh] sm:max-h-96
                      overflow-hidden
                      animate-[slideUp_0.3s_ease-out] sm:animate-none
                      flex flex-col
                    `}>
                      {/* Sticky Header */}
                      <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 sm:py-3 flex items-center justify-between z-10 shadow-sm">
                        <h3 className="text-white font-bold text-sm sm:text-sm flex items-center gap-2 flex-1 min-w-0">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span className="truncate">Patients Today ({patients.length})</span>
                          {newPatients.length > 0 && (
                            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0">
                              {newPatients.length} new
                            </span>
                          )}
                        </h3>
                        <button
                          onClick={() => setShowNotificationDropdown(false)}
                          className="text-white hover:text-gray-200 transition-colors flex-shrink-0 ml-2 p-1 rounded-full hover:bg-white/20"
                          aria-label="Close"
                        >
                          <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto px-4 sm:px-0">
                        {patients.length === 0 ? (
                          <div className="px-4 py-8 sm:py-12 text-center text-gray-500">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-xs sm:text-sm">No patients registered today</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 py-2 sm:py-0">
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
                                    className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 text-left hover:bg-purple-50 active:bg-purple-100 transition-colors duration-150 group ${
                                      isNew ? 'bg-blue-50/50 border-l-4 border-blue-500' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-2 sm:gap-3">
                                      {/* Patient Avatar */}
                                      <div className="relative flex-shrink-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-md text-sm sm:text-base ${
                                          isNew ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                                        }`}>
                                          {patient.fullName?.charAt(0).toUpperCase() || 'P'}
                                        </div>
                                        {isNew && (
                                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                            <span className="text-[8px] sm:text-[9px] text-white font-bold">!</span>
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Patient Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start sm:items-center justify-between gap-2 mb-1 sm:mb-1.5">
                                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors truncate text-sm sm:text-base" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}>
                                              {patient.fullName}
                                            </p>
                                            {patient.patientId && (
                                              <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] sm:text-[11px] font-semibold border border-blue-200 flex-shrink-0 whitespace-nowrap">
                                                {patient.patientId}
                                              </span>
                                            )}
                                            {isNew && (
                                              <span className="px-1 sm:px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] sm:text-[10px] font-bold flex-shrink-0 whitespace-nowrap">
                                                NEW
                                              </span>
                                            )}
                                          </div>
                                          <span className="flex-shrink-0 px-2 sm:px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-xs font-bold ml-auto">
                                            #{patient.tokenNumber}
                                          </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2 break-words" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                                          {patient.disease || 'No issue specified'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-500">
                                          {patient.age && (
                                            <span className="flex items-center gap-1">
                                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                              </svg>
                                              <span className="whitespace-nowrap">{patient.age} {patient.gender ? `• ${patient.gender}` : ''}</span>
                                            </span>
                                          )}
                                          {patient.mobileNumber && (
                                            <span className="flex items-center gap-1">
                                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                              </svg>
                                              <span className="whitespace-nowrap break-all">{patient.mobileNumber}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Arrow Icon - Hidden on mobile, shown on desktop */}
                                      <svg className="hidden sm:block w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  </>
                )}
              </div>
              
              <button
                onClick={() => setShowLimitModal(true)}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-medium whitespace-nowrap flex-1 sm:flex-initial shadow-sm"
              >
                Set Limit
              </button>
              <button
                onClick={logout}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs sm:text-sm font-medium whitespace-nowrap flex-1 sm:flex-initial shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Daily Statistics Section - Compact Desktop Layout */}
          {doctorStats && (
            <div className="mt-3 sm:mt-4">
              <div className="w-full max-w-[1100px] mx-auto lg:mx-0 lg:-ml-2 xl:-ml-1">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg py-4 px-4 sm:py-3 sm:py-4 sm:px-5 md:px-6 sm:max-h-[140px]">
                  <div className="flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-row items-stretch sm:items-center gap-4 sm:gap-4 lg:gap-6 md:gap-[24px] lg:justify-between h-full">
                    {/* Daily Limit Card */}
                    <div className="w-full sm:w-auto flex-1 min-w-0 py-2 sm:py-0 px-0 sm:px-4 md:px-5 lg:px-6 flex flex-col justify-center">
                      <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">Daily Limit</p>
                      <p className="text-2xl sm:text-3xl md:text-[32px] font-bold text-gray-900 leading-tight mb-1 sm:mb-1.5">
                        <span className="text-purple-600">{doctorStats.dailyPatientLimit}</span>
                        <span className="mx-1 sm:mx-1.5 text-lg sm:text-xl md:text-2xl text-gray-400">/</span>
                        <span className={`${doctorStats.remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {doctorStats.remainingSlots}
                        </span>
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">Total capacity / remaining slots</p>
                    </div>
                    
                    {/* Divider - Hidden on mobile and tablet, shown on desktop */}
                    <div className="hidden lg:block self-stretch w-px bg-gray-300 flex-shrink-0 my-2"></div>
                    
                    {/* Today's Patients Card */}
                    <button
                      type="button"
                      onClick={handleShowTodaysPatients}
                      className="w-full sm:w-auto flex-1 min-w-0 text-left py-2 sm:py-0 px-0 sm:px-4 md:px-5 lg:px-6 rounded-lg transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-300 flex flex-col justify-center"
                    >
                      <p className="text-[10px] sm:text-[11px] text-gray-500 flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        Today's Patients
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </p>
                      <p className="text-2xl sm:text-3xl md:text-[32px] font-bold text-gray-800 leading-tight">{doctorStats.todayPatientCount}</p>
                    </button>
                    
                    {/* Divider */}
                    <div className="hidden lg:block self-stretch w-px bg-gray-300 flex-shrink-0 my-2"></div>
                    
                    {/* Completed Patients Card */}
                    <button
                      type="button"
                      onClick={handleToggleCompletedPatients}
                      aria-expanded={showCompletedPatientsPanel}
                      className={`w-full sm:w-auto flex-1 min-w-0 text-left py-2 sm:py-0 px-0 sm:px-4 md:px-5 lg:px-6 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-purple-300 flex flex-col justify-center ${
                        showCompletedPatientsPanel ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                      }`}
                    >
                      <p className="text-[10px] sm:text-[11px] text-gray-500 flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        Completed Patients
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700">
                          {completedPatients.length}
                        </span>
                      </p>
                      <p className="text-2xl sm:text-3xl md:text-[32px] font-bold text-gray-800 leading-tight">{completedPatients.length}</p>
                    </button>
                  </div>
                </div>
              </div>

              {showCompletedPatientsPanel && (
                <div className="max-w-[1100px] mx-auto lg:mx-0 lg:-ml-2 xl:-ml-1 mt-3 sm:mt-4">
                  <div className="rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-purple-700">Completed Patients</p>
                        <p className="text-xs text-gray-500">Review completed consultations and pending names</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleCompletedPatients}
                        className="text-xs font-semibold text-gray-500 hover:text-purple-600 transition"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 max-h-56 overflow-y-auto pr-1">
                      {completedPatients.length > 0 ? (
                        completedPatients.map((patient) => {
                          const key = patient._id || patient.id || patient.patientId || patient.fullName
                          return (
                            <div
                              key={key}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-4"
                            >
                              <div className="min-w-[160px]">
                                <p className="text-sm font-semibold text-gray-900">
                                  {patient.fullName || 'Unnamed Patient'}
                                </p>
                                {patient.patientId && (
                                  <p className="text-xs text-gray-500">ID: {patient.patientId}</p>
                                )}
                              </div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                                Status: Completed
                              </div>
                              <p className="text-sm font-semibold text-gray-800">
                                Consultation Fee:{' '}
                                <span className="text-emerald-700">{formatConsultationFee(patient.fees)}</span>
                              </p>
                            </div>
                          )
                        })
                      ) : (
                        <p className="rounded-xl border border-dashed border-purple-200 bg-white p-4 text-sm text-gray-500">
                          No completed patients yet. Completed visits will appear here automatically.
                        </p>
                      )}
                    </div>

                    {remainingPatients.length > 0 && (
                      <div className="mt-4 border-t border-purple-100 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Remaining Patients</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {remainingPatients.map((patient) => {
                            const key = patient._id || patient.id || patient.patientId || `${patient.fullName}-remaining`
                            return (
                              <span
                                key={key}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm"
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    patient.status === 'in-progress' ? 'bg-amber-500' : 'bg-purple-500 animate-pulse'
                                  }`}
                                ></span>
                                {patient.fullName || 'Unnamed Patient'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 md:pt-6">
        {/* Mobile Hamburger Menu Button */}
        <div className="flex items-center justify-between mb-3 sm:mb-0 sm:hidden">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 truncate">
            {activeTab === 'active' && 'Active Patients'}
            {activeTab === 'today' && 'Patients Today'}
            {activeTab === 'emergency' && 'Emergency'}
            {activeTab === 'history' && 'Patient History'}
            {activeTab === 'medical' && 'Medical Records'}
            {activeTab === 'medicine' && 'View Medicine'}
          </h2>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown - Enhanced with Icons */}
        {showMobileMenu && (
          <div className="sm:hidden mb-4 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col">
              <button
                onClick={() => {
                  setActiveTab('active')
                  setShowMobileMenu(false)
                  try {
                    if (patients && patients.length > 0) {
                      const latest = [...patients].sort((a,b) => new Date(b.registrationDate) - new Date(a.registrationDate))[0]
                      if (latest?._id) setActivePatientFilter(latest._id)
                    }
                  } catch {}
                }}
                className={`px-4 py-3.5 text-left border-b border-gray-100 font-medium text-sm relative flex items-center gap-3 min-h-[44px] transition-colors ${
                  activeTab === 'active'
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1">Active Patients</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    {patients.length}
                  </span>
                  {activePatientFilter && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Active
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('today')
                  setActivePatientFilter(null)
                  setShowMobileMenu(false)
                }}
                className={`px-4 py-3.5 text-left border-b border-gray-100 font-medium text-sm flex items-center gap-3 min-h-[44px] transition-colors ${
                  activeTab === 'today'
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="flex-1">Patients Today</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('emergency')
                  setShowMobileMenu(false)
                }}
                className={`px-4 py-3.5 text-left border-b border-gray-100 font-medium text-sm relative flex items-center gap-3 min-h-[44px] transition-colors ${
                  activeTab === 'emergency'
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border-l-4 border-red-600'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="flex-1 emergency-tab-label">
                  Emergency
                  {emergencyPatients.length > 0 && (
                    <>
                      <span
                        key={emergencyPatients.length}
                        className="emergency-count-badge"
                      >
                        {emergencyPatients.length}
                      </span>
                      <span className="emergency-alert-dot" aria-hidden="true"></span>
                    </>
                  )}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('history')
                  setShowMobileMenu(false)
                }}
                className={`px-4 py-3.5 text-left border-b border-gray-100 font-medium text-sm flex items-center gap-3 min-h-[44px] transition-colors ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1">Patient History</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('medical')
                  setShowMobileMenu(false)
                }}
                className={`px-4 py-3.5 text-left border-b border-gray-100 font-medium text-sm relative flex items-center gap-3 min-h-[44px] transition-colors ${
                  activeTab === 'medical'
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1">Medical Records</span>
                {medicalRecords.length > 0 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    {medicalRecords.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('medicine')
                  setShowMobileMenu(false)
                }}
                className={`px-4 py-3.5 text-left font-medium text-sm flex items-center gap-3 min-h-[44px] transition-colors ${
                  activeTab === 'medicine'
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span className="flex-1">View Medicine</span>
              </button>
            </nav>
          </div>
        )}

        {/* Desktop Tab Bar */}
        <div className="hidden sm:block border-b border-gray-200">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto">
            {/* Active Patients first */}
            <button
              onClick={() => {
                setActiveTab('active')
                try {
                  if (patients && patients.length > 0) {
                    const latest = [...patients].sort((a,b) => new Date(b.registrationDate) - new Date(a.registrationDate))[0]
                    if (latest?._id) setActivePatientFilter(latest._id)
                  }
                } catch {}
              }}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm relative whitespace-nowrap ${
                activeTab === 'active'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Patients
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                {patients.length}
              </span>
              {activePatientFilter && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold animate-pulse">
                  Active
                </span>
              )}
            </button>
            {/* Patients Today after */}
            <button
              onClick={() => {
                setActiveTab('today')
                setActivePatientFilter(null)
              }}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'today'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients Today
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm relative whitespace-nowrap ${
                activeTab === 'emergency'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="emergency-tab-label">
                Emergency
                {emergencyPatients.length > 0 && (
                  <>
                    <span
                      key={emergencyPatients.length}
                      className="emergency-count-badge"
                    >
                      {emergencyPatients.length}
                    </span>
                    <span className="emergency-alert-dot" aria-hidden="true"></span>
                  </>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient History
            </button>
            <button
              onClick={() => setActiveTab('medical')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm relative whitespace-nowrap ${
                activeTab === 'medical'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medical Records
              {medicalRecords.length > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {medicalRecords.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('medicine')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'medicine'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View Medicine
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Patients Today Tab */}
        {activeTab === 'today' && (
          <div ref={todaysPatientsRef}>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6">Patients Today</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : filteredTodayPatients.length === 0 && !searchToday ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-purple-100 shadow-lg p-6 sm:p-8 md:p-12 text-center">
                <p className="text-gray-500 text-sm sm:text-base md:text-lg">No patients have registered today yet.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border border-purple-100 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="w-full lg:w-auto">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Today's Queue</p>
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 mt-1 leading-tight">Manage active consultations effortlessly</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        {filteredTodayPatients.length} {filteredTodayPatients.length === 1 ? 'patient' : 'patients'} in line • {patients.filter(p => p.status === 'waiting').length} waiting
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-purple-100 text-purple-600 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold shadow-inner">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {patients.filter((patient) => patient.status === 'completed').length} completed
                      </div>
                      <input
                        type="text"
                        value={searchToday}
                        onChange={(e) => setSearchToday(e.target.value)}
                        placeholder="Search patient, token, issue..."
                        className="w-full sm:w-64 md:w-72 rounded-full border border-purple-200 bg-white/80 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
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
                          const waitingStatusProps = isWaiting
                            ? {
                                role: 'button',
                                tabIndex: 0,
                                onClick: (event) => {
                                  event.stopPropagation()
                                  handleOpenPrescriptionModal(patient)
                                },
                                onKeyDown: (event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleOpenPrescriptionModal(patient)
                                  }
                                }
                              }
                            : {}
                          
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
                              className={`relative rounded-xl sm:rounded-2xl border ${
                                hasPendingFees ? 'border-orange-200 bg-orange-50/40' : 'border-purple-100 bg-white'
                              } shadow-sm transition-all duration-200 hover:shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/60 ${
                                isWaiting ? 'hover:border-purple-300' : ''
                              }`}
                            >
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 rounded-l-xl sm:rounded-l-2xl ${
                                  hasPendingFees
                                    ? 'bg-gradient-to-b from-orange-400 via-orange-500 to-red-400'
                                    : 'bg-gradient-to-b from-purple-400 via-purple-500 to-blue-500'
                                }`}
                              ></div>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4 md:px-5 py-3 sm:py-4 md:py-5">
                                <div className="md:col-span-3 flex items-start gap-2 sm:gap-3 md:gap-4">
                                  <div
                                    className={`flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center rounded-full font-semibold text-white shadow-md text-xs sm:text-sm flex-shrink-0 ${
                                      hasPendingFees
                                        ? 'bg-gradient-to-br from-orange-500 to-red-500'
                                        : 'bg-gradient-to-br from-purple-500 to-blue-600'
                                    }`}
                                  >
                                    {formattedToken}
                                  </div>
                                      <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                      <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{patient.fullName}</p>
                                      {patient.patientId && (
                                        <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-blue-700">
                                          {patient.patientId}
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-500 whitespace-nowrap">• {patient.age} yrs</span>
                                      <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-purple-100 bg-purple-50 px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-purple-600">
                                        Token #{formattedToken}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">Mobile: {patient.mobileNumber}</p>
                                    <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                                      {patient.isRecheck || patient.feeStatus === 'not_required' ? (
                                        <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold text-blue-600">
                                          <span className="text-sm sm:text-base">↺</span>
                                          Recheck-up
                                        </span>
                                      ) : (
                                        <span
                                          className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full border px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold ${
                                            patient.feeStatus === 'paid'
                                              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                              : 'border-orange-100 bg-orange-50 text-orange-600'
                                          }`}
                                        >
                                          {patient.feeStatus === 'paid' ? '✓ Fees Paid' : 'Pending Fees'}
                                        </span>
                                      )}
                                      {patient.behaviorRating && (
                                        <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-amber-100 bg-amber-50 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium text-amber-600">
                                          ★ {patient.behaviorRating}/5
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Issue</span>
                                  <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-blue-50 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-blue-600 shadow-sm">
                                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                    <span className="truncate">{patient.disease || 'Not specified'}</span>
                                  </span>
                                  {patient.notes && (
                                    <p className="text-xs text-slate-500 break-words line-clamp-2">{patient.notes}</p>
                                  )}
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Vitals</span>
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs font-medium text-slate-600">
                                    {patient.bloodPressure ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 sm:px-2.5 py-0.5 sm:py-1">
                                        <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.654 0-3 1.346-3 3 0 1.933 3 5 3 5s3-3.067 3-5c0-1.654-1.346-3-3-3z" />
                                        </svg>
                                        <span className="truncate">BP: {patient.bloodPressure}</span>
                                      </span>
                                    ) : null}
                                    {sugarFormatted ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 sm:px-2.5 py-0.5 sm:py-1">
                                        <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v5a4 4 0 004 4h6a4 4 0 004-4v-5a2 2 0 00-2-2z" />
                                        </svg>
                                        <span className="truncate">Sugar: {sugarFormatted}</span>
                                      </span>
                                    ) : null}
                                    {!patient.bloodPressure && !sugarFormatted && (
                                      <span className="text-xs text-slate-400">No vitals recorded</span>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Schedule</span>
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs font-medium text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-purple-100 bg-white px-2 sm:px-3 py-0.5 sm:py-1 shadow-sm">
                                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                                      </svg>
                                      <span className="truncate">{visitTimeFormatted}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-purple-100 bg-white px-2 sm:px-3 py-0.5 sm:py-1 shadow-sm">
                                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span className="truncate">{visitDateFormatted}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="md:col-span-1 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                                  <span
                                    {...waitingStatusProps}
                                    className={`inline-flex items-center justify-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold ${
                                      patient.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : patient.status === 'in-progress'
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                        : 'bg-slate-50 text-slate-600 border border-slate-100 cursor-pointer hover:border-purple-200 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200'
                                    }`}
                                  >
                                    {patient.status === 'completed'
                                      ? 'Completed'
                                      : patient.status === 'in-progress'
                                      ? 'In Progress'
                                      : 'Waiting'}
                                  </span>
                                </div>

                                <div className="md:col-span-2 flex flex-wrap gap-1.5 sm:gap-2 justify-start md:justify-end">
                                  {hasPendingFees && (
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleMarkAsPaid(patient)
                                      }}
                                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                                    >
                                      Mark as Paid
                                    </button>
                                  )}
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openMedicalHistory(patient)
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                                  >
                                    View History
                                  </button>
                                  {patient.status !== 'completed' && (
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleOpenPrescriptionModal(patient)
                                      }}
                                      className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                                    >
                                      Add Prescription
                                    </button>
                                  )}
                                  {patient.status === 'completed' && patient.prescription && (
                                    <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-emerald-600">
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
                        <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-purple-50/60 border border-purple-100 px-3 sm:px-4 py-2 sm:py-3">
                            <span className="text-xs sm:text-sm text-slate-600">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1">Active Patients</h2>
                <p className="text-xs text-gray-500">Currently Treating Patient</p>
              </div>
              {activePatientFilter && (
                <button
                  onClick={handleClearActiveFilter}
                  className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors flex items-center gap-2 border border-purple-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filter
                </button>
              )}
            </div>

            {!activePatientFilter ? (
              <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1.5 sm:mb-2">No Active Patient Selected</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    Click on a patient from the notification dropdown or select a patient from "Patients Today" to view their details here.
                  </p>
                  <button
                    onClick={() => setActiveTab('today')}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-xs sm:text-sm"
                  >
                    View All Patients
                  </button>
                </div>
              </div>
            ) : filteredTodayPatients.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-purple-100 shadow-lg p-6 sm:p-8 md:p-12 text-center">
                <p className="text-gray-500 text-sm sm:text-base md:text-lg">Patient not found or no longer available.</p>
                <button
                  onClick={handleClearActiveFilter}
                  className="mt-3 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-xs sm:text-sm"
                >
                  Clear Filter
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                {/* Active Consultation - Compact Professional Design */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Active Patients</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Currently Treating Patient</p>
                    </div>
                  </div>

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
                    const isWaitingStatus = patient.status !== 'completed' && patient.status !== 'in-progress'
                    const waitingStatusProps = isWaitingStatus
                      ? {
                          role: 'button',
                          tabIndex: 0,
                          onClick: () => handleOpenPrescriptionModal(patient),
                          onKeyDown: (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handleOpenPrescriptionModal(patient)
                            }
                          }
                        }
                      : {}

                    return (
                      <div
                        key={patient._id}
                        className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200"
                        role="article"
                        aria-label={`Patient ${patient.fullName} consultation card`}
                      >
                        {/* Main Content - Two Column Layout */}
                        <div className="p-3 sm:p-4 md:p-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 sm:gap-4 md:gap-5">
                          {/* Left Column - Patient Information */}
                          <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                            {/* Patient Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#6C63FF]/20 to-[#3A9EC2]/20 flex items-center justify-center border-2 border-[#6C63FF]/30">
                                <span className="text-sm sm:text-base md:text-lg font-semibold text-[#6C63FF]">
                                  {patient.fullName?.charAt(0).toUpperCase() || 'P'}
                                </span>
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 bg-[#6C63FF] rounded-full border-2 border-white flex items-center justify-center">
                                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></span>
                              </span>
                            </div>

                            {/* Patient Details */}
                            <div className="flex-1 min-w-0">
                              {/* Name and Token */}
                              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm sm:text-base md:text-[17px] font-semibold text-gray-900 mb-1 sm:mb-1.5 truncate">
                                    {patient.fullName}
                                  </h4>
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    {patient.patientId && (
                                      <span className="text-xs text-gray-600 font-medium truncate">
                                        {patient.patientId}
                                      </span>
                                    )}
                                    {patient.age && (
                                      <span className="text-xs text-gray-600 whitespace-nowrap">
                                        {patient.age} {patient.gender ? `• ${patient.gender}` : ''}
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-[#6C63FF]/10 text-[#6C63FF] text-xs font-medium">
                                      Token #{formattedToken}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Health Issue */}
                              {patient.disease && (
                                <div className="mb-2 sm:mb-3">
                                  <p className="text-xs font-medium text-gray-500 mb-1 sm:mb-1.5">Health Issue</p>
                                  <div className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#3A9EC2]/10 border border-[#3A9EC2]/20">
                                    <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{patient.disease}</span>
                                  </div>
                                </div>
                              )}

                              {/* Vitals Microcards */}
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                {/* BP Microcard */}
                                <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                                  <span className="text-xs font-medium text-gray-500">BP</span>
                                  <span className="text-xs font-semibold text-gray-900 truncate">{patient.bloodPressure || 'N/A'}</span>
                                </div>
                                {/* Sugar Microcard */}
                                <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                                  <span className="text-xs font-medium text-gray-500">Sugar</span>
                                  <span className="text-xs font-semibold text-gray-900 truncate">{sugarFormatted}</span>
                                </div>
                                {/* Status Microcard */}
                                <div
                                  {...waitingStatusProps}
                                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium ${
                                    patient.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : patient.status === 'in-progress'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 cursor-pointer hover:bg-[#6C63FF]/15 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:ring-offset-1'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    patient.status === 'completed' ? 'bg-emerald-500'
                                    : patient.status === 'in-progress' ? 'bg-amber-500'
                                    : 'bg-[#6C63FF]'
                                  }`}></span>
                                  <span className="truncate">{patient.status === 'completed' ? 'Completed' : patient.status === 'in-progress' ? 'In Progress' : 'Waiting'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column - Quick Actions - Full Width on Mobile */}
                          <div className="flex flex-col gap-2.5 sm:gap-2.5 lg:items-end lg:border-l lg:border-gray-200 lg:pl-3 md:pl-5">
                            {/* Primary CTA - Add Prescription (Full Width on Mobile) */}
                            {patient.status !== 'completed' && (
                              <button
                                onClick={() => {
                                  setSelectedPatient(patient)
                                  setShowPrescriptionModal(true)
                                }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 transition-all duration-150 flex items-center justify-center gap-2 shadow-md hover:shadow-lg min-h-[44px]"
                                aria-label={`Add prescription for ${patient.fullName}`}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Prescription
                              </button>
                            )}

                            {/* Secondary Actions - Full Width on Mobile */}
                            <div className="flex items-center gap-2 w-full">
                              {/* Previous Medical History Button - Full Width */}
                              <button
                                onClick={() => openMedicalHistory(patient)}
                                className="flex-1 px-4 py-2.5 bg-white border-2 border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 transition-all duration-150 flex items-center justify-center gap-2 min-h-[44px]"
                                aria-label={`View previous medical history for ${patient.fullName}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="hidden sm:inline">Previous History</span>
                                <span className="sm:hidden">History</span>
                              </button>
                              
                              {/* Call Button - Icon Only on Mobile */}
                              {patient.mobileNumber && (
                                <a
                                  href={`tel:${patient.mobileNumber}`}
                                  className="flex items-center justify-center w-12 h-12 rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 transition-colors duration-150 flex-shrink-0"
                                  aria-label={`Call ${patient.fullName} at ${patient.mobileNumber}`}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                </a>
                              )}
                            </div>

                            {/* Mobile Number Display */}
                            {patient.mobileNumber && (
                              <div className="text-left sm:text-right mt-0.5 sm:mt-1">
                                <p className="text-xs text-gray-500">Mobile</p>
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{patient.mobileNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Additional Info Footer (if needed) */}
                        {(patient.feeStatus === 'paid' || patient.behaviorRating) && (
                          <div className="px-3 sm:px-4 md:px-5 py-2 sm:py-3 bg-gray-50/50 border-t border-gray-100 flex items-center gap-2 sm:gap-3 flex-wrap">
                            {patient.feeStatus === 'paid' && (
                              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Fees Paid
                              </span>
                            )}
                            {patient.behaviorRating && (
                              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                {patient.behaviorRating}/5
                              </span>
                            )}
                          </div>
                        )}

                        {/* Inline History Panel */}
                        {renderInlineHistoryPanel(patient, {
                          formattedToken,
                          visitDateFormatted,
                          visitTimeFormatted
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency Tab */}
        {activeTab === 'emergency' && (
          <div key="emergency-tab-content">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold uppercase tracking-wide">Emergency</span>
              <span>Emergency Patients</span>
            </h2>

            {loadingEmergency ? (
              <div className="text-center py-8 sm:py-10 md:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">Loading emergency patients...</p>
              </div>
            ) : emergencyPatients.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-red-100 shadow-lg p-6 sm:p-8 md:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm sm:text-base md:text-lg font-semibold">No Emergency Patients</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1.5 sm:mt-2">Emergency patients will appear here when registered.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="bg-gradient-to-br from-white via-red-50 to-orange-50 border border-red-100 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="w-full lg:w-auto">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Emergency Queue</p>
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 mt-1 leading-tight">Urgent patient care required</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        {emergencyPatients.length} {emergencyPatients.length === 1 ? 'emergency patient' : 'emergency patients'} requiring immediate attention
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-red-100 text-red-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-inner">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {emergencyPatients.length} Urgent
                    </div>
                  </div>

                  <div className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4 bg-white/60">
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
                          className="relative rounded-xl sm:rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50 shadow-lg transition-all duration-200 hover:shadow-xl"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 rounded-l-xl sm:rounded-l-2xl bg-gradient-to-b from-red-500 via-red-600 to-orange-600"></div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
                            <div className="md:col-span-3 flex items-start gap-2 sm:gap-3 md:gap-4">
                              <div className="flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center rounded-full font-semibold text-white shadow-md bg-gradient-to-br from-red-500 to-orange-600 flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                              <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{patient.fullName}</p>
                                  {patient.patientId && (
                                    <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-blue-700">
                                      {patient.patientId}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-500 whitespace-nowrap">• {patient.age} yrs</span>
                                  <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-red-200 bg-red-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-red-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 flex-shrink-0"></span>
                                    EMERGENCY
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">Mobile: {patient.mobileNumber}</p>
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
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 md:mb-6">Patient History</h2>

            {loadingHistory ? (
              <div className="text-center py-8 sm:py-10 md:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : patientHistory.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-purple-100 shadow-lg p-6 sm:p-8 md:p-12 text-center">
                <p className="text-gray-500 text-sm sm:text-base md:text-lg">No patient history available</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="bg-gradient-to-br from-white via-purple-50 to-blue-50 border border-purple-100 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="w-full lg:w-auto">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">Patient History</p>
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 mt-1 leading-tight">Review previous consultations at a glance</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Showing {filteredHistoryPatients.length} record{filteredHistoryPatients.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-purple-100 text-purple-600 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold shadow-inner">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                        className="w-full sm:w-64 md:w-80 rounded-full border border-purple-200 bg-white/80 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      />
                    </div>
                  </div>

                  {filteredHistoryPatients.length === 0 ? (
                    <div className="px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 text-center text-xs sm:text-sm text-slate-500 border-t border-purple-100 bg-white/70">
                      No matching history entries. Try refining your search.
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:grid grid-cols-12 gap-4 md:gap-6 px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-white/70 border-t border-purple-100">
                        <span className="col-span-2">Visit</span>
                        <span className="col-span-2">Token</span>
                        <span className="col-span-3">Patient</span>
                        <span className="col-span-2">Issue</span>
                        <span className="col-span-1">Status</span>
                        <span className="col-span-2 text-right">Prescription</span>
                      </div>
                      <div className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4 bg-white/60 overflow-x-auto">
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
                          const isWaitingStatus = patient.status !== 'completed' && patient.status !== 'in-progress'
                          const waitingStatusProps = isWaitingStatus
                            ? {
                                role: 'button',
                                tabIndex: 0,
                                onClick: () => handleOpenPrescriptionModal(patient),
                                onKeyDown: (event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    handleOpenPrescriptionModal(patient)
                                  }
                                }
                              }
                            : {}

                          return (
                            <div
                              key={patient._id || `${patient.tokenNumber}-${patient.registrationDate}`}
                              className={`relative rounded-xl sm:rounded-2xl border ${
                                hasPendingFees ? 'border-orange-200 bg-orange-50/40' : 'border-purple-100 bg-white'
                              } shadow-sm transition-all duration-200 hover:shadow-md`}
                            >
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 rounded-l-xl sm:rounded-l-2xl ${
                                  hasPrescription
                                    ? 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600'
                                    : 'bg-gradient-to-b from-purple-400 via-purple-500 to-blue-500'
                                }`}
                              ></div>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4 md:px-5 py-3 sm:py-4 md:py-5">
                                <div className="md:col-span-2 space-y-1">
                                  <p className="text-xs font-semibold text-slate-700">Visit Date</p>
                                  <p className="text-xs sm:text-sm font-medium text-slate-900">{visitDateDisplay}</p>
                                  <p className="text-xs text-slate-500">{visitTimeDisplay}</p>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Token</span>
                                  <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-purple-100 bg-purple-50 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-purple-600 shadow-sm">
                                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-purple-500 flex-shrink-0"></span>
                                    #{formattedToken}
                                  </span>
                                </div>

                                <div className="md:col-span-3 space-y-1.5 sm:space-y-2">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{patient.fullName}</p>
                                    {patient.patientId && (
                                      <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-blue-700">
                                        {patient.patientId}
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-500 whitespace-nowrap">Age {patient.age}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">Mobile: {patient.mobileNumber || '—'}</p>
                                  <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                                    {patient.isRecheck || patient.feeStatus === 'not_required' ? (
                                      <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold text-blue-600">
                                        Recheck-up
                                      </span>
                                    ) : (
                                      <span
                                        className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full border px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold ${
                                          patient.feeStatus === 'paid'
                                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                            : 'border-orange-100 bg-orange-50 text-orange-600'
                                        }`}
                                      >
                                        {patient.feeStatus === 'paid' ? '✓ Fees Paid' : 'Pending Fees'}
                                      </span>
                                    )}
                                    {patient.behaviorRating && (
                                      <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-amber-100 bg-amber-50 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium text-amber-600">
                                        ★ {patient.behaviorRating}/5
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Issue</span>
                                  <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-blue-50 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-blue-600 shadow-sm">
                                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                    <span className="truncate">{patient.disease || 'Not specified'}</span>
                                  </span>
                                </div>

                                <div className="md:col-span-1 flex flex-col gap-1.5 sm:gap-2">
                                  <span className="text-xs uppercase tracking-wide text-slate-400">Status</span>
                                  <span
                                    {...waitingStatusProps}
                                    className={`inline-flex items-center justify-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold ${
                                      patient.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : patient.status === 'in-progress'
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                        : 'bg-slate-50 text-slate-600 border border-slate-100 cursor-pointer hover:border-purple-200 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200'
                                    }`}
                                  >
                                    {patient.status === 'completed'
                                      ? 'Completed'
                                      : patient.status === 'in-progress'
                                      ? 'In Progress'
                                      : 'Waiting'}
                                  </span>
                                </div>

                                <div className="md:col-span-2 flex flex-col items-start md:items-end justify-between gap-2 sm:gap-3">
                                  <button
                                    onClick={() => openMedicalHistory(patient)}
                                    className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 w-full sm:w-auto"
                                  >
                                    View History
                                  </button>
                                  {hasPrescription ? (
                                    <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-emerald-600">
                                      <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
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
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold uppercase tracking-wide">💊</span>
                  <span>View Medicine</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">Search medicines by name or composition in real-time</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={exportMedicinesToExcel}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold flex-1 sm:flex-initial"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel
                </button>
              </div>
            </div>

            {/* Search Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 p-3 sm:p-4 md:p-6">
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
                        className="w-full pl-10 sm:pl-12 pr-24 sm:pr-32 py-2 sm:py-2.5 md:py-3 border-2 border-purple-200 rounded-lg sm:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition text-xs sm:text-sm"
                      />
                      {medicineSearch && (
                        <button
                          onClick={clearMedicineSearch}
                          className="search-clear-btn top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {isListening && (
                        <div className="absolute right-16 sm:right-24 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 text-red-500">
                          <span className="animate-pulse text-xs sm:text-sm">●</span>
                          <span className="text-xs font-semibold">Listening...</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition flex-shrink-0 ${
                        isListening
                          ? 'bg-purple-700 text-white hover:bg-purple-800'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                      title="Voice Search"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>

                  {/* Auto-suggestions Dropdown */}
                  {showSearchSuggestions && searchMedicineSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-lg sm:rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {searchMedicineSuggestions.slice(0, 5).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectSuggestion(suggestion.name)}
                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-purple-50 transition border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-purple-600 text-sm sm:text-base">💊</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{suggestion.name}</p>
                              {suggestion.genericName && (
                                <p className="text-xs text-gray-500 truncate">{suggestion.genericName}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Filter by Category:</label>
                  <select
                    value={medicineCategory}
                    onChange={(e) => setMedicineCategory(e.target.value)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-xs sm:text-sm"
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
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 p-6 sm:p-8 md:p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-3 sm:mb-4"></div>
                <p className="text-gray-500 text-xs sm:text-sm">Searching medicines...</p>
              </div>
            ) : medicines.length === 0 ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 p-6 sm:p-8 md:p-12 text-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-2">No medicines found</p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {medicineSearchDebounced
                    ? 'Try adjusting your search terms or filters'
                    : 'Start typing to search for medicines'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-gradient-to-r from-purple-50 to-purple-100">
                      <tr>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">💊 Medicine</th>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🧪 Composition</th>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">💰 Price</th>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🕒 Dosage</th>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">🏭 Manufacturer</th>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📦 Stock</th>
                        <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {medicines.map((medicine) => (
                        <tr key={medicine._id} className="hover:bg-purple-50 transition">
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{medicine.name}</p>
                              {medicine.brandName && (
                                <p className="text-xs text-gray-500 truncate">{medicine.brandName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <p className="text-xs sm:text-sm text-gray-700 truncate">{medicine.genericName || 'N/A'}</p>
                          </td>
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <p className="text-xs sm:text-sm font-semibold text-purple-600">₹{medicine.price || 0}</p>
                            {medicine.unit && (
                              <p className="text-xs text-gray-500">per {medicine.unit}</p>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <p className="text-xs sm:text-sm text-gray-700 truncate">
                              {medicine.strength || 'N/A'} {medicine.form || ''}
                            </p>
                          </td>
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <p className="text-xs sm:text-sm text-gray-700 truncate">{medicine.manufacturer || 'N/A'}</p>
                          </td>
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              (medicine.stockQuantity || 0) <= (medicine.minStockLevel || 10)
                                ? 'bg-red-100 text-red-800'
                                : (medicine.stockQuantity || 0) > 0
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {medicine.stockQuantity || 0} {medicine.unit || 'units'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                            <button
                              onClick={() => handleMedicineSelect(medicine)}
                              className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs sm:text-sm font-semibold whitespace-nowrap"
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
          <div ref={medicalRecordsRef}>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-1.5 sm:mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold uppercase tracking-wide">Tekisky Records</span>
              <span>Doctor View</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 md:mb-6">Review previously issued prescriptions and regenerate PDFs for your patients.</p>

            {loadingMedical ? (
              <div className="text-center py-8 sm:py-10 md:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : medicalRecords.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 sm:p-8 md:p-12 text-center">
                <p className="text-gray-500 text-sm sm:text-base md:text-lg">No medical records available</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1.5 sm:mt-2">Prescriptions will appear here after you add them</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-end">
                  <input
                    type="text"
                    value={searchMedical}
                    onChange={(e) => setSearchMedical(e.target.value)}
                    placeholder="Search patient, token, issue..."
                    className="w-full sm:w-64 md:w-80 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm"
                  />
                </div>
                {filteredMedicalRecords.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 sm:p-8 md:p-12 text-center">
                    <p className="text-gray-500 text-sm sm:text-base md:text-lg">No matching records</p>
                  </div>
                ) : (
                  <>
                  <div className="space-y-3 sm:space-y-4 medical-records-content" key={`medical-page-${medicalPage}`}>
                  {paginatedMedicalRecords.map((patient) => (
                  <div key={patient._id} className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6 border-l-4 border-purple-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-xs sm:text-sm">
                            Token: {patient.tokenNumber}
                          </span>
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            ✓ Prescribed
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 truncate">{patient.fullName}</h3>
                          {patient.patientId && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                              </svg>
                              {patient.patientId}
                            </span>
                          )}
                        </div>
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
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openMedicalHistory(patient)}
                          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center gap-2 text-sm font-semibold"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View History
                        </button>
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
                  ))}
                  </div>
                  
                  {/* Pagination Component */}
                  {medicalTotalPages > 1 && (
                    <div className="medical-pagination-wrapper">
                      {/* Page Info */}
                      <div className="pagination-info">
                        <span className="pagination-info-text">
                          Showing {((medicalPage - 1) * PAGE_SIZE_MEDICAL) + 1} - {Math.min(medicalPage * PAGE_SIZE_MEDICAL, filteredMedicalRecords.length)} of {filteredMedicalRecords.length} records
                        </span>
                      </div>
                      <nav className="medical-pagination" aria-label="Medical Records Pagination">
                        {/* Previous Button */}
                        <button
                          onClick={handleMedicalPrevious}
                          disabled={medicalPage === 1}
                          className={`pagination-btn pagination-prev ${medicalPage === 1 ? 'disabled' : ''}`}
                          aria-label="Previous page"
                        >
                          <svg className="pagination-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span className="pagination-btn-text">Previous</span>
                        </button>
                        
                        {/* Page Numbers - Desktop */}
                        <div className="pagination-numbers-desktop">
                          {(() => {
                            const pages = []
                            const showEllipsis = medicalTotalPages > 7
                            
                            if (!showEllipsis) {
                              // Show all pages if total pages <= 7
                              for (let i = 1; i <= medicalTotalPages; i++) {
                                pages.push(
                                  <button
                                    key={i}
                                    onClick={() => handleMedicalPageChange(i)}
                                    className={`pagination-number ${medicalPage === i ? 'active' : ''}`}
                                    aria-label={`Go to page ${i}`}
                                    aria-current={medicalPage === i ? 'page' : undefined}
                                  >
                                    {i}
                                  </button>
                                )
                              }
                            } else {
                              // Show first page
                              pages.push(
                                <button
                                  key={1}
                                  onClick={() => handleMedicalPageChange(1)}
                                  className={`pagination-number ${medicalPage === 1 ? 'active' : ''}`}
                                  aria-label="Go to page 1"
                                  aria-current={medicalPage === 1 ? 'page' : undefined}
                                >
                                  1
                                </button>
                              )
                              
                              // Show ellipsis and pages around current
                              if (medicalPage > 3) {
                                pages.push(<span key="ellipsis-start" className="pagination-ellipsis">...</span>)
                              }
                              
                              // Show pages around current
                              const start = Math.max(2, medicalPage - 1)
                              const end = Math.min(medicalTotalPages - 1, medicalPage + 1)
                              
                              for (let i = start; i <= end; i++) {
                                if (i !== 1 && i !== medicalTotalPages) {
                                  pages.push(
                                    <button
                                      key={i}
                                      onClick={() => handleMedicalPageChange(i)}
                                      className={`pagination-number ${medicalPage === i ? 'active' : ''}`}
                                      aria-label={`Go to page ${i}`}
                                      aria-current={medicalPage === i ? 'page' : undefined}
                                    >
                                      {i}
                                    </button>
                                  )
                                }
                              }
                              
                              // Show ellipsis before last page if needed
                              if (medicalPage < medicalTotalPages - 2) {
                                pages.push(<span key="ellipsis-end" className="pagination-ellipsis">...</span>)
                              }
                              
                              // Show last page
                              if (medicalTotalPages > 1) {
                                pages.push(
                                  <button
                                    key={medicalTotalPages}
                                    onClick={() => handleMedicalPageChange(medicalTotalPages)}
                                    className={`pagination-number ${medicalPage === medicalTotalPages ? 'active' : ''}`}
                                    aria-label={`Go to page ${medicalTotalPages}`}
                                    aria-current={medicalPage === medicalTotalPages ? 'page' : undefined}
                                  >
                                    {medicalTotalPages}
                                  </button>
                                )
                              }
                            }
                            
                            return pages
                          })()}
                        </div>
                        
                        {/* Current Page - Mobile Only */}
                        <div className="pagination-numbers-mobile">
                          <span className="pagination-current-mobile">Page {medicalPage} of {medicalTotalPages}</span>
                        </div>
                        
                        {/* Next Button */}
                        <button
                          onClick={handleMedicalNext}
                          disabled={medicalPage === medicalTotalPages}
                          className={`pagination-btn pagination-next ${medicalPage === medicalTotalPages ? 'disabled' : ''}`}
                          aria-label="Next page"
                        >
                          <span className="pagination-btn-text">Next</span>
                          <svg className="pagination-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* Prescription Modal - Mobile Responsive */}
      {showPrescriptionModal && selectedPatient && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={handleClosePrescriptionModal}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-[24px] max-w-4xl w-full h-[95vh] sm:h-auto sm:max-h-[95vh] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col animate-[slideIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            {/* Modal Header with Sticky Top Bar - Mobile Optimized */}
            <div className="sticky top-0 bg-gradient-to-r from-white via-[#F4F4F7] to-white border-b border-[#E5E5EA] px-4 sm:px-6 py-4 sm:py-5 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-1.5 leading-tight">
                    Create Prescription – <span className="truncate block sm:inline">{selectedPatient.fullName}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                    Add diagnosis, medicines, dosage timings, tests, and doctor notes.
                  </p>
                </div>
                <button
                  onClick={handleClosePrescriptionModal}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 flex-shrink-0"
                  aria-label="Close modal"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable Content Area - Mobile Padding */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6" style={{ backgroundColor: '#F4F4F7' }}>
            <div className="space-y-4 sm:space-y-6">
              {/* Health Issue Input - Mobile Optimized */}
              <div className="bg-white rounded-2xl sm:rounded-[22px] p-4 sm:p-6 shadow-sm border border-gray-100">
                <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3">
                  Health Issue <span className="text-[#3A9EC2]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="diagnosis-options"
                    value={prescriptionData.diagnosis}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                    placeholder="Enter health issue (e.g., Headache, Fever, Migraine…)"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border border-gray-200 rounded-xl sm:rounded-[16px] focus:ring-2 focus:ring-[#3A9EC2]/20 focus:border-[#3A9EC2] outline-none transition-all bg-white text-sm sm:text-base text-gray-900 placeholder:text-gray-400"
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
                      <p className="mt-2 text-xs text-gray-500 font-medium">
                        Suitable for <span className="font-semibold text-gray-700">{user.specialization}</span> • Custom issue allowed
                      </p>
                    )
                  }
                  return (
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                      Suitable for <span className="font-semibold text-gray-700">{user.specialization}</span> • Custom issue allowed
                    </p>
                  )
                })()}
              </div>

              {/* Diagnosis Notes - Mobile Optimized */}
              <div className="bg-white rounded-2xl sm:rounded-[22px] p-4 sm:p-6 shadow-sm border border-gray-100">
                <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3">
                  Diagnosis Notes
                </label>
                <textarea
                  value={prescriptionData.diagnosisNotes}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosisNotes: e.target.value })}
                  placeholder="Enter clinical notes (e.g., BP: 120/80, Pulse: 72, Temperature: 98.6°F, remarks…)"
                  rows="3"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border border-gray-200 rounded-xl sm:rounded-[16px] focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] outline-none transition-all resize-none text-sm bg-white text-gray-900 placeholder:text-gray-400"
                />
                <p className="mt-2 text-xs text-gray-500 font-medium">
                  Add clinical observations such as vital signs, physical examination findings, or other relevant notes.
                </p>
              </div>

              {/* Prescribed Medicines Section - Mobile Optimized */}
              <div className="bg-white rounded-xl sm:rounded-[20px] p-3 sm:p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800">
                    Prescribed Medicines <span className="text-[#3A9EC2]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addMedicineField}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2.5 bg-gradient-to-r from-[#6C63FF] via-[#3A9EC2] to-[#14B8A6] text-white rounded-xl sm:rounded-[14px] hover:opacity-90 transition-all text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md w-full sm:w-auto min-h-[44px]"
                    style={{ background: 'linear-gradient(to right, #6C63FF, #3A9EC2, #14B8A6)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Medicine
                  </button>
                    <button
                      type="button"
                      onClick={() => setShowInventoryPanel((prev) => !prev)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] border-2 text-sm font-semibold transition-all ${
                        showInventoryPanel
                          ? 'border-[#3A9EC2] bg-[#3A9EC2]/10 text-[#3A9EC2]'
                          : 'border-[#3A9EC2]/30 bg-white text-[#3A9EC2] hover:bg-[#3A9EC2]/5'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" />
                      </svg>
                      {showInventoryPanel ? 'Hide' : 'View'} Injections & Surgical Items
                      {selectedInventoryItems.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#6C63FF] text-white text-[11px] px-2 py-0.5 font-bold">
                          {selectedInventoryItems.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                    {prescriptionData.medicines.map((medicine, index) => (
                      <div key={index} className="bg-white rounded-[20px] p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {/* Medicine Name Column */}
                          <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Medicine</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={listeningMedicineIndex === index ? 'Listening…' : 'Start typing to search'}
                                value={medicine.name}
                                onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                                className="w-full px-3 pr-[48px] py-2.5 border border-gray-200 rounded-[10px] focus:ring-2 focus:ring-[#3A9EC2]/20 focus:border-[#3A9EC2] outline-none transition-all bg-white text-sm"
                              />
                              <button
                                type="button"
                                aria-label="Voice search medicine"
                                onClick={() => {
                                  if (!isVoiceSupportedMedicine) {
                                    toast.error('Voice recognition not supported on this device.')
                                    return
                                  }
                                  if (listeningMedicineIndex === index) {
                                    stopMedicineVoice()
                                    setListeningMedicineIndex(null)
                                  } else {
                                    // set state and ref before start to avoid stale index
                                    setListeningMedicineIndex(index)
                                    listeningMedicineIndexRef.current = index
                                    startMedicineVoice()
                                  }
                                }}
                                className={`mic-btn right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full text-[#3A9EC2] hover:text-[#2A8EAC] hover:bg-[#3A9EC2]/10 ${listeningMedicineIndex === index ? 'bg-[#3A9EC2]/20 text-[#3A9EC2] pulsing' : 'bg-transparent'}`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0120 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 017 7.93z"/>
                                </svg>
                              </button>
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
                              {medicineErrors[index]?.name && (
                                <p className="text-xs text-red-600 mt-1 animate-fade-in">{medicineErrors[index].name}</p>
                              )}
                            </div>
                          </div>

                          {/* Duration Column */}
                          <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Duration</label>
                            <div className="relative">
                              <input
                                type="text"
                                aria-label="Medicine duration"
                                placeholder="e.g. 5 days"
                                value={medicine.duration}
                                onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                                className={`w-full px-3 pr-[48px] py-2.5 border ${medicineErrors[index]?.duration ? 'border-red-400 shake-once' : 'border-gray-200'} rounded-[10px] focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] outline-none transition-all bg-white text-sm`}
                              />
                              <button
                                type="button"
                                aria-label="Voice input duration"
                                title="Speak duration, e.g., 'five days'"
                                onClick={() => {
                                  if (!isVoiceSupportedDuration) {
                                    toast.error('Voice recognition not supported on this device.')
                                    return
                                  }
                                  if (listeningDurationIndex === index) {
                                    stopDurationVoice()
                                    setListeningDurationIndex(null)
                                  } else {
                                    setListeningDurationIndex(index)
                                    listeningDurationIndexRef.current = index
                                    startDurationVoice()
                                  }
                                }}
                                className={`mic-btn right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full text-[#14B8A6] hover:text-[#0D9488] hover:bg-[#14B8A6]/10 ${listeningDurationIndex === index ? 'bg-[#14B8A6]/20 text-[#14B8A6] pulsing mic-teal' : 'bg-transparent'}`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0120 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 017 7.93z"/>
                                </svg>
                              </button>
                            </div>
                            {medicineErrors[index]?.duration && (
                              <p className="text-xs text-red-600 mt-1 animate-fade-in font-medium">{medicineErrors[index].duration}</p>
                            )}
                          </div>

                          {/* Dosage Times Column */}
                          <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Dosage Times</label>
                            <div className="relative border border-gray-200 rounded-[10px] px-2.5 py-2 bg-white">
                              <button
                                type="button"
                                aria-label="Voice select dosage times"
                                onClick={() => {
                                  if (!isVoiceSupportedDosage) {
                                    toast.error('Voice recognition not supported on this device.')
                                    return
                                  }
                                  if (listeningDosageIndex === index) {
                                    stopDosageVoice()
                                    setListeningDosageIndex(null)
                                  } else {
                                    setListeningDosageIndex(index)
                                    listeningDosageIndexRef.current = index
                                    startDosageVoice()
                                  }
                                }}
                                className={`mic-btn top-1.5 right-2 z-10 w-7 h-7 rounded-full text-[#6C63FF] hover:text-[#5A52E6] hover:bg-[#6C63FF]/10 ${listeningDosageIndex === index ? 'bg-[#6C63FF]/20 text-[#6C63FF] pulsing mic-lavender' : 'bg-transparent'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0120 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 017 7.93z"/>
                                </svg>
                              </button>
                              <div className="grid grid-cols-3 gap-1.5 mb-2">
                                {[
                                  { key: 'morning', label: 'MORNING', icon: '🌅', color: 'from-[#3A9EC2] to-[#5BB3D4]', borderColor: '#3A9EC2' },
                                  { key: 'afternoon', label: 'AFTERNOON', icon: '☀️', color: 'from-[#6C63FF] to-[#8B7FFF]', borderColor: '#6C63FF' },
                                  { key: 'night', label: 'NIGHT', icon: '🌙', color: 'from-[#14B8A6] to-[#2DD4BF]', borderColor: '#14B8A6' }
                                ].map((time) => {
                                  const isChecked = ensureTimesShape(medicine)[time.key]
                                  return (
                                    <button
                                      key={time.key}
                                      type="button"
                                      onClick={() => handleDosageToggle(index, time.key)}
                                      className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-[8px] border-2 transition-all relative ${
                                        isChecked
                                          ? 'text-white shadow-sm'
                                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                      }`}
                                      style={isChecked ? {
                                        background: time.key === 'morning' 
                                          ? 'linear-gradient(to bottom right, #3A9EC2, #5BB3D4)'
                                          : time.key === 'afternoon'
                                          ? 'linear-gradient(to bottom right, #6C63FF, #8B7FFF)'
                                          : 'linear-gradient(to bottom right, #14B8A6, #2DD4BF)',
                                        borderColor: time.borderColor,
                                        boxShadow: isChecked ? `0 0 0 2px ${time.borderColor}20, 0 1px 4px ${time.borderColor}30` : 'none'
                                      } : {}}
                                    >
                                      <span className="text-sm leading-none">{time.icon}</span>
                                      <span className="font-semibold text-[9px] uppercase tracking-wide leading-tight">{time.label}</span>
                                    </button>
                                  )
                                })}
                              </div>

                              {medicineErrors[index]?.times && (
                                <p className="text-xs text-red-600 mt-1 animate-fade-in font-medium">{medicineErrors[index].times}</p>
                              )}
                              
                              {/* Additional Instructions Dropdown - Custom */}
                              <div className="relative mt-2" data-instructions-dropdown>
                                <button
                                  type="button"
                                  onClick={() => setOpenInstructionsDropdown(openInstructionsDropdown === index ? null : index)}
                                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-2.5 border border-gray-200 rounded-xl sm:rounded-[12px] focus:ring-2 focus:ring-[#3A9EC2]/20 focus:border-[#3A9EC2] outline-none text-xs sm:text-sm bg-white transition-all text-left flex items-center justify-between hover:border-gray-300 shadow-sm ${
                                    openInstructionsDropdown === index ? 'border-[#3A9EC2] ring-2 ring-[#3A9EC2]/20' : ''
                                  }`}
                                >
                                  <span className={`truncate flex-1 ${medicine.dosageInstructions ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                    {medicine.dosageInstructions || 'Additional Instructions...'}
                                  </span>
                                  <svg
                                    className={`w-4 h-4 text-gray-400 ml-2 flex-shrink-0 transition-transform duration-200 ${
                                      openInstructionsDropdown === index ? 'transform rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {openInstructionsDropdown === index && (
                                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl sm:rounded-[12px] shadow-lg max-h-60 overflow-y-auto animate-dropdown-fade-in">
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleMedicineChange(index, 'dosageInstructions', '')
                                          setOpenInstructionsDropdown(null)
                                        }}
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-2.5 text-left text-xs sm:text-sm transition-colors hover:bg-gray-50 ${
                                          !medicine.dosageInstructions ? 'bg-[#3A9EC2]/10 text-[#3A9EC2] font-medium' : 'text-gray-500'
                                        }`}
                                      >
                                        Additional Instructions...
                                      </button>
                                      {[
                                        'Take the tablet after meals | जेवणानंतर गोळी घ्या | भोजन के बाद टैबलेट लें',
                                        'Take the tablet before meals | जेवणापूर्वी गोळी घ्या | भोजन से पहले टैबलेट लें',
                                        'Take the tablet with water | पाण्यासोबत गोळी घ्या | पानी के साथ टैबलेट लें',
                                        'Take the tablet on an empty stomach | रिकाम्या पोटी गोळी घ्या | खाली पेट टैबलेट लें'
                                      ].map((option, optIndex) => (
                                        <button
                                          key={optIndex}
                                          type="button"
                                          onClick={() => {
                                            handleMedicineChange(index, 'dosageInstructions', option)
                                            setOpenInstructionsDropdown(null)
                                          }}
                                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-2.5 text-left text-xs sm:text-sm transition-colors hover:bg-gray-50 border-t border-gray-100 break-words ${
                                            medicine.dosageInstructions === option
                                              ? 'bg-[#3A9EC2]/10 text-[#3A9EC2] font-medium'
                                              : 'text-gray-700'
                                          }`}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Custom Instructions Input */}
                              <div className="relative mt-2">
                                <input
                                  type="text"
                                  placeholder="Custom instructions (optional)"
                                  value={medicine.dosageNotes || ''}
                                  onChange={(e) => handleMedicineChange(index, 'dosageNotes', e.target.value)}
                                  className="w-full px-2.5 pr-[44px] py-2 border border-gray-200 rounded-[8px] focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] outline-none text-xs bg-white transition-all"
                                />
                                <button
                                  type="button"
                                  aria-label="Voice input custom instructions"
                                  onClick={() => {
                                    if (!isVoiceSupportedNotes) {
                                      toast.error('Voice recognition not supported on this device.')
                                      return
                                    }
                                    if (listeningNotesIndex === index) {
                                      stopNotesVoice()
                                      setListeningNotesIndex(null)
                                    } else {
                                      setListeningNotesIndex(index)
                                      listeningNotesIndexRef.current = index
                                      startNotesVoice()
                                    }
                                  }}
                                  className={`mic-btn right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full text-[#14B8A6] hover:text-[#0D9488] hover:bg-[#14B8A6]/10 ${listeningNotesIndex === index ? 'bg-[#14B8A6]/20 text-[#14B8A6] pulsing mic-teal' : 'bg-transparent'}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0120 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 017 7.93z"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {medicine.dosage && (
                            <p className="text-xs text-gray-600 font-medium bg-gradient-to-r from-[#3A9EC2]/10 to-[#14B8A6]/10 px-2.5 py-1.5 rounded-[8px] border border-[#3A9EC2]/20">Generated: <span className="text-[#3A9EC2] font-semibold">{medicine.dosage}</span></p>
                          )}
                          {prescriptionData.medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicineField(index)}
                              className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] hover:bg-red-50 transition-colors ml-auto"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {inventorySelectionSummary}
              </div>

              {/* Test Suggestions / Additional Notes */}
              <div className="bg-white rounded-[22px] p-6 shadow-sm border border-gray-100">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Additional Notes / Test Required
                </label>
                
                {/* Professional Test Dropdown - Hospital Theme */}
                <div className="mb-4">
                  <div className="relative" ref={testDropdownRef}>
                    <div className="relative">
                      <input
                        ref={testInputRef}
                        type="text"
                        value={testSearchValue}
                        onChange={(e) => {
                          const value = e.target.value
                          setTestSearchValue(value)
                          setShowTestDropdown(true)
                        }}
                        onFocus={() => {
                          setShowTestDropdown(true)
                        }}
                        onBlur={(e) => {
                          // Delay to allow dropdown clicks
                          setTimeout(() => {
                            if (!testDropdownRef.current?.contains(document.activeElement)) {
                              setShowTestDropdown(false)
                            }
                          }, 200)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const selectedTest = testSearchValue.trim()
                            if (selectedTest && !prescriptionData.selectedTests.includes(selectedTest)) {
                              setPrescriptionData({
                                ...prescriptionData,
                                selectedTests: [...prescriptionData.selectedTests, selectedTest]
                              })
                              setTestSearchValue('')
                              setShowTestDropdown(false)
                            }
                          } else if (e.key === 'Escape') {
                            setShowTestDropdown(false)
                          }
                        }}
                        placeholder="Type to search or add custom test..."
                        className="w-full px-4 sm:px-5 py-3 sm:py-3.5 pr-12 border-2 border-gray-200 rounded-xl sm:rounded-[16px] focus:ring-2 focus:ring-[#3A9EC2]/30 focus:border-[#3A9EC2] outline-none bg-white transition-all duration-200 text-sm sm:text-base font-medium placeholder:text-gray-400 shadow-sm hover:shadow-md hover:border-gray-300"
                      />
                      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg 
                          className={`w-5 h-5 text-[#3A9EC2] transition-transform duration-200 ${showTestDropdown ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Professional Dropdown Menu */}
                    {showTestDropdown && (() => {
                      const specialization = user?.specialization || ''
                      const specializationTests = getTestsForSpecialization(specialization)
                      
                      // Common medical tests
                      const commonTests = [
                        'Blood Test',
                        'Sugar Test',
                        'Typhoid Test',
                        'CBC (Complete Blood Count)',
                        'Lipid Profile',
                        'Urine Test',
                        'X-Ray Chest',
                        'ECG',
                        'Ultrasound',
                        'CT Scan',
                        'MRI Scan',
                        'Blood Sugar (Fasting)',
                        'Blood Sugar (PP)',
                        'Liver Function Test',
                        'Kidney Function Test',
                        'HbA1c',
                        'Vitamin D',
                        'Thyroid Function Test',
                        'HIV Test',
                        'Hepatitis B Test'
                      ]
                      
                      const allTests = [...specializationTests, ...commonTests]
                      const uniqueTests = [...new Set(allTests)]
                      
                      const filteredTests = uniqueTests.filter(test => {
                        const isNotSelected = !prescriptionData.selectedTests.includes(test)
                        const matchesSearch = test.toLowerCase().includes(testSearchValue.toLowerCase())
                        return isNotSelected && matchesSearch
                      }).slice(0, 10)
                      
                      const hasCustomInput = testSearchValue.trim() && 
                        !filteredTests.some(test => test.toLowerCase() === testSearchValue.trim().toLowerCase()) &&
                        !prescriptionData.selectedTests.some(test => test.toLowerCase() === testSearchValue.trim().toLowerCase())

                      return (
                        <div className="absolute z-50 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl sm:rounded-[16px] shadow-xl max-h-[320px] sm:max-h-[360px] overflow-hidden animate-[slideDown_0.2s_ease-out]"
                          style={{
                            boxShadow: '0 8px 32px rgba(58, 158, 194, 0.15), 0 0 0 1px rgba(58, 158, 194, 0.1)'
                          }}
                        >
                          {/* Dropdown Header with Close Button */}
                          <div className="sticky top-0 bg-gradient-to-r from-white via-gray-50 to-white border-b-2 border-gray-200 px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between z-10 shadow-sm">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#3A9EC2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-xs sm:text-sm font-semibold text-gray-700">
                                Test Suggestions
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowTestDropdown(false)
                                if (testInputRef.current) {
                                  testInputRef.current.blur()
                                }
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 flex items-center justify-center transition-all duration-200 flex-shrink-0 hover:scale-110 active:scale-95"
                              aria-label="Close dropdown"
                              title="Close dropdown"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="overflow-y-auto max-h-[260px] sm:max-h-[300px] custom-scrollbar">
                            {/* Add Custom Test Option */}
                            {hasCustomInput && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const customTest = testSearchValue.trim()
                                  if (!prescriptionData.selectedTests.includes(customTest)) {
                                    setPrescriptionData({
                                      ...prescriptionData,
                                      selectedTests: [...prescriptionData.selectedTests, customTest]
                                    })
                                    setTestSearchValue('')
                                    setShowTestDropdown(false)
                                    if (testInputRef.current) {
                                      testInputRef.current.focus()
                                    }
                                  }
                                }}
                                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 text-left bg-gradient-to-r from-[#3A9EC2]/5 to-[#14B8A6]/5 border-b-2 border-gray-100 hover:from-[#3A9EC2]/10 hover:to-[#14B8A6]/10 transition-all duration-150 group min-h-[48px] sm:min-h-[52px] flex items-center"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#3A9EC2] to-[#14B8A6] flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm sm:text-base font-semibold text-[#3A9EC2] group-hover:text-[#2A8EAC] transition-colors">
                                      Add "{testSearchValue.trim()}"
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">Press Enter or click to add custom test</p>
                                  </div>
                                </div>
                              </button>
                            )}

                            {/* Test Suggestions */}
                            {filteredTests.length > 0 ? (
                              <>
                                {specializationTests.length > 0 && filteredTests.some(test => specializationTests.includes(test)) && (
                                  <div className="px-4 sm:px-5 py-2 bg-gray-50 border-b border-gray-100">
                                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                      {specializationTests.length > 0 ? `Recommended for ${specialization}` : 'Common Tests'}
                                    </p>
                                  </div>
                                )}
                                {filteredTests.map((test, index) => {
                                  const isSpecializationTest = specializationTests.includes(test)
                                  return (
                                    <button
                                      key={`${test}-${index}`}
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!prescriptionData.selectedTests.includes(test)) {
                                          setPrescriptionData({
                                            ...prescriptionData,
                                            selectedTests: [...prescriptionData.selectedTests, test]
                                          })
                                          setTestSearchValue('')
                                          setShowTestDropdown(false)
                                          setTimeout(() => {
                                            if (testInputRef.current) {
                                              testInputRef.current.focus()
                                            }
                                          }, 100)
                                        }
                                      }}
                                      className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 text-left transition-all duration-150 border-b border-gray-50 last:border-b-0 hover:bg-gradient-to-r hover:from-[#3A9EC2]/5 hover:to-[#14B8A6]/5 group min-h-[48px] sm:min-h-[52px] flex items-center ${
                                        isSpecializationTest ? 'bg-white' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                          isSpecializationTest 
                                            ? 'bg-gradient-to-br from-[#3A9EC2]/20 to-[#14B8A6]/20 group-hover:from-[#3A9EC2]/30 group-hover:to-[#14B8A6]/30' 
                                            : 'bg-gray-100 group-hover:bg-gray-200'
                                        }`}>
                                          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isSpecializationTest ? 'text-[#3A9EC2]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm sm:text-base font-semibold transition-colors ${
                                            isSpecializationTest 
                                              ? 'text-[#3A9EC2] group-hover:text-[#2A8EAC]' 
                                              : 'text-gray-800 group-hover:text-[#3A9EC2]'
                                          }`}>
                                            {test}
                                          </p>
                                          {isSpecializationTest && (
                                            <p className="text-xs text-gray-500 mt-0.5">Recommended test</p>
                                          )}
                                        </div>
                                        {isSpecializationTest && (
                                          <span className="px-2 py-1 rounded-md bg-gradient-to-r from-[#3A9EC2]/10 to-[#14B8A6]/10 text-[10px] font-bold text-[#3A9EC2] uppercase tracking-wide flex-shrink-0">
                                            Recommended
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </>
                            ) : (
                              <div className="px-4 sm:px-5 py-6 sm:py-8 text-center">
                                <svg className="w-12 h-12 sm:w-14 sm:h-14 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm sm:text-base text-gray-500 font-medium">
                                  {testSearchValue ? 'No matching tests found' : 'Start typing to search tests'}
                                </p>
                                {testSearchValue && (
                                  <p className="text-xs text-gray-400 mt-1">Press Enter to add as custom test</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* Helper Text */}
                  {user?.specialization && (
                    <p className="mt-2.5 text-xs sm:text-sm text-gray-500 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#3A9EC2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Test suggestions for <span className="font-semibold text-gray-700">{user.specialization}</span>. You can type to search or add custom tests.
                        </span>
                      </span>
                    </p>
                  )}
                </div>

                {/* Selected Tests Display with Remove Icons */}
                {prescriptionData.selectedTests.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {prescriptionData.selectedTests.map((test, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#3A9EC2]/10 to-[#14B8A6]/10 border border-[#3A9EC2]/20 rounded-[12px] text-sm text-[#3A9EC2] font-semibold"
                      >
                        <span>{test}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPrescriptionData({
                              ...prescriptionData,
                              selectedTests: prescriptionData.selectedTests.filter((_, i) => i !== index)
                            })
                          }}
                          className="ml-1 text-[#3A9EC2] hover:text-[#2A8EAC] hover:bg-[#3A9EC2]/20 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${test}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Additional Notes Textarea */}
                <textarea
                  value={prescriptionData.notes}
                  onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                  rows="3"
                  placeholder="Add any additional notes or observations..."
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-[16px] focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] outline-none resize-none transition-all bg-white text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Fixed Bottom Footer - Mobile Optimized */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]">
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleClosePrescriptionModal}
                  className="flex-1 py-3 sm:py-3.5 rounded-xl sm:rounded-[16px] font-semibold text-sm sm:text-base transition-all border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPrescription}
                  disabled={!isFormValid || !prescriptionData.diagnosis.trim() || savingPrescription}
                  className={`flex-1 py-3 sm:py-3.5 rounded-xl sm:rounded-[16px] font-semibold text-sm sm:text-base transition-all shadow-sm flex items-center justify-center gap-2 min-h-[44px] ${
                    isFormValid && prescriptionData.diagnosis.trim() && !savingPrescription
                      ? 'text-white hover:shadow-md active:scale-[0.98] prescription-save-success'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  style={isFormValid && prescriptionData.diagnosis.trim() && !savingPrescription ? {
                    background: 'linear-gradient(to right, #6C63FF, #3A9EC2, #14B8A6)'
                  } : {}}
                >
                  {savingPrescription ? (
                    <>
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span className="truncate">Save Prescription</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Injections & Surgical Items Side Drawer - Fixed Overlay */}
      {showInventoryPanel && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300"
                onClick={() => {
                  setShowInventoryPanel(false)
                  setInventorySearch('')
                }}
              />
              
              {/* Drawer */}
              <aside 
                className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-out drawer-slide-in ${
                  showInventoryPanel ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ 
                  boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
                  borderTopLeftRadius: '24px',
                  borderBottomLeftRadius: '24px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-white to-[#F4F4F7]">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800">Injections & Surgical Items</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Quickly reference inventory without leaving the chart.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInventoryPanel(false)
                        setInventorySearch('')
                      }}
                      className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200"
                      aria-label="Close drawer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Drawer Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-[16px] p-1.5">
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
                            className={`flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all ${
                              active
                                ? 'bg-gradient-to-r from-[#6C63FF] to-[#8B7FFF] text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                      </svg>
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder={`Search ${inventoryTab === 'injections' ? 'injections' : 'surgical items'}...`}
                        className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-[14px] focus:ring-2 focus:ring-[#6C63FF]/20 focus:border-[#6C63FF] bg-white transition-all outline-none"
                      />
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                      {filteredInventoryItems.length === 0 ? (
                        <div className="rounded-[16px] border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
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
                              className={`w-full text-left border rounded-[16px] px-4 py-3.5 text-sm transition-all shadow-sm ${
                                selected
                                  ? 'border-[#6C63FF] bg-gradient-to-br from-[#6C63FF]/10 to-white ring-2 ring-[#6C63FF]/20'
                                  : 'border-gray-200 bg-white hover:border-[#6C63FF]/30 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{item.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">{item.usage}</p>
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wide ${selected ? 'text-[#6C63FF]' : 'text-gray-400'}`}>
                                  {item.code}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-gray-600">Recommended dose: <span className="font-semibold">{item.dosage}</span></p>
                              {selected && (
                                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#6C63FF] px-2.5 py-1 text-[10px] font-semibold text-white">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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

                    {/* Selected Items Summary */}
                    {selectedInventoryItems.length > 0 && (
                      <div className="rounded-[16px] border border-[#6C63FF]/20 bg-white px-4 py-3 text-sm text-gray-600">
                        <p className="font-semibold text-gray-800 mb-2">Selected ({selectedInventoryItems.length}):</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                          {selectedInventoryItems.map((item) => (
                            <li key={item.code}>{item.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Add to Notes Button */}
                    <button
                      type="button"
                      onClick={appendInventorySelectionToNotes}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-[14px] transition-all ${
                        selectedInventoryItems.length === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#6C63FF] to-[#8B7FFF] text-white hover:from-[#5A52E6] hover:to-[#7A6FFF] shadow-sm hover:shadow-md'
                      }`}
                      disabled={selectedInventoryItems.length === 0}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add selected to notes
                    </button>
                  </div>
                </div>
              </aside>
            </>
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
          setMedicalHistoryIsRecheck(false)
          setMedicalHistoryCurrentPatient(null)
        }}
        patientId={medicalHistoryPatientId}
        patientName={medicalHistoryPatientName}
        patientMobile={medicalHistoryPatientMobile}
        isRecheck={medicalHistoryIsRecheck}
        currentPatient={medicalHistoryCurrentPatient}
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
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💊</span>
                <div>
                  <h3 className="text-2xl font-bold">{selectedMedicine.name}</h3>
                  {selectedMedicine.brandName && (
                    <p className="text-purple-100 text-sm">Brand: {selectedMedicine.brandName}</p>
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
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">🧪 Composition</p>
                  <p className="text-gray-900 font-medium">{selectedMedicine.genericName || 'N/A'}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">💰 Price</p>
                  <p className="text-gray-900 font-medium">₹{selectedMedicine.price || 0} per {selectedMedicine.unit || 'unit'}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">🕒 Dosage Frequency</p>
                  <p className="text-gray-900 font-medium">
                    {selectedMedicine.strength || 'N/A'} {selectedMedicine.form || ''}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">🏭 Manufacturer</p>
                  <p className="text-gray-900 font-medium">{selectedMedicine.manufacturer || 'N/A'}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">📦 Stock Availability</p>
                  <p className={`font-medium ${
                    (selectedMedicine.stockQuantity || 0) <= (selectedMedicine.minStockLevel || 10)
                      ? 'text-red-600'
                      : (selectedMedicine.stockQuantity || 0) > 0
                      ? 'text-purple-600'
                      : 'text-gray-600'
                  }`}>
                    {selectedMedicine.stockQuantity || 0} {selectedMedicine.unit || 'units'}
                    {(selectedMedicine.stockQuantity || 0) <= (selectedMedicine.minStockLevel || 10) && (
                      <span className="ml-2 text-xs">(Low Stock)</span>
                    )}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-1">📋 Category</p>
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
    </>
  )
}

export default DoctorDashboard

const CenteredPrescriptionToast = ({ message, onClose, prescriptionData }) => {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      if (onClose) onClose()
      setPdfPreviewUrl(null) // Clean up preview URL
    }, 320)
  }, [isClosing, onClose])

  const handlePrintPDF = useCallback(() => {
    if (!prescriptionData) return
    
    try {
      // Generate traditional prescription PDF using the saved prescription data
      const pdfBase64 = generateTraditionalPrescriptionPDF(
        prescriptionData.patient,
        prescriptionData.doctor,
        prescriptionData.prescription
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
        link.download = `Prescription_${prescriptionData.patient?.fullName || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`
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
  }, [prescriptionData])

  // Generate PDF preview for thumbnail
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  useEffect(() => {
    if (prescriptionData && !pdfPreviewUrl && !isGeneratingPreview) {
      setIsGeneratingPreview(true)
      try {
        const pdfBase64 = generateTraditionalPrescriptionPDF(
          prescriptionData.patient,
          prescriptionData.doctor,
          prescriptionData.prescription
        )
        setPdfPreviewUrl(pdfBase64)
      } catch (error) {
        console.error('Failed to generate PDF preview:', error)
      } finally {
        setIsGeneratingPreview(false)
      }
    }
  }, [prescriptionData, pdfPreviewUrl, isGeneratingPreview])

  useEffect(() => {
    // Auto-close after 3.5s unless user interacts or has prescription data with preview
    if (prescriptionData) {
      // Don't auto-close if user has interacted or preview is showing
      return
    }
    
    const timer = setTimeout(() => {
      handleClose()
    }, 3500)

    return () => clearTimeout(timer)
  }, [handleClose, prescriptionData])

  return (
    <>
      <div className={`toast-overlay ${isClosing ? 'toast-overlay-hide' : ''}`} />
      <div className="toast-wrapper">
        <div className={`centered-prescription-toast ${isClosing ? 'toast-exit' : 'toast-enter'}`}>
          <button
            type="button"
            aria-label="Close"
            className="toast-close-btn"
            onClick={handleClose}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="toast-body">
            <div className="toast-icon-shell">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="toast-text">
              <h4>Success</h4>
              <p>{message}</p>
            </div>
          </div>
          
          {/* Print PDF Button and Preview */}
          {prescriptionData && (
            <>
              <div className="toast-actions">
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="toast-print-btn"
                  aria-label="Print PDF"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print PDF</span>
                </button>
              </div>
              
              {/* PDF Preview Thumbnail - Signature & Stamp Preview */}
              {pdfPreviewUrl && (
                <div className="toast-preview-container">
                  <p className="toast-preview-label">📄 PDF Preview</p>
                  <div className="toast-preview-wrapper">
                    <iframe
                      src={pdfPreviewUrl}
                      className="toast-preview-iframe"
                      title="PDF Preview"
                    />
                    {/* Overlay showing signature and stamp area */}
                    <div className="toast-preview-overlay">
                      <div className="toast-preview-highlight">
                        <div className="toast-preview-sig-stamp">
                          <div className="toast-preview-signature">
                            <svg width="60" height="12" viewBox="0 0 60 12" fill="none">
                              <path
                                d="M 0 6 Q 10 2, 20 6 T 40 6 T 60 6"
                                stroke="currentColor"
                                strokeWidth="1"
                                fill="none"
                              />
                            </svg>
                            <span className="toast-preview-doc-name">
                              {prescriptionData?.doctor?.fullName || 'Dr. Name'}
                            </span>
                          </div>
                          <div className="toast-preview-stamp-box">
                            <div className="toast-preview-stamp-border">
                              <span className="toast-preview-stamp-text">
                                {prescriptionData?.doctor?.clinicName || 'Tekisky Hospital'}
                              </span>
                              <span className="toast-preview-stamp-reg">
                                {prescriptionData?.doctor?.registrationNo || 'REG-12345'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
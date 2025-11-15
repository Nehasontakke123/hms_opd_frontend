import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import PatientLimitModal from '../components/PatientLimitModal'
import MedicalHistoryModal from '../components/MedicalHistoryModal'
import CreatableSelect from 'react-select/creatable'
import generatePatientHistoryPDF from '../utils/generatePatientHistoryPDF'
import { Html5Qrcode } from 'html5-qrcode'

const getDefaultVisitDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultVisitTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const REQUIRED_FIELDS = [
  { name: 'fullName', label: 'Full Name' },
  { name: 'mobileNumber', label: 'Mobile Number' },
  { name: 'address', label: 'Address' },
  { name: 'age', label: 'Age' },
  { name: 'gender', label: 'Gender' },
  { name: 'doctor', label: 'Select Doctor' },
  { name: 'visitDate', label: 'Visit Date' },
  { name: 'visitTime', label: 'Visit Time' },
  { name: 'disease', label: 'Disease/Health Issue' }
]

const getInitialFormData = () => ({
  fullName: '',
  mobileNumber: '',
  address: '',
  age: '',
  gender: '',
  disease: '', // Empty by default - will populate based on doctor selection
  doctor: '',
  visitDate: getDefaultVisitDate(),
  visitTime: getDefaultVisitTime(),
  isRecheck: false,
  paymentMethod: 'online', // 'online' or 'cash'
  feeStatus: 'pending',
  behaviorRating: null,
  bloodPressure: '',
  sugarLevel: ''
})

// Mapping of doctor specializations to diseases/health issues
const SPECIALIZATION_DISEASES = {
  'Cardiologist': [
    'Chest Pain',
    'High Blood Pressure',
    'Irregular Heartbeat',
    'Heart Attack Follow-up',
    'Shortness of Breath'
  ],
  'Heart Specialist': [
    'Chest Pain',
    'High Blood Pressure',
    'Irregular Heartbeat',
    'Heart Attack Follow-up',
    'Shortness of Breath'
  ],
  'General Physician': [
    'Fever',
    'Cough & Cold',
    'Headache',
    'Body Pain',
    'Weakness / Fatigue',
    'Stomach Ache'
  ],
  'Gynecologist': [
    'Irregular Periods',
    'Pregnancy Checkup',
    'PCOD / PCOS',
    'Lower Abdominal Pain',
    'Menstrual Cramps'
  ],
  'Psychiatrist': [
    'Depression',
    'Anxiety',
    'Stress',
    'Insomnia',
    'Bipolar Disorder'
  ],
  'Orthopedic Surgeon': [
    'Joint Pain',
    'Back Pain',
    'Knee Pain',
    'Bone Fracture',
    'Arthritis'
  ],
  'Neurologist': [
    'Migraine',
    'Paralysis',
    'Seizures',
    'Memory Loss',
    'Nerve Pain'
  ]
}

// Helper function to get diseases based on doctor specialization
const getDiseasesForSpecialization = (specialization) => {
  if (!specialization) return []
  
  // Normalize specialization (case-insensitive, handle variations)
  const normalized = specialization.trim()
  
  // Check exact match first
  if (SPECIALIZATION_DISEASES[normalized]) {
    return SPECIALIZATION_DISEASES[normalized]
  }
  
  // Check case-insensitive match
  const lowerNormalized = normalized.toLowerCase()
  for (const key in SPECIALIZATION_DISEASES) {
    if (key.toLowerCase() === lowerNormalized) {
      return SPECIALIZATION_DISEASES[key]
    }
  }
  
  // If no match found, return empty array
  return []
}

// Helper function to format time from 24-hour to 12-hour format (e.g., "09:00" -> "9:00 AM", "13:00" -> "1:00 PM")
const formatTime12Hour = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const min = minutes || '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  // Always show minutes for consistency
  return `${hour12}:${min} ${period}`
}

const getDefaultAppointmentDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

const getDefaultAppointmentTime = () => '10:00'

// Utility function to get day name from date
const getDayName = (dateString) => {
  const date = new Date(dateString)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

// Check if a date is available for a doctor based on weekly schedule
const isDateAvailable = (dateString, doctor) => {
  if (!doctor || !dateString) return true // Default to available if no doctor selected
  
  const schedule = doctor.weeklySchedule || {}
  const dayName = getDayName(dateString)
  
  // If schedule exists, check if the day is enabled
  // Default to true if schedule doesn't exist (backward compatibility)
  return schedule[dayName] !== false
}

// Get available time slots for a doctor based on visiting hours
const getAvailableTimeSlots = (doctor, selectedDate) => {
  if (!doctor || !selectedDate) return []
  
  const visitingHours = doctor.visitingHours || {}
  const slots = []
  
  // Check if date is available
  if (!isDateAvailable(selectedDate, doctor)) {
    return []
  }
  
  // Generate time slots for each enabled visiting hour period
  const periods = ['morning', 'afternoon', 'evening']
  
  periods.forEach(period => {
    const periodHours = visitingHours[period]
    if (periodHours?.enabled && periodHours.start && periodHours.end) {
      const start = periodHours.start.split(':')
      const end = periodHours.end.split(':')
      const startHour = parseInt(start[0], 10)
      const startMin = parseInt(start[1] || '0', 10)
      const endHour = parseInt(end[0], 10)
      const endMin = parseInt(end[1] || '0', 10)
      
      // Generate 30-minute slots
      let currentHour = startHour
      let currentMin = startMin
      
      while (
        currentHour < endHour || 
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
        slots.push(timeString)
        
        // Increment by 30 minutes
        currentMin += 30
        if (currentMin >= 60) {
          currentMin = 0
          currentHour += 1
        }
      }
    }
  })
  
  return slots.sort()
}

// Check if a time is available for a doctor
const isTimeAvailable = (timeString, doctor, selectedDate) => {
  if (!doctor || !timeString || !selectedDate) return true
  
  // First check if date is available
  if (!isDateAvailable(selectedDate, doctor)) {
    return false
  }
  
  const availableSlots = getAvailableTimeSlots(doctor, selectedDate)
  
  // If no slots defined, allow any time (backward compatibility)
  if (availableSlots.length === 0) {
    return true
  }
  
  // Check if the time matches any available slot (within 30 min window)
  const [hours, minutes] = timeString.split(':').map(Number)
  const timeInMinutes = hours * 60 + minutes
  
  return availableSlots.some(slot => {
    const [slotHours, slotMinutes] = slot.split(':').map(Number)
    const slotInMinutes = slotHours * 60 + slotMinutes
    // Allow times within 30 minutes of a slot
    return Math.abs(timeInMinutes - slotInMinutes) <= 30
  })
}

// Get next available date and time slots for a doctor
const getNextAvailableDate = (doctor) => {
  if (!doctor) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Start from tomorrow
  let currentDate = new Date(today)
  currentDate.setDate(currentDate.getDate() + 1)
  
  let checkedDays = 0
  const maxDaysToCheck = 60 // Check up to 60 days ahead

  while (checkedDays < maxDaysToCheck) {
    const dateString = currentDate.toISOString().split('T')[0]
    
    if (isDateAvailable(dateString, doctor)) {
      // Get time slots for this date
      const timeSlots = getAvailableTimeSlots(doctor, dateString)
      
      // Get visiting hours to show time range
      const visitingHours = doctor.visitingHours || {}
      let timeRange = ''
      
      // Find first enabled period and its time range
      const periods = ['morning', 'afternoon', 'evening']
      for (const period of periods) {
        const periodHours = visitingHours[period]
        if (periodHours?.enabled && periodHours.start && periodHours.end) {
          timeRange = `${formatTime12Hour(periodHours.start)} – ${formatTime12Hour(periodHours.end)}`
          break
        }
      }
      
      // If multiple periods, combine them
      if (!timeRange) {
        const enabledPeriods = periods
          .filter(p => visitingHours[p]?.enabled && visitingHours[p]?.start && visitingHours[p]?.end)
          .map(p => `${formatTime12Hour(visitingHours[p].start)} – ${formatTime12Hour(visitingHours[p].end)}`)
        
        if (enabledPeriods.length > 0) {
          timeRange = enabledPeriods[0] // Use first period, or combine all if needed
        }
      }

      return {
        date: dateString,
        dateObj: new Date(currentDate),
        timeSlots,
        timeRange
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
    checkedDays++
  }

  return null // No availability found
}

const getInitialAppointmentForm = () => ({
  patientName: '',
  mobileNumber: '',
  email: '',
  appointmentDate: getDefaultAppointmentDate(),
  appointmentTime: getDefaultAppointmentTime(),
  doctor: '',
  reason: '',
  notes: ''
})

const ReceptionistDashboard = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('doctors') // 'doctors', 'registration', 'emergency', 'appointments', or 'prescriptions'
  const [appointmentsView, setAppointmentsView] = useState('today') // 'today' or 'upcoming'
  const [patientsRegisterView, setPatientsRegisterView] = useState('today') // 'today', 'recheck', or 'history'
  // Doctor Availability filters
  const [availabilityFilterSpecialty, setAvailabilityFilterSpecialty] = useState('all')
  const [availabilityFilterDoctor, setAvailabilityFilterDoctor] = useState('all')
  const [availabilityFilterDate, setAvailabilityFilterDate] = useState('')
  const [availabilityPage, setAvailabilityPage] = useState(1)
  const availabilityPerPage = 8 // 8 doctors per page
  const [selectedDoctorForAppointment, setSelectedDoctorForAppointment] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false)
  const [patientToCancel, setPatientToCancel] = useState(null)
  const [cancelledPatientName, setCancelledPatientName] = useState(null)
  const [doctors, setDoctors] = useState([]) // Paginated doctors for Doctors Overview
  const [allDoctors, setAllDoctors] = useState([]) // All doctors for dropdown
  const [doctorStats, setDoctorStats] = useState({})
  const [todayPatients, setTodayPatients] = useState([])
  const [patientHistory, setPatientHistory] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [todayPatientsPage, setTodayPatientsPage] = useState(1)
  const [patientHistoryPage, setPatientHistoryPage] = useState(1)
  const [patientsRegisterSearch, setPatientsRegisterSearch] = useState('')
  const [patientsRegisterSearchDebounced, setPatientsRegisterSearchDebounced] = useState('')
  const [appointmentsSearch, setAppointmentsSearch] = useState('')
  const [appointmentsSearchDebounced, setAppointmentsSearchDebounced] = useState('')
  const [doctorsSearch, setDoctorsSearch] = useState('')
  
  // Pagination for doctors (server-side)
  const [doctorsPage, setDoctorsPage] = useState(1)
  const [doctorsLimit] = useState(8) // 8 doctors per page as requested
  const [doctorsPagination, setDoctorsPagination] = useState({
    total: 0,
    pages: 1,
    page: 1,
    limit: 8
  })
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  
  // Constants
  const todayPatientsPerPage = 10
  const patientHistoryPerPage = 10
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeData, setQrCodeData] = useState(null)
  const [qrPaymentStatus, setQrPaymentStatus] = useState('pending')
  const qrPollIntervalRef = useRef(null)
  const inputRefs = useRef({})
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [editingAppointmentForm, setEditingAppointmentForm] = useState({
    patientName: '',
    mobileNumber: '',
    email: '',
    appointmentDate: '',
    appointmentTime: '',
    doctor: '',
    reason: '',
    notes: '',
    status: 'scheduled'
  })
  const [selectedDoctorForLimit, setSelectedDoctorForLimit] = useState(null)
  const [generatedToken, setGeneratedToken] = useState(null)
  const [formData, setFormData] = useState(getInitialFormData)
  const [emergencyFormData, setEmergencyFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    doctor: '',
    fees: ''
  })
  const [emergencyFormErrors, setEmergencyFormErrors] = useState({})
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState(null)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const profileFileInputRef = useRef(null)
  const [showEditFeeModal, setShowEditFeeModal] = useState(false)
  const [selectedDoctorForFeeEdit, setSelectedDoctorForFeeEdit] = useState(null)
  const [editFeeValue, setEditFeeValue] = useState(0)
  const [formErrors, setFormErrors] = useState({})
  const [appointmentForm, setAppointmentForm] = useState(getInitialAppointmentForm)
  const [showAppointmentSuccess, setShowAppointmentSuccess] = useState(false)
  const [appointmentSuccessData, setAppointmentSuccessData] = useState(null)
  const [cancelledAppointmentInfo, setCancelledAppointmentInfo] = useState(null)
  const [showCancelSuccess, setShowCancelSuccess] = useState(false)
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false)
  const [medicalHistoryPatientId, setMedicalHistoryPatientId] = useState(null)
  const [medicalHistoryPatientName, setMedicalHistoryPatientName] = useState(null)
  const [medicalHistoryPatientMobile, setMedicalHistoryPatientMobile] = useState(null)
  const [downloadingReport, setDownloadingReport] = useState(null) // Track which patient's report is being downloaded
  
  // Scanner states
  const [showScanner, setShowScanner] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [scannerError, setScannerError] = useState(null)
  const html5QrCodeRef = useRef(null)
  const scannerContainerRef = useRef(null)
  
  // PDF upload states
  const [uploadedPDF, setUploadedPDF] = useState(null)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const pdfFileInputRef = useRef(null)
  
  // Prescription Records states
  const [prescriptions, setPrescriptions] = useState([])
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false)
  const [prescriptionsSearch, setPrescriptionsSearch] = useState('')
  const [prescriptionsPage, setPrescriptionsPage] = useState(1)
  const [prescriptionsPagination, setPrescriptionsPagination] = useState({
    total: 0,
    pages: 1,
    page: 1,
    limit: 10
  })
  const prescriptionPollIntervalRef = useRef(null)
  const prescriptionsPerPage = 10

  const selectedDoctor = useMemo(
    () => allDoctors.find((doc) => doc._id === formData.doctor),
    [allDoctors, formData.doctor]
  )
  const consultationFee = selectedDoctor?.fees || 0

  // Fetch all prescriptions with pagination - MUST be defined before useEffect hooks
  const fetchPrescriptions = useCallback(async (page, search, isBackgroundPoll = false) => {
    if (!isBackgroundPoll) {
      setLoadingPrescriptions(true)
    }
    
    try {
      const response = await api.get('/patient', {
        params: {
          withPrescriptions: 'true',
          page: page || prescriptionsPage,
          limit: prescriptionsPerPage,
          ...(search?.trim() && { search: search.trim() })
        }
      })
      
      if (response.data.success) {
        const patientsWithPrescriptions = response.data.data || []
        setPrescriptions(patientsWithPrescriptions)
        
        // Update pagination info
        if (response.data.pagination) {
          setPrescriptionsPagination(response.data.pagination)
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch prescriptions')
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error)
      // Only show error toast if not a background poll
      if (!isBackgroundPoll) {
        toast.error(error.response?.data?.message || 'Failed to fetch prescriptions')
      }
      setPrescriptions([])
    } finally {
      if (!isBackgroundPoll) {
        setLoadingPrescriptions(false)
      }
    }
  }, [prescriptionsPage, prescriptionsPerPage])
  
  // Get selected doctor for appointment form
  const selectedAppointmentDoctor = useMemo(
    () => allDoctors.find((doc) => doc._id === appointmentForm.doctor),
    [allDoctors, appointmentForm.doctor]
  )
  
  // Get available weekdays for the selected doctor
  const availableWeekdays = useMemo(() => {
    if (!selectedAppointmentDoctor) return []
    
    const schedule = selectedAppointmentDoctor.weeklySchedule || {}
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    return dayNames
      .map((day, index) => ({
        day,
        label: dayLabels[index],
        available: schedule[day] !== false
      }))
      .filter(d => d.available)
      .map(d => d.label)
  }, [selectedAppointmentDoctor])
  
  // Get available dates for the next 30 days based on doctor's weekly schedule
  const availableDates = useMemo(() => {
    if (!selectedAppointmentDoctor) {
      // If no doctor selected, return all dates
      const dates = []
      const today = new Date()
      for (let i = 1; i <= 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        dates.push(date.toISOString().split('T')[0])
      }
      return dates
    }
    
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateString = date.toISOString().split('T')[0]
      if (isDateAvailable(dateString, selectedAppointmentDoctor)) {
        dates.push(dateString)
      }
    }
    return dates
  }, [selectedAppointmentDoctor])
  
  // Get available time slots for selected doctor and date
  const availableTimeSlots = useMemo(() => {
    if (!selectedAppointmentDoctor) {
      return []
    }
    
    // If no date selected yet, return empty (will be populated when date is selected)
    if (!appointmentForm.appointmentDate) {
      return []
    }
    
    return getAvailableTimeSlots(selectedAppointmentDoctor, appointmentForm.appointmentDate)
  }, [selectedAppointmentDoctor, appointmentForm.appointmentDate])

  // Get next available dates when selected date is unavailable
  const nextAvailableDates = useMemo(() => {
    if (!selectedAppointmentDoctor || !appointmentForm.appointmentDate) {
      return []
    }

    // If the selected date is available, return empty
    if (isDateAvailable(appointmentForm.appointmentDate, selectedAppointmentDoctor)) {
      return []
    }

    // Get the next 3 available dates starting from tomorrow
    const dates = []
    const today = new Date()
    const selectedDate = new Date(appointmentForm.appointmentDate)
    
    // Start from tomorrow if selected date is today, otherwise start from day after selected date
    let startDate = new Date(selectedDate)
    startDate.setDate(startDate.getDate() + 1)
    
    // If start date is today, move to tomorrow
    if (startDate <= today) {
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() + 1)
    }

    // Find next 3 available dates (max 60 days ahead)
    let currentDate = new Date(startDate)
    let checkedDays = 0
    const maxDaysToCheck = 60

    while (dates.length < 3 && checkedDays < maxDaysToCheck) {
      const dateString = currentDate.toISOString().split('T')[0]
      if (isDateAvailable(dateString, selectedAppointmentDoctor)) {
        dates.push(dateString)
      }
      currentDate.setDate(currentDate.getDate() + 1)
      checkedDays++
    }

    return dates
  }, [selectedAppointmentDoctor, appointmentForm.appointmentDate])
  const selectedDoctorStats = useMemo(() => {
    if (!selectedDoctor) return null
    return doctorStats[selectedDoctor._id] || null
  }, [doctorStats, selectedDoctor])
  const isOnlinePayment = !formData.isRecheck && formData.paymentMethod === 'online'
  const availableDiseases = useMemo(() => {
    if (!selectedDoctor) return []
    const specialization = selectedDoctor?.specialization || ''
    return getDiseasesForSpecialization(specialization)
  }, [selectedDoctor])
  const diseaseOptions = useMemo(
    () => availableDiseases.map((disease) => ({ value: disease, label: disease })),
    [availableDiseases]
  )
  const selectedDiseaseOption = useMemo(
    () => (formData.disease ? { value: formData.disease, label: formData.disease } : null),
    [formData.disease]
  )
  const diseasePlaceholder = useMemo(() => {
    if (selectedDoctor?.specialization) {
      return `Search or type a health issue for ${selectedDoctor.specialization}`
    }
    return 'Search or type any health concern'
  }, [selectedDoctor])
  const diseaseHelperText = useMemo(() => {
    if (selectedDoctor?.specialization) {
      return `Suggestions are tailored for ${selectedDoctor.specialization}, but you can type any health concern.`
    }
    return 'Suggestions appear after selecting a doctor, but you can type any health concern.'
  }, [selectedDoctor])
  const diseaseSelectStyles = useMemo(
    () => ({
      control: (provided, state) => ({
        ...provided,
        borderRadius: 8,
        borderColor: formErrors.disease ? '#ef4444' : state.isFocused ? '#00B894' : '#d1d5db',
        boxShadow: state.isFocused
          ? formErrors.disease
            ? '0 0 0 4px rgba(239,68,68,0.12)'
            : '0 0 0 4px rgba(0,184,148,0.12)'
          : 'none',
        '&:hover': {
          borderColor: formErrors.disease ? '#ef4444' : '#00A36C'
        },
        minHeight: 48,
        paddingLeft: 2,
        paddingRight: 2,
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500,
        color: '#1f2937',
        transition: 'all 0.2s ease',
        backgroundColor: 'white'
      }),
      valueContainer: (provided) => ({
        ...provided,
        padding: '4px 8px'
      }),
      input: (provided) => ({
        ...provided,
        margin: 0,
        padding: 0,
        color: '#1f2937'
      }),
      placeholder: (provided) => ({
        ...provided,
        color: '#94a3b8',
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500
      }),
      singleValue: (provided) => ({
        ...provided,
        color: '#1f2937',
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500
      }),
      option: (provided, state) => ({
        ...provided,
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500,
        color: state.isFocused ? '#03543f' : '#1f2937',
        backgroundColor: state.isFocused ? 'rgba(0,184,148,0.12)' : 'white',
        transition: 'all 0.2s ease'
      }),
      menu: (provided) => ({
        ...provided,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 18px 35px -20px rgba(15,118,110,0.35)'
      }),
      noOptionsMessage: (provided) => ({
        ...provided,
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500
      })
    }),
    [formErrors.disease]
  )
  const demoQrUrl = useMemo(() => {
    const amount = consultationFee || 0
    const qrData = encodeURIComponent(`Hospital Demo Payment ₹${amount}`)
    return `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=200x200`
  }, [consultationFee])

  useEffect(() => {
    fetchDoctors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorsPage, doctorsSearch])

  // Fetch all doctors for dropdown on mount and when registration tab is active
  useEffect(() => {
    fetchAllDoctors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Auto-update appointment date dynamically when doctor is selected or availability changes
  useEffect(() => {
    if (appointmentForm.doctor && selectedAppointmentDoctor && appointmentForm.appointmentDate) {
      const currentDate = appointmentForm.appointmentDate
      
      // Check if current date is available for the selected doctor
      if (!isDateAvailable(currentDate, selectedAppointmentDoctor)) {
        // Current date is not available - find next available date
        const nextAvailable = getNextAvailableDate(selectedAppointmentDoctor)
        
        if (nextAvailable && nextAvailable.date !== currentDate) {
          let appointmentTime = appointmentForm.appointmentTime
          
          // Set time to first available slot for the new date
          if (nextAvailable.timeSlots && nextAvailable.timeSlots.length > 0) {
            appointmentTime = nextAvailable.timeSlots[0]
          } else {
            // Fallback to first enabled period's start time
            const visitingHours = selectedAppointmentDoctor.visitingHours || {}
            const periods = ['morning', 'afternoon', 'evening']
            for (const period of periods) {
              const periodHours = visitingHours[period]
              if (periodHours?.enabled && periodHours.start) {
                appointmentTime = periodHours.start
                break
              }
            }
          }
          
          setAppointmentForm(prev => ({
            ...prev,
            appointmentDate: nextAvailable.date,
            appointmentTime: appointmentTime || prev.appointmentTime
          }))
          
          const dayName = nextAvailable.dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          const formattedDate = nextAvailable.dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          toast.info(`Date auto-updated to next available: ${dayName}, ${formattedDate}`, {
            duration: 2500
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentForm.doctor, appointmentForm.appointmentDate, selectedAppointmentDoctor, doctorStats])

  useEffect(() => {
    if (activeTab === 'registration' && doctors.length > 0) {
      fetchTodayPatients()
      fetchPatientHistory()
    } else if (activeTab === 'appointments') {
      fetchAppointments()
    } else if (activeTab === 'prescriptions') {
      // Initial fetch - will be handled by the page change effect
      // Set up polling for real-time updates (every 30 seconds - less frequent)
      // Only poll if not currently loading to avoid overlapping requests
      prescriptionPollIntervalRef.current = setInterval(() => {
        if (!loadingPrescriptions) {
          fetchPrescriptions(prescriptionsPage, prescriptionsSearch, true) // true = background poll
        }
      }, 30000) // 30 seconds instead of 10
    }
    
    // Cleanup: Clear polling interval when switching tabs or unmounting
    return () => {
      if (prescriptionPollIntervalRef.current) {
        clearInterval(prescriptionPollIntervalRef.current)
        prescriptionPollIntervalRef.current = null
      }
    }
  }, [activeTab, doctors])
  
  // Debounce search for prescriptions and reset to page 1
  useEffect(() => {
    if (activeTab === 'prescriptions') {
      const searchTimer = setTimeout(() => {
        setPrescriptionsPage(1) // Reset to page 1 on search change
      }, 500) // 500ms debounce

      return () => clearTimeout(searchTimer)
    }
  }, [prescriptionsSearch, activeTab])

  // Separate effect for page changes and initial load to avoid infinite loops
  useEffect(() => {
    if (activeTab === 'prescriptions' && prescriptionsPage > 0) {
      fetchPrescriptions(prescriptionsPage, prescriptionsSearch, false)
    }
  }, [prescriptionsPage, activeTab, fetchPrescriptions, prescriptionsSearch])

  // Reset to page 1 when search changes
  useEffect(() => {
    setDoctorsPage(1)
  }, [doctorsSearch])

  // Reset to page 1 when availability filters change
  useEffect(() => {
    setAvailabilityPage(1)
  }, [availabilityFilterSpecialty, availabilityFilterDoctor, availabilityFilterDate])

  // Fetch all doctors for dropdown (no pagination)
  const fetchAllDoctors = async () => {
    try {
      const response = await api.get('/doctor', { 
        params: { 
          page: 1, 
          limit: 1000 // Large limit to get all doctors
        } 
      })
      
      if (response.data.success) {
        const allDoctorsData = response.data.data || []
        setAllDoctors(allDoctorsData)
        
        // Fetch stats for all doctors
        const statsPromises = allDoctorsData.map(doctor =>
          api.get(`/doctor/${doctor._id}/stats`)
            .then(res => ({ [doctor._id]: res.data.data }))
            .catch(() => ({ [doctor._id]: null }))
        )
        
        const statsArray = await Promise.all(statsPromises)
        const stats = Object.assign({}, ...statsArray)
        // Merge with existing stats
        setDoctorStats(prevStats => ({ ...prevStats, ...stats }))
      }
    } catch (error) {
      console.error('Error fetching all doctors:', error)
      // Don't show error toast for this, as it's a background fetch
    }
  }

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true)
      const params = {
        page: doctorsPage,
        limit: doctorsLimit,
        ...(doctorsSearch.trim() && { search: doctorsSearch.trim() })
      }
      
      const response = await api.get('/doctor', { params })
      
      if (response.data.success) {
        setDoctors(response.data.data || [])
        
        // Update pagination metadata
        if (response.data.total !== undefined) {
          setDoctorsPagination({
            total: response.data.total || 0,
            pages: response.data.pages || 1,
            page: response.data.page || 1,
            limit: response.data.limit || doctorsLimit
          })
        }
        
        // Fetch stats for each doctor
        const statsPromises = (response.data.data || []).map(doctor =>
          api.get(`/doctor/${doctor._id}/stats`)
            .then(res => ({ [doctor._id]: res.data.data }))
            .catch(() => ({ [doctor._id]: null }))
        )
        
        const statsArray = await Promise.all(statsPromises)
        const stats = Object.assign({}, ...statsArray)
        setDoctorStats(prevStats => ({ ...prevStats, ...stats }))
        
        if (response.data.data.length === 0 && doctorsPage === 1) {
          // Only show error on first page
          if (doctorsSearch.trim()) {
            // Don't show error for empty search results
          } else {
            toast.error('No doctors available. Please contact admin.')
          }
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch doctors')
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
      toast.error(error.response?.data?.message || 'Failed to fetch doctors')
      setDoctors([])
      setDoctorsPagination({ total: 0, pages: 1, page: 1, limit: doctorsLimit })
    } finally {
      setLoadingDoctors(false)
    }
  }

  const handleSetLimitClick = (doctor) => {
    setSelectedDoctorForLimit(doctor)
    setShowLimitModal(true)
  }

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB')
        return
      }
      
      // Validate MIME type - accept common image formats
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ]
      
      // Normalize MIME type (handle variations like image/jpeg vs image/jpg)
      const normalizedMimeType = file.type.toLowerCase().trim()
      
      // Check if MIME type is valid
      const isValidMimeType = file.type.startsWith('image/') && 
        (allowedMimeTypes.includes(normalizedMimeType) ||
         normalizedMimeType === 'image/jpeg' ||
         normalizedMimeType.includes('jpeg') ||
         normalizedMimeType.includes('jpg'))
      
      // Additional validation: Check file extension as fallback (for cases where MIME type might be missing)
      const fileName = file.name.toLowerCase()
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
      
      // File must have valid MIME type OR valid extension
      if (!isValidMimeType && !hasValidExtension) {
        toast.error('Only image files are allowed (JPG, JPEG, PNG, WEBP)')
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
        toast.error('Failed to read image file. Please try another image.')
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
    if (!profileImageFile || !selectedDoctorForProfile) {
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
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api'}/doctor/${selectedDoctorForProfile._id}/profile-image`
      
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

      toast.success('Profile photo updated successfully!')
      setShowProfileModal(false)
      setProfileImageFile(null)
      setProfileImagePreview(null)
      setSelectedDoctorForProfile(null)
      
      // Refresh doctors list to show updated profile image
      await fetchDoctors()
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
    if (!selectedDoctorForProfile?._id) {
      toast.error('Doctor information not available')
      return
    }

    if (!window.confirm(`Are you sure you want to remove the profile photo for ${selectedDoctorForProfile.fullName}? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api'}/doctor/${selectedDoctorForProfile._id}/profile-image`
      
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

      toast.success('Profile photo removed successfully!')
      setShowProfileModal(false)
      setProfileImageFile(null)
      setProfileImagePreview(null)
      setSelectedDoctorForProfile(null)
      
      // Refresh doctors list to show updated profile image
      await fetchDoctors()
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

  const handleUpdateDoctorFee = async () => {
    if (!selectedDoctorForFeeEdit?._id) {
      toast.error('Doctor information not available')
      return
    }

    if (!editFeeValue || editFeeValue < 0) {
      toast.error('Please enter a valid fee amount')
      return
    }

    try {
      const response = await api.put(`/doctor/${selectedDoctorForFeeEdit._id}/fees`, {
        fees: Number(editFeeValue)
      })

      if (response.data.success) {
        toast.success(`Doctor fees updated to ₹${editFeeValue}`)
        setShowEditFeeModal(false)
        setSelectedDoctorForFeeEdit(null)
        setEditFeeValue(0)
        await fetchDoctors() // Refresh doctors list
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update doctor fees')
    }
  }

  const handleDownloadPatientReport = async (patient) => {
    if (!patient) {
      toast.error('Patient information not available')
      return
    }

    setDownloadingReport(patient._id)
    
    try {
      // Fetch complete medical history for the patient
      const params = {}
      if (patient._id) {
        params.patientId = patient._id
      } else if (patient.mobileNumber) {
        params.mobileNumber = patient.mobileNumber
      } else if (patient.fullName) {
        params.fullName = patient.fullName
      }

      const response = await api.get('/prescription/medical-history', { params })
      const historyData = response.data.data

      if (!historyData || !historyData.medicalHistory || historyData.medicalHistory.length === 0) {
        toast.error('No medical history found for this patient')
        setDownloadingReport(null)
        return
      }

      // Generate PDF
      const pdfBase64 = generatePatientHistoryPDF(historyData.patientInfo, historyData.medicalHistory)
      
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
      const patientName = (patient.fullName || 'Patient').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const fileName = `Patient_History_${patientName}_${new Date().toISOString().split('T')[0]}.pdf`
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
      
      toast.success('Patient history report downloaded successfully!')
    } catch (error) {
      console.error('Error downloading patient report:', error)
      if (error.response?.status === 404) {
        toast.error('No medical history found for this patient')
      } else {
        toast.error('Failed to download patient report')
      }
    } finally {
      setDownloadingReport(null)
    }
  }

  const handleToggleAvailability = async (doctor) => {
    try {
      const stats = doctorStats[doctor._id] || {}
      const currentStatus = stats.isAvailable !== undefined ? stats.isAvailable : doctor.isAvailable !== undefined ? doctor.isAvailable : true
      
      const response = await api.put(`/doctor/${doctor._id}/availability`, {
        isAvailable: !currentStatus
      })
      
      toast.success(response.data.message)
      await fetchDoctors() // Refresh doctor stats
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update availability')
    }
  }

  const handleDoctorCardClick = (doctor) => {
    // Check doctor availability before opening registration form
    const stats = doctorStats[doctor._id] || {}
    const isAvailable = stats.isAvailable !== undefined 
      ? stats.isAvailable 
      : doctor.isAvailable !== undefined 
        ? doctor.isAvailable 
        : true
    
    // If doctor is unavailable, show message and don't open form
    if (!isAvailable) {
      toast.error('Doctor is currently unavailable. Please select another doctor or check available timings.', {
        duration: 5000,
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500'
        }
      })
      return
    }
    
    // Navigate to registration tab and pre-fill the selected doctor
    setActiveTab('registration')
    setFormData((prev) => ({
      ...prev,
      doctor: doctor._id,
      disease: '' // Clear disease when doctor changes
    }))
    clearFieldError('doctor')
    clearFieldError('disease')
  }

  const [focusedField, setFocusedField] = useState(null)

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  // Scanner functions
  const startScanner = async () => {
    try {
      setScannerError(null)
      const scannerId = 'scanner-container'
      
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      }
      
      html5QrCodeRef.current = new Html5Qrcode(scannerId)
      
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
          handleScannedData(decodedText)
        },
        (errorMessage) => {
          // Ignore scanning errors - they're expected during scanning
        }
      )
      
      setShowScanner(true)
    } catch (err) {
      console.error('Scanner error:', err)
      setScannerError('Failed to start scanner. Please check camera permissions.')
      toast.error('Failed to start scanner. Please allow camera access.')
    }
  }

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
      }
      setShowScanner(false)
      setScannerError(null)
    } catch (err) {
      console.error('Error stopping scanner:', err)
    }
  }

  const handleScannedData = (data) => {
    try {
      // Try to parse JSON data
      let parsedData = {}
      try {
        parsedData = JSON.parse(data)
      } catch {
        // If not JSON, try to extract data from text format
        // Common formats: "Name: John, Age: 30, Mobile: 1234567890"
        const lines = data.split('\n')
        lines.forEach(line => {
          const [key, ...valueParts] = line.split(':')
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim()
            const normalizedKey = key.trim().toLowerCase()
            if (normalizedKey.includes('name')) parsedData.fullName = value
            if (normalizedKey.includes('age')) parsedData.age = value
            if (normalizedKey.includes('mobile') || normalizedKey.includes('phone')) parsedData.mobileNumber = value
            if (normalizedKey.includes('address')) parsedData.address = value
            if (normalizedKey.includes('gender')) parsedData.gender = value
          }
        })
      }
      
      setScannedData(parsedData)
      
      // Auto-fill form with scanned data
      if (Object.keys(parsedData).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...parsedData,
          // Only update if field is empty to preserve manual entries
          fullName: prev.fullName || parsedData.fullName || '',
          mobileNumber: prev.mobileNumber || parsedData.mobileNumber || '',
          address: prev.address || parsedData.address || '',
          age: prev.age || parsedData.age || '',
          gender: prev.gender || parsedData.gender || ''
        }))
        
        toast.success('Patient details scanned and filled!', { icon: '✅' })
        stopScanner()
      } else {
        toast.error('Could not parse scanned data. Please scan again.')
      }
    } catch (err) {
      console.error('Error processing scanned data:', err)
      toast.error('Error processing scanned data')
    }
  }

  // PDF upload handler
  const handlePDFUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file only')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF file size must be less than 10MB')
      return
    }

    setUploadingPDF(true)
    try {
      // Convert to base64 for storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setUploadedPDF({
          name: file.name,
          size: file.size,
          data: base64String,
          uploadedAt: new Date().toISOString()
        })
        toast.success('PDF uploaded successfully!')
      }
      reader.onerror = () => {
        toast.error('Failed to read PDF file')
        setUploadingPDF(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('PDF upload error:', err)
      toast.error('Failed to upload PDF')
    } finally {
      setUploadingPDF(false)
    }
  }

  const removeUploadedPDF = () => {
    setUploadedPDF(null)
    if (pdfFileInputRef.current) {
      pdfFileInputRef.current.value = ''
    }
  }


  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
        html5QrCodeRef.current.clear()
      }
    }
  }, [])

  const focusOnField = (field) => {
    const node = inputRefs.current[field]
    if (!node) return
    if (typeof node.focus === 'function') {
      node.focus()
    }
    const scrollTarget =
      (node && node.controlRef) ||
      (node && node.inputRef && node.inputRef.current) ||
      node
    if (scrollTarget && typeof scrollTarget.scrollIntoView === 'function') {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const getFieldClasses = (field) => {
    const baseClasses =
      'w-full px-4 py-3 text-sm font-medium font-["Inter",sans-serif] rounded-lg border bg-white text-slate-700 transition-all duration-200 outline-none'
    const normalClasses =
      'border-slate-200 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:ring-offset-0 focus:shadow-[0_0_0_4px_rgba(0,184,148,0.12)]'
    const errorClasses =
      'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:ring-offset-0 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.12)]'
    const disabledClasses = 'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
    return `${baseClasses} ${formErrors[field] ? errorClasses : normalClasses} ${disabledClasses}`
  }

  const getLabelClasses = (field) => {
    if (formErrors[field]) {
      return 'text-sm font-semibold text-red-600 transition-colors duration-200'
    }
    return `text-sm font-semibold transition-colors duration-200 ${
      focusedField === field ? 'text-emerald-600' : 'text-slate-700'
    }`
  }

  const handleFieldFocus = (field) => setFocusedField(field)
  const handleFieldBlur = () => setFocusedField(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    clearFieldError(name)
    
    // If doctor is changed, clear disease and reset to new doctor's diseases
    if (name === 'mobileNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
      setFormData((prev) => ({
        ...prev,
        mobileNumber: digitsOnly
      }))
      return
    }

    if (name === 'doctor') {
      // Check if selected doctor is available
      if (value) {
        const selectedDoctor = allDoctors.find(doc => doc._id === value)
        if (selectedDoctor) {
          const stats = doctorStats[selectedDoctor._id] || {}
          const isAvailable = stats.isAvailable !== undefined 
            ? stats.isAvailable 
            : selectedDoctor.isAvailable !== undefined 
              ? selectedDoctor.isAvailable 
              : true
          
          if (!isAvailable) {
            toast.error('Doctor is currently unavailable. Please select another doctor or check available timings.', {
              duration: 5000,
              style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500'
              }
            })
            // Clear the selection
            setFormData((prev) => ({
              ...prev,
              doctor: '',
              disease: ''
            }))
            clearFieldError('disease')
            return
          }
        }
      }
      
      setFormData((prev) => ({
        ...prev,
        doctor: value,
        disease: '' // Clear disease when doctor changes
      }))
      clearFieldError('disease')
    } else if (name === 'isRecheck') {
      // When Recheck-Up is checked, automatically set fee status to indicate no fee required
      setFormData((prev) => ({
        ...prev,
        isRecheck: checked,
        feeStatus: checked ? 'not_required' : prev.feeStatus === 'not_required' ? 'pending' : prev.feeStatus
      }))
    } else if (name === 'paymentMethod') {
      // When payment method changes, update feeStatus accordingly
      setFormData((prev) => ({
        ...prev,
        paymentMethod: value,
        feeStatus: value === 'cash' ? 'paid' : 'pending'
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleDiseaseChange = (option) => {
    const newValue = option?.value || ''
    setFormData((prev) => ({
      ...prev,
      disease: newValue
    }))
    clearFieldError('disease')
  }

  const handleDiseaseCreate = (inputValue) => {
    const newValue = inputValue.trim()
    if (!newValue) return
    setFormData((prev) => ({
      ...prev,
      disease: newValue
    }))
    clearFieldError('disease')
  }

  const validateForm = ({ showToast = false, focus = true } = {}) => {
    const errors = {}

    REQUIRED_FIELDS.forEach(({ name, label }) => {
      const value = formData[name]
      if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        errors[name] = `${label} is required`
      }
    })

    if (!errors.mobileNumber && formData.mobileNumber.trim()) {
      const digitsOnly = formData.mobileNumber.trim()
      if (!/^\d{10}$/.test(digitsOnly)) {
        errors.mobileNumber = 'Enter a valid 10-digit mobile number'
      }
    }

    // Validate BP format only if a value is provided (optional field)
    if (formData.bloodPressure && formData.bloodPressure.trim()) {
      const bpPattern = /^\d{2,3}\/\d{2,3}$/
      const trimmedBP = formData.bloodPressure.trim()
      if (!bpPattern.test(trimmedBP)) {
        errors.bloodPressure = 'Enter BP as systolic/diastolic (e.g. 120/80)'
      }
    }

    // Validate sugar level format only if a value is provided (optional field)
    const sugarLevelValue = formData.sugarLevel
    if (sugarLevelValue !== '' && sugarLevelValue !== null && sugarLevelValue !== undefined && String(sugarLevelValue).trim() !== '' && String(sugarLevelValue).trim() !== '0') {
      const sugarValue = Number(sugarLevelValue)
      if (!Number.isFinite(sugarValue) || sugarValue < 0.1) {
        errors.sugarLevel = 'Enter a valid sugar level in mg/dL (must be at least 0.1)'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      if (focus) {
        const firstErrorField =
          REQUIRED_FIELDS.map((field) => field.name).find((fieldName) => errors[fieldName]) ||
          Object.keys(errors)[0]
        if (firstErrorField) {
          focusOnField(firstErrorField)
        }
      }
      if (showToast) {
        toast.error('Please fix the highlighted fields before continuing.')
      }
      return false
    }

    setFormErrors({})
    return true
  }

  const createQRCode = () => {
    if (!validateForm({ showToast: true })) {
      return
    }

    if (consultationFee <= 0) {
      toast.error('No fees to pay. Please proceed with registration.')
      return
    }

    setFormData((prev) => ({
      ...prev,
      feeStatus: 'paid',
      paymentMethod: 'online'
    }))
    toast.success('Demo QR payment marked as received. You can register the patient now.')
  }

  const startQRPolling = (qrId, fees) => {
    // Clear any existing interval
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current)
    }

    // Poll every 3 seconds for payment status
    qrPollIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await api.get(`/payment/qr-status/${qrId}`)
        
        if (statusResponse.data.success) {
          const { status, payments } = statusResponse.data.data
          
          // Check if payment is completed
          if (status === 'paid' || (payments && payments.length > 0 && payments[0].status === 'captured')) {
            // Stop polling
            if (qrPollIntervalRef.current) {
              clearInterval(qrPollIntervalRef.current)
              qrPollIntervalRef.current = null
            }
            
            setQrPaymentStatus('paid')
            toast.success('Payment received! Registering patient...')
            
            // Register patient after payment
            await registerPatientAfterPayment(fees)
            
            // Close QR modal
            setTimeout(() => {
              setShowQRModal(false)
              setQrCodeData(null)
              setQrPaymentStatus('pending')
            }, 2000)
          }
        }
      } catch (error) {
        console.error('Error checking QR status:', error)
      }
    }, 3000) // Poll every 3 seconds
  }

  const stopQRPolling = () => {
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current)
      qrPollIntervalRef.current = null
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopQRPolling()
    }
  }, [])

  const handlePayment = async () => {
    if (!validateForm({ showToast: true })) {
      return
    }

    if (consultationFee <= 0) {
      toast.error('No fees to pay. Please proceed with registration.')
      return
    }

    setFormData((prev) => ({
      ...prev,
      feeStatus: 'paid',
      paymentMethod: 'online'
    }))
    toast.success('Demo Card/UPI payment recorded. You can complete the registration.')
  }

  const registerPatientAfterPayment = async (fees) => {
    try {
      const payloadBase = {
        ...formData,
        bloodPressure: formData.bloodPressure && formData.bloodPressure.trim() ? formData.bloodPressure.trim() : '',
        sugarLevel: formData.sugarLevel && formData.sugarLevel !== '' ? Number(formData.sugarLevel) : 0
      }

      const response = await api.post('/patient/register', {
        ...payloadBase,
        fees: fees,
        isRecheck: formData.isRecheck || false,
        feeStatus: 'paid',
        paymentMethod: 'online',
        paymentDate: new Date().toISOString(),
        paymentAmount: fees
      })
      
      setGeneratedToken(response.data.data)
      setShowTokenModal(true)
      
      // Reset form
      setFormData(getInitialFormData())
      setUploadedPDF(null) // Clear uploaded PDF
      setScannedData(null) // Clear scanned data
      
      // Refresh patient lists
      fetchTodayPatients()
      fetchPatientHistory()
      fetchDoctors()
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.response?.data?.message || 'Registration failed after payment')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm({ showToast: true })) {
      return
    }

    // Check if selected doctor is available before proceeding
    if (formData.doctor) {
      const selectedDoctor = allDoctors.find(doc => doc._id === formData.doctor)
      if (selectedDoctor) {
        const stats = doctorStats[selectedDoctor._id] || {}
        const isAvailable = stats.isAvailable !== undefined 
          ? stats.isAvailable 
          : selectedDoctor.isAvailable !== undefined 
            ? selectedDoctor.isAvailable 
            : true
        
        if (!isAvailable) {
          toast.error('Doctor is currently unavailable. Please select another doctor or check available timings.', {
            duration: 5000,
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500'
            }
          })
          return
        }
      }
    }

    const payloadBase = {
      ...formData,
      bloodPressure: formData.bloodPressure && formData.bloodPressure.trim() ? String(formData.bloodPressure).trim() : '',
      sugarLevel: formData.sugarLevel && formData.sugarLevel !== '' ? Number(formData.sugarLevel) : 0
    }
    
    // For recheck-up visits, register directly without payment
    if (formData.isRecheck) {
      try {
        const response = await api.post('/patient/register', {
          ...payloadBase,
          fees: 0,
          isRecheck: true,
          feeStatus: 'not_required'
        })
        setGeneratedToken(response.data.data)
        setShowTokenModal(true)
        
        setFormData(getInitialFormData())
        setUploadedPDF(null) // Clear uploaded PDF
        setScannedData(null) // Clear scanned data
        toast.success('Patient registered successfully!')
        fetchTodayPatients()
        fetchPatientHistory()
        fetchDoctors()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed')
      }
      return
    }

    // For cash payment, register directly with paid status
    if (formData.paymentMethod === 'cash') {
      try {
        const fees = consultationFee
        
        const response = await api.post('/patient/register', {
          ...payloadBase,
          fees: fees,
          isRecheck: false,
          feeStatus: 'paid',
          paymentMethod: 'cash',
          paymentDate: new Date().toISOString(),
          paymentAmount: fees
        })
        setGeneratedToken(response.data.data)
        setShowTokenModal(true)
        
        setFormData(getInitialFormData())
        setUploadedPDF(null) // Clear uploaded PDF
        setScannedData(null) // Clear scanned data
        toast.success('Patient registered successfully! Cash payment received.')
        fetchTodayPatients()
        fetchPatientHistory()
        fetchDoctors()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed')
      }
      return
    }

    // For online payment, check if payment is already completed
    if (formData.paymentMethod === 'online' && formData.feeStatus === 'paid') {
      // Register directly if already marked as paid (from QR code or card payment)
      try {
        const fees = consultationFee
        
        const response = await api.post('/patient/register', {
          ...payloadBase,
          fees: fees,
          isRecheck: false,
          feeStatus: 'paid',
          paymentMethod: 'online'
        })
        setGeneratedToken(response.data.data)
        setShowTokenModal(true)
        
        setFormData(getInitialFormData())
        setUploadedPDF(null) // Clear uploaded PDF
        setScannedData(null) // Clear scanned data
        toast.success('Patient registered successfully!')
        fetchTodayPatients()
        fetchPatientHistory()
        fetchDoctors()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed')
      }
    } else {
      // For pending online payments, show error - user should use QR code or Card/UPI buttons
      toast.error('Please complete payment using QR code or Card/UPI option')
    }
  }

  const handleEmergencySubmit = async (e) => {
    e.preventDefault()
    
    // Validate emergency form
    const errors = {}
    if (!emergencyFormData.fullName?.trim()) {
      errors.fullName = 'Full name is required'
    }
    if (!emergencyFormData.age || Number(emergencyFormData.age) <= 0) {
      errors.age = 'Valid age is required'
    }
    if (!emergencyFormData.gender) {
      errors.gender = 'Gender is required'
    }
    if (!emergencyFormData.doctor) {
      errors.doctor = 'Please select a doctor'
    }
    if (!emergencyFormData.fees || Number(emergencyFormData.fees) < 0) {
      errors.fees = 'Valid consultation fee is required'
    }

    if (Object.keys(errors).length > 0) {
      setEmergencyFormErrors(errors)
      toast.error('Please fill all required fields')
      return
    }

    setEmergencyFormErrors({})

    try {
      // Register emergency patient with minimal required fields
      // Emergency patients bypass daily limits and have relaxed validation
      const response = await api.post('/patient/register', {
        fullName: emergencyFormData.fullName.trim(),
        mobileNumber: '0000000000', // Default for emergency - can be updated later
        address: 'Emergency Case', // Default for emergency
        age: Number(emergencyFormData.age),
        gender: emergencyFormData.gender,
        doctor: emergencyFormData.doctor,
        fees: Number(emergencyFormData.fees),
        disease: 'Emergency Case',
        bloodPressure: 'N/A', // Default for emergency
        sugarLevel: 1, // Default for emergency (min value)
        isEmergency: true,
        feeStatus: 'pending',
        visitDate: getDefaultVisitDate(),
        visitTime: getDefaultVisitTime()
      })

      toast.success('Emergency patient registered successfully!')
      
      // Reset form
      setEmergencyFormData({
        fullName: '',
        age: '',
        gender: '',
        doctor: '',
        fees: ''
      })
      
      // Refresh patient lists
      fetchTodayPatients()
      fetchPatientHistory()
      fetchDoctors()
    } catch (error) {
      console.error('Emergency registration error:', error)
      toast.error(error.response?.data?.message || 'Failed to register emergency patient')
    }
  }

  const closeTokenModal = () => {
    setShowTokenModal(false)
    setGeneratedToken(null)
    // Refresh patient lists after registration
    fetchTodayPatients()
    fetchPatientHistory()
  }

  const handleCancelClick = (patient) => {
    console.log('Cancel button clicked for patient:', patient)
    if (!patient || !patient._id) {
      console.error('Invalid patient object:', patient)
      toast.error('Invalid patient data')
      return
    }
    setPatientToCancel(patient)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async () => {
    if (!patientToCancel) {
      console.error('No patient selected for cancellation')
      return
    }

    try {
      console.log('Cancelling patient:', patientToCancel._id, patientToCancel.fullName)
      const response = await api.put(`/patient/${patientToCancel._id}/cancel`)
      
      if (response.data.success) {
        // Store patient name for success modal
        setCancelledPatientName(patientToCancel.fullName)
        
        // Close confirmation modal
        setShowCancelModal(false)
        
        // Remove patient from lists immediately
        setTodayPatients(prev => prev.filter(p => p._id !== patientToCancel._id))
        setPatientHistory(prev => prev.filter(p => p._id !== patientToCancel._id))
        
        // Show success modal
        setShowCancelSuccessModal(true)
        
        // Clear patient to cancel
        setPatientToCancel(null)
      } else {
        throw new Error(response.data.message || 'Failed to cancel patient')
      }
    } catch (error) {
      console.error('Error cancelling patient:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to cancel patient')
      setShowCancelModal(false)
      setPatientToCancel(null)
    }
  }

  const handleCancelClose = () => {
    setShowCancelModal(false)
    setPatientToCancel(null)
  }

  const handleCancelSuccessClose = () => {
    setShowCancelSuccessModal(false)
    setCancelledPatientName(null)
  }

  const fetchTodayPatients = async () => {
    setLoadingPatients(true)
    try {
      // Get all doctors first
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Fetch patients for all doctors today
      const patientPromises = allDoctors.map(doctor =>
        api.get(`/patient/today/${doctor._id}`)
          .then(res => res.data.data)
          .catch(() => [])
      )
      
      const allPatientsArrays = await Promise.all(patientPromises)
      const allTodayPatients = allPatientsArrays.flat()
      
      // Sort by visit time then token number
      allTodayPatients.sort((a, b) => {
        const timeA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0
        const timeB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0
        const timeDiff = timeA - timeB
        if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
          return timeDiff
        }
        return (a.tokenNumber || 0) - (b.tokenNumber || 0)
      })
      setTodayPatients(allTodayPatients)
      // Reset to first page when data is refreshed
      setTodayPatientsPage(1)
    } catch (error) {
      console.error('Error fetching today patients:', error)
      toast.error('Failed to fetch today\'s patients')
    } finally {
      setLoadingPatients(false)
    }
  }

  const fetchPatientHistory = async () => {
    try {
      const response = await api.get('/patient')
      const patients = response.data.data || []
      // Sort by most recent first
      patients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setPatientHistory(patients)
      // Reset to first page when data is refreshed
      setPatientHistoryPage(1)
    } catch (error) {
      console.error('Error fetching patient history:', error)
      toast.error('Failed to fetch patient history')
    }
  }

  const getDateTimeLabels = (value) => {
    if (!value) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    return {
      dateLabel: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeLabel: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getAppointmentLabels = (dateStr, timeStr) => {
    if (!dateStr) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    
    // Format date as "03 November 2025"
    const appointmentDate = new Date(dateStr)
    if (isNaN(appointmentDate.getTime())) {
      return { dateLabel: '—', timeLabel: '—' }
    }
    
    const dateLabel = appointmentDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    // Format time as "04:30 PM"
    let timeLabel = '—'
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours, 10)
      const minute = minutes || '00'
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      timeLabel = `${String(hour12).padStart(2, '0')}:${minute.padStart(2, '0')} ${ampm}`
    }
    
    return { dateLabel, timeLabel }
  }

  const generatedTokenDateTime = generatedToken ? getDateTimeLabels(generatedToken.registrationDate) : null

  // Filter patients based on view type and search query
  const filteredTodayPatients = useMemo(() => {
    let filtered = todayPatients
    
    // Filter by view type
    if (patientsRegisterView === 'recheck') {
      filtered = filtered.filter(patient => patient.isRecheck === true && !patient.isCancelled)
    } else if (patientsRegisterView === 'today') {
      filtered = filtered.filter(patient => !patient.isRecheck && !patient.isCancelled)
    }
    // 'history' view shows all patients including cancelled
    
    // Apply search filter - instant filtering by mobile number, patient name, or token number
    if (patientsRegisterSearchDebounced.trim()) {
      const searchTerm = patientsRegisterSearchDebounced.trim().toLowerCase()
      filtered = filtered.filter((patient) => {
        const fullName = (patient.fullName || '').toLowerCase()
        const mobileNumber = (patient.mobileNumber || '').toLowerCase()
        const tokenNumber = (patient.tokenNumber || '').toString()
        // Search in all three fields: name, mobile, and token
        return (
          fullName.includes(searchTerm) ||
          mobileNumber.includes(searchTerm) ||
          tokenNumber.includes(searchTerm)
        )
      })
    }
    
    return filtered
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime()
        const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime()
        return dateB - dateA
      })
  }, [todayPatients, patientsRegisterView, patientsRegisterSearchDebounced])

  const filteredPatientHistory = useMemo(() => {
    let filtered = patientHistory
    
    // Filter by view type
    if (patientsRegisterView === 'recheck') {
      filtered = filtered.filter(patient => patient.isRecheck === true)
    } else if (patientsRegisterView === 'today') {
      filtered = filtered.filter(patient => !patient.isRecheck)
    }
    // 'history' view shows all patients
    
    // Apply search filter - instant filtering by mobile number, patient name, or token number
    if (patientsRegisterSearchDebounced.trim()) {
      const searchTerm = patientsRegisterSearchDebounced.trim().toLowerCase()
      filtered = filtered.filter((patient) => {
        const fullName = (patient.fullName || '').toLowerCase()
        const mobileNumber = (patient.mobileNumber || '').toLowerCase()
        const tokenNumber = (patient.tokenNumber || '').toString()
        // Search in all three fields: name, mobile, and token
        return (
          fullName.includes(searchTerm) ||
          mobileNumber.includes(searchTerm) ||
          tokenNumber.includes(searchTerm)
        )
      })
    }
    
    return filtered
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.registrationDate || a.createdAt || 0).getTime()
        const dateB = new Date(b.registrationDate || b.createdAt || 0).getTime()
        return dateB - dateA
      })
  }, [patientHistory, patientsRegisterView, patientsRegisterSearchDebounced])

  // Calculate counts for each view
  const todayPatientsCount = useMemo(() => {
    return todayPatients.filter(p => !p.isRecheck && !p.isCancelled).length
  }, [todayPatients])

  const recheckPatientsCount = useMemo(() => {
    return todayPatients.filter(p => p.isRecheck === true && !p.isCancelled).length
  }, [todayPatients])

  const historyPatientsCount = useMemo(() => {
    return patientHistory.length
  }, [patientHistory])

  // Update debounced search immediately for instant filtering
  useEffect(() => {
    setPatientsRegisterSearchDebounced(patientsRegisterSearch)
    // Reset pagination when search changes
    setTodayPatientsPage(1)
    setPatientHistoryPage(1)
  }, [patientsRegisterSearch])

  // Pagination logic for Patient History
  const patientHistoryTotalPages = Math.ceil(filteredPatientHistory.length / patientHistoryPerPage)
  const patientHistoryStartIndex = (patientHistoryPage - 1) * patientHistoryPerPage
  const patientHistoryEndIndex = patientHistoryStartIndex + patientHistoryPerPage
  const paginatedPatientHistory = filteredPatientHistory.slice(patientHistoryStartIndex, patientHistoryEndIndex)

  const handlePatientHistoryPageChange = (newPage) => {
    setPatientHistoryPage(newPage)
    // Scroll to top of the section on page change
    const section = document.getElementById('patients-register-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const getVisibleHistoryPageNumbers = () => {
    const total = patientHistoryTotalPages
    const current = patientHistoryPage
    const pages = []
    
    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, last page, current page, and pages around it
      pages.push(1)
      
      if (current > 3) {
        pages.push('...')
      }
      
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (current < total - 2) {
        pages.push('...')
      }
      
      if (total > 1) {
        pages.push(total)
      }
    }
    
    return pages
  }

  // Pagination logic for Today's Patients
  const todayPatientsTotalPages = Math.ceil(filteredTodayPatients.length / todayPatientsPerPage)
  const todayPatientsStartIndex = (todayPatientsPage - 1) * todayPatientsPerPage
  const todayPatientsEndIndex = todayPatientsStartIndex + todayPatientsPerPage
  const paginatedTodayPatients = filteredTodayPatients.slice(todayPatientsStartIndex, todayPatientsEndIndex)
  
  const handleTodayPatientsPageChange = (newPage) => {
    setTodayPatientsPage(newPage)
    // Scroll to top of the section on page change
    const section = document.getElementById('patients-register-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const getVisiblePageNumbers = () => {
    const total = todayPatientsTotalPages
    const current = todayPatientsPage
    const pages = []
    
    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, last page, current page, and pages around it
      pages.push(1)
      
      if (current > 3) {
        pages.push('...')
      }
      
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (current < total - 2) {
        pages.push('...')
      }
      
      if (total > 1) {
        pages.push(total)
      }
    }
    
    return pages
  }
  
  // Separate appointments into Today's and Upcoming
  const { todayAppointments, upcomingAppointments } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayApps = []
    const upcomingApps = []

    appointments.forEach(appointment => {
      // Parse appointment date (handles both Date objects and date strings)
      const appointmentDate = new Date(appointment.appointmentDate)
      if (isNaN(appointmentDate.getTime())) {
        // Skip invalid dates
        return
      }
      
      // Compare dates by setting time to midnight
      const appointmentDateOnly = new Date(appointmentDate)
      appointmentDateOnly.setHours(0, 0, 0, 0)
      
      if (appointmentDateOnly.getTime() === today.getTime()) {
        todayApps.push(appointment)
      } else if (appointmentDateOnly.getTime() >= tomorrow.getTime()) {
        upcomingApps.push(appointment)
      }
    })

    // Sort today's appointments by time
    todayApps.sort((a, b) => {
      const dateStrA = typeof a.appointmentDate === 'string' ? a.appointmentDate : new Date(a.appointmentDate).toISOString().split('T')[0]
      const dateStrB = typeof b.appointmentDate === 'string' ? b.appointmentDate : new Date(b.appointmentDate).toISOString().split('T')[0]
      const timeA = new Date(`${dateStrA}T${a.appointmentTime || '00:00'}`).getTime()
      const timeB = new Date(`${dateStrB}T${b.appointmentTime || '00:00'}`).getTime()
      return timeA - timeB
    })

    // Sort upcoming appointments by date and time
    upcomingApps.sort((a, b) => {
      const dateStrA = typeof a.appointmentDate === 'string' ? a.appointmentDate : new Date(a.appointmentDate).toISOString().split('T')[0]
      const dateStrB = typeof b.appointmentDate === 'string' ? b.appointmentDate : new Date(b.appointmentDate).toISOString().split('T')[0]
      const timeA = new Date(`${dateStrA}T${a.appointmentTime || '00:00'}`).getTime()
      const timeB = new Date(`${dateStrB}T${b.appointmentTime || '00:00'}`).getTime()
      return timeA - timeB
    })

    return { todayAppointments: todayApps, upcomingAppointments: upcomingApps }
  }, [appointments])

  // Debounce appointments search input for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppointmentsSearchDebounced(appointmentsSearch)
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timer)
  }, [appointmentsSearch])

  // Filter appointments based on search query
  const filteredTodayAppointments = useMemo(() => {
    if (!appointmentsSearchDebounced.trim()) {
      return todayAppointments
    }
    const searchTerm = appointmentsSearchDebounced.trim().toLowerCase()
    return todayAppointments.filter((appointment) => {
      const patientName = appointment.patientName?.toLowerCase() || ''
      const mobileNumber = appointment.mobileNumber?.toLowerCase() || ''
      const tokenNumber = appointment.tokenNumber?.toString() || ''
      return (
        patientName.includes(searchTerm) ||
        mobileNumber.includes(searchTerm) ||
        tokenNumber.includes(searchTerm)
      )
    })
  }, [todayAppointments, appointmentsSearchDebounced])

  const filteredUpcomingAppointments = useMemo(() => {
    if (!appointmentsSearchDebounced.trim()) {
      return upcomingAppointments
    }
    const searchTerm = appointmentsSearchDebounced.trim().toLowerCase()
    return upcomingAppointments.filter((appointment) => {
      const patientName = appointment.patientName?.toLowerCase() || ''
      const mobileNumber = appointment.mobileNumber?.toLowerCase() || ''
      const tokenNumber = appointment.tokenNumber?.toString() || ''
      return (
        patientName.includes(searchTerm) ||
        mobileNumber.includes(searchTerm) ||
        tokenNumber.includes(searchTerm)
      )
    })
  }, [upcomingAppointments, appointmentsSearchDebounced])

  const fetchAppointments = async () => {
    setLoadingAppointments(true)
    try {
      const response = await api.get('/appointment')
      const allAppointments = response.data.data || []
      // Sort by appointment date/time (upcoming first)
      allAppointments.sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`)
        const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`)
        return dateA - dateB
      })
      setAppointments(allAppointments)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments')
    } finally {
      setLoadingAppointments(false)
    }
  }

  // PDF utility functions
  const getPDFUrl = (pdfPath) => {
    if (!pdfPath) return null
    
    // If pdfPath is already a full URL (starts with http:// or https://), return it as is
    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      return pdfPath
    }
    
    // Otherwise, prepend the base URL
    const baseURL = import.meta.env.VITE_API_BASE_URL || 
      (window.location.hostname === 'localhost' 
        ? 'http://localhost:7000/api' 
        : 'https://hms-opd-backend.vercel.app/api')
    return `${baseURL}${pdfPath}`
  }

  const downloadPdf = async (pdfUrl, fileName) => {
    try {
      // Get token for authenticated requests if needed
      const token = localStorage.getItem('token')
      
      console.log('Downloading PDF from:', pdfUrl)
      
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error('PDF fetch failed:', response.status, response.statusText, errorText)
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }

      // Check content type from headers
      const contentType = response.headers.get('content-type') || ''
      console.log('PDF Content-Type:', contentType)
      
      const blob = await response.blob()
      console.log('Blob type:', blob.type, 'Blob size:', blob.size)
      
      // Check if blob is actually a PDF or if it's an error page
      if (blob.type !== 'application/pdf' && !blob.type.includes('pdf') && !contentType.includes('pdf')) {
        // Clone the blob to read as text without consuming the original
        const textBlob = blob.slice(0, 1000) // Only read first 1000 bytes for checking
        const text = await textBlob.text()
        console.log('Response text preview:', text.substring(0, 200))
        
        // Check if it's an HTML error page
        if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('404') || text.includes('Not Found') || text.includes('error')) {
          throw new Error('PDF file not found on server')
        }
        
        // If it's not HTML and not PDF, but we got a 200 response, try to download anyway
        // Some servers don't set content-type correctly, especially Cloudinary
        if (blob.size > 0) {
          console.warn('Blob type not detected as PDF, but attempting download anyway (size:', blob.size, 'bytes)')
          // Continue with download - might be a valid PDF with wrong content-type
        } else {
          throw new Error('PDF file is empty or invalid')
        }
      }
      
      // Ensure we have a valid blob
      if (blob.size === 0) {
        throw new Error('PDF file is empty')
      }
      
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
      
      toast.success('Prescription downloaded successfully!')
    } catch (error) {
      console.error('PDF download failed:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        pdfUrl: pdfUrl
      })
      toast.error(error.message || 'Failed to download PDF. Please check if the file exists.')
    }
  }

  const viewPdf = async (pdfUrl, fileName = 'prescription') => {
    try {
      // Get token for authenticated request
      const token = localStorage.getItem('token')
      
      console.log('Viewing PDF from:', pdfUrl)
      
      const response = await fetch(pdfUrl, {
        credentials: pdfUrl.startsWith('http') ? 'omit' : 'include',
        headers: {
          'Accept': 'application/pdf',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error('PDF fetch failed:', response.status, response.statusText, errorText)
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }

      // Check content type from headers
      const contentType = response.headers.get('content-type') || ''
      console.log('PDF Content-Type:', contentType)
      
      const blob = await response.blob()
      console.log('Blob type:', blob.type, 'Blob size:', blob.size)
      
      // Check if blob is actually a PDF or if it's an error page
      if (blob.type !== 'application/pdf' && !blob.type.includes('pdf') && !contentType.includes('pdf')) {
        // Clone the blob to read as text without consuming the original
        const textBlob = blob.slice(0, 1000) // Only read first 1000 bytes for checking
        const text = await textBlob.text()
        console.log('Response text preview:', text.substring(0, 200))
        
        // Check if it's an HTML error page
        if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('404') || text.includes('Not Found') || text.includes('error')) {
          throw new Error('PDF file not found on server')
        }
        
        // If it's not HTML and not PDF, but we got a 200 response, try to view anyway
        // Some servers don't set content-type correctly, especially Cloudinary
        if (blob.size === 0) {
          throw new Error('PDF file is empty or invalid')
        }
        console.warn('Blob type not detected as PDF, but attempting to view anyway (size:', blob.size, 'bytes)')
      }
      
      // Ensure we have a valid blob
      if (blob.size === 0) {
        throw new Error('PDF file is empty')
      }
      
      // Create a blob URL with proper PDF type
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(pdfBlob)
      
      // Open PDF in new tab with proper extension
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow) {
        window.URL.revokeObjectURL(url)
        toast.error('Please allow pop-ups to view PDF')
        return
      }
      
      // Set the window location to the blob URL
      // The browser will handle displaying the PDF
      newWindow.location.href = url
      
      // Clean up the URL after a delay (give time for PDF to load)
      setTimeout(() => {
        // Don't revoke immediately - let the PDF load first
        // The browser will keep the blob URL alive while the tab is open
      }, 1000)
      
      toast.success('Opening PDF in new tab...')
    } catch (error) {
      console.error('PDF view failed:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        pdfUrl: pdfUrl
      })
      toast.error('Failed to view PDF: ' + (error.message || 'Please try downloading instead.'))
    }
  }

  const handleDownloadPrescription = async (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available to download')
        return
      }

      if (!patient.prescription.pdfPath) {
        toast.error('PDF path not found for this prescription')
        return
      }

      const pdfUrl = getPDFUrl(patient.prescription.pdfPath)
      console.log('Patient prescription PDF path:', patient.prescription.pdfPath)
      console.log('Generated PDF URL:', pdfUrl)
      
      if (pdfUrl) {
        await downloadPdf(pdfUrl, `prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber || patient._id}`)
      } else {
        toast.error('PDF URL could not be generated')
      }
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download prescription: ' + (error.message || 'Unknown error'))
    }
  }

  const handleViewPrescription = async (patient) => {
    try {
      if (!patient?.prescription) {
        toast.error('No prescription available')
        return
      }

      if (!patient.prescription.pdfPath) {
        toast.error('PDF path not found for this prescription')
        return
      }

      const pdfUrl = getPDFUrl(patient.prescription.pdfPath)
      console.log('Patient prescription PDF path:', patient.prescription.pdfPath)
      console.log('Generated PDF URL:', pdfUrl)
      
      if (pdfUrl) {
        const fileName = `prescription_${patient.fullName.replace(/\s/g, '_')}_${patient.tokenNumber || patient._id}`
        await viewPdf(pdfUrl, fileName)
      } else {
        toast.error('PDF URL could not be generated')
      }
    } catch (error) {
      console.error('View failed:', error)
      toast.error('Failed to view prescription: ' + (error.message || 'Unknown error'))
    }
  }

  const handleAppointmentChange = (e) => {
    const { name, value } = e.target
    
    // If doctor changes, dynamically set date and time based on availability
    if (name === 'doctor') {
      const newDoctor = allDoctors.find((doc) => doc._id === value)
      let appointmentDate = null
      let appointmentTime = null
      
      if (newDoctor) {
        // Check if doctor is unavailable
        const stats = doctorStats[newDoctor._id] || {}
        const isAvailable = stats.isAvailable !== undefined ? stats.isAvailable : newDoctor.isAvailable !== undefined ? newDoctor.isAvailable : true
        
        if (!isAvailable) {
          // For unavailable doctors, use next available date
          const nextAvailable = getNextAvailableDate(newDoctor)
          if (nextAvailable) {
            appointmentDate = nextAvailable.date
            // Set time to first available slot
            if (nextAvailable.timeSlots && nextAvailable.timeSlots.length > 0) {
              appointmentTime = nextAvailable.timeSlots[0]
            } else {
              // Fallback to first enabled period's start time
              const visitingHours = newDoctor.visitingHours || {}
              const periods = ['morning', 'afternoon', 'evening']
              for (const period of periods) {
                const periodHours = visitingHours[period]
                if (periodHours?.enabled && periodHours.start) {
                  appointmentTime = periodHours.start
                  break
                }
              }
            }
            
            if (appointmentTime) {
              const dayName = nextAvailable.dateObj.toLocaleDateString('en-US', { weekday: 'long' })
              const formattedDate = nextAvailable.dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
              toast.info(`Date set to next available: ${dayName}, ${formattedDate}`, {
                duration: 2000
              })
            }
          }
        } else {
          // For available doctors, find first available date from tomorrow
          const today = new Date()
          for (let i = 1; i <= 30; i++) {
            const date = new Date(today)
            date.setDate(date.getDate() + i)
            const dateString = date.toISOString().split('T')[0]
            if (isDateAvailable(dateString, newDoctor)) {
              appointmentDate = dateString
              break
            }
          }
          
          // Get first available time slot for the new date
          if (appointmentDate) {
            const slots = getAvailableTimeSlots(newDoctor, appointmentDate)
            if (slots.length > 0) {
              appointmentTime = slots[0]
            }
          }
        }
      }
      
      // Fallback to defaults if no date/time found
      if (!appointmentDate) {
        appointmentDate = getDefaultAppointmentDate()
      }
      if (!appointmentTime) {
        appointmentTime = getDefaultAppointmentTime()
      }
      
      setAppointmentForm({
        ...appointmentForm,
        doctor: value,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime
      })
      return
    }
    
    // If date changes, validate and update time if needed
    if (name === 'appointmentDate') {
      const newDate = value
      const currentDoctor = allDoctors.find((doc) => doc._id === appointmentForm.doctor)
      
      // Check if new date is available - auto-update to next available if not
      if (currentDoctor && !isDateAvailable(newDate, currentDoctor)) {
        // Auto-update to next available date instead of showing error
        const nextAvailable = getNextAvailableDate(currentDoctor)
        if (nextAvailable) {
          let appointmentTime = appointmentForm.appointmentTime
          
          // Set time to first available slot for the new date
          if (nextAvailable.timeSlots && nextAvailable.timeSlots.length > 0) {
            appointmentTime = nextAvailable.timeSlots[0]
          } else {
            // Fallback to first enabled period's start time
            const visitingHours = currentDoctor.visitingHours || {}
            const periods = ['morning', 'afternoon', 'evening']
            for (const period of periods) {
              const periodHours = visitingHours[period]
              if (periodHours?.enabled && periodHours.start) {
                appointmentTime = periodHours.start
                break
              }
            }
          }
          
          setAppointmentForm({
            ...appointmentForm,
            appointmentDate: nextAvailable.date,
            appointmentTime: appointmentTime || appointmentForm.appointmentTime || getDefaultAppointmentTime()
          })
          
          const dayName = nextAvailable.dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          const formattedDate = nextAvailable.dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          toast.info(`Date auto-updated to next available: ${dayName}, ${formattedDate}`, {
            duration: 2500
          })
          return
        }
        
        // If no next available date found, show error with available days
        const schedule = currentDoctor.weeklySchedule || {}
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const availableDays = dayNames
          .map((day, index) => ({ day, label: dayLabels[index], available: schedule[day] !== false }))
          .filter(d => d.available)
          .map(d => d.label)
        
        toast.error(`No available dates found. This doctor is only available on: ${availableDays.join(', ')}`)
        return
      }
      
      // Get available time slots for the new date
      const slots = currentDoctor ? getAvailableTimeSlots(currentDoctor, newDate) : []
      let newTime = appointmentForm.appointmentTime
      
      // If current time is not available, use first available slot
      if (slots.length > 0) {
        if (!isTimeAvailable(newTime, currentDoctor, newDate)) {
          newTime = slots[0]
          toast.info(`Time updated to ${formatTime12Hour(newTime)} based on doctor's availability`)
        }
      } else {
        // No slots available, reset to default
        newTime = getDefaultAppointmentTime()
        toast.warning('No time slots configured for this date. Please configure visiting hours.')
      }
      
      setAppointmentForm({
        ...appointmentForm,
        appointmentDate: newDate,
        appointmentTime: newTime
      })
      return
    }
    
    // If time changes, validate it
    if (name === 'appointmentTime') {
      const currentDoctor = allDoctors.find((doc) => doc._id === appointmentForm.doctor)
      if (currentDoctor && appointmentForm.appointmentDate) {
        if (!isTimeAvailable(value, currentDoctor, appointmentForm.appointmentDate)) {
          toast.error('Selected time is not available for this doctor on the chosen date. Please select an available time slot.')
          return
        }
      }
    }
    
    setAppointmentForm({
      ...appointmentForm,
      [name]: value
    })
  }

  const handleScheduleAppointment = async (e) => {
    e.preventDefault()
    
    if (!appointmentForm.patientName || !appointmentForm.mobileNumber || !appointmentForm.appointmentDate || !appointmentForm.appointmentTime || !appointmentForm.doctor) {
      toast.error('Please fill all required fields')
      return
    }

    // Validate doctor availability
    const selectedDoctor = allDoctors.find((doc) => doc._id === appointmentForm.doctor)
    if (selectedDoctor) {
      if (!isDateAvailable(appointmentForm.appointmentDate, selectedDoctor)) {
        toast.error('Selected date is not available for this doctor. Please choose another date.')
        return
      }
      
      if (!isTimeAvailable(appointmentForm.appointmentTime, selectedDoctor, appointmentForm.appointmentDate)) {
        toast.error('Selected time is not available for this doctor on the chosen date. Please select an available time slot.')
        return
      }
    }

    try {
      const response = await api.post('/appointment', {
        ...appointmentForm,
        skipSms: true
      })
      
      toast.success(response.data.message || 'Appointment scheduled successfully!')
      setAppointmentSuccessData(response.data.data)
      setShowAppointmentSuccess(true)
      
      // Reset form
      setAppointmentForm(getInitialAppointmentForm())
      
      // Refresh appointments list
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule appointment')
    }
  }

  const handleResendSMS = async (appointmentId) => {
    try {
      const response = await api.post(`/appointment/${appointmentId}/resend-sms`)
      toast.success('SMS resent successfully!')
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend SMS. Please check SMS provider configuration in backend.')
    }
  }

  const handleCancelAppointment = async (appointment) => {
    setCancelledAppointmentInfo({
      patientName: appointment.patientName,
      doctorName: appointment.doctor?.fullName || 'Assigned doctor',
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime
    })
    setShowCancelSuccess(true)
  }

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setEditingAppointmentForm({
      patientName: appointment.patientName || '',
      mobileNumber: appointment.mobileNumber || '',
      email: appointment.email || '',
      appointmentDate: appointment.appointmentDate ? new Date(appointment.appointmentDate).toISOString().split('T')[0] : '',
      appointmentTime: appointment.appointmentTime || '',
      doctor: appointment.doctor?._id || appointment.doctor || '',
      reason: appointment.reason || '',
      notes: appointment.notes || '',
      status: appointment.status || 'scheduled'
    })
    setShowEditAppointmentModal(true)
  }

  const handleUpdateAppointment = async (e) => {
    e.preventDefault()
    
    if (!editingAppointmentForm.patientName || !editingAppointmentForm.mobileNumber || !editingAppointmentForm.appointmentDate || !editingAppointmentForm.appointmentTime || !editingAppointmentForm.doctor) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      await api.put(`/appointment/${selectedAppointment._id}`, editingAppointmentForm)
      toast.success('Appointment updated successfully!')
      setShowEditAppointmentModal(false)
      setSelectedAppointment(null)
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update appointment')
    }
  }

  const handleCancelEdit = () => {
    setShowEditAppointmentModal(false)
    setSelectedAppointment(null)
    setEditingAppointmentForm({
      patientName: '',
      mobileNumber: '',
      email: '',
      appointmentDate: '',
      appointmentTime: '',
      doctor: '',
      reason: '',
      notes: '',
      status: 'scheduled'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-green-600">Tekisky</span>
              <span className="text-2xl sm:text-3xl font-semibold text-slate-800">Hospital</span>
            </div>
            <p className="mt-1 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 rounded-full">Receptionist Hub</p>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">Manage arrivals, generate tokens, and coordinate with doctors seamlessly.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <span className="text-sm text-gray-700 truncate">{user?.fullName}</span>
            <button
              onClick={logout}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'doctors'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Doctors Overview
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'registration'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patient Registration
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'emergency'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Emergency Patient
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'appointments'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'prescriptions'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Prescription Records
            </button>
          </nav>
        </div>
      </div>

      {/* Pagination Animation Styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Card Entry Animation */
        @keyframes cardSlideUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Pulsing Glow for Available Status */
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0);
          }
        }
        
        /* Fade In for Unavailable Status */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        /* Ripple Effect */
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        /* Slide In from Left */
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Apply GPU acceleration */
        .gpu-accelerated {
          transform: translateZ(0);
          will-change: transform;
        }
      `}</style>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6" style={{ backgroundColor: '#f9fafb' }}>
        {/* Doctors Overview Tab */}
        {activeTab === 'doctors' && (
          <div>
            {/* Header with Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>Doctors Overview</h2>
              
              {/* Search Bar */}
              <div className="relative max-w-md w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg" role="img" aria-label="Search">🔍</span>
                </div>
                <input
                  type="text"
                  value={doctorsSearch}
                  onChange={(e) => setDoctorsSearch(e.target.value)}
                  placeholder="Search doctor by name or specialization.."
                  className="block w-full pl-12 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                  style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px' }}
                />
                {doctorsSearch && (
                  <button
                    onClick={() => setDoctorsSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loadingDoctors ? (
              <div className="flex justify-center items-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>Loading doctors...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Doctors Grid */}
                <div 
                  key={`page-${doctorsPage}`}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 transition-all duration-300 ease-in-out"
                  style={{
                    animation: 'fadeInUp 0.3s ease-in-out'
                  }}
                >
                  {doctors.map((doctor, index) => {
                const stats = doctorStats[doctor._id] || {}
                const dailyLimit = stats.dailyPatientLimit ?? doctor.dailyPatientLimit ?? 0
                const todayCount = stats.todayPatientCount ?? 0
                const remainingSlots = stats.remainingSlots ?? Math.max(dailyLimit - todayCount, 0)
                const limitReached = stats.isLimitReached || remainingSlots <= 0
                const isAvailable = stats.isAvailable !== undefined ? stats.isAvailable : doctor.isAvailable !== undefined ? doctor.isAvailable : true
                const unavailableReason = stats.unavailableReason || doctor.unavailableReason

                return (
                  <div
                    key={doctor._id}
                    onClick={() => handleDoctorCardClick(doctor)}
                    className="relative overflow-hidden bg-white rounded-xl border border-gray-200 cursor-pointer w-full shadow-md gpu-accelerated"
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '14px',
                      animation: `cardSlideUp 0.4s ease-out ${index * 0.1}s both`,
                      transition: 'transform 0.25s ease-out, box-shadow 0.25s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      if (window.innerWidth > 640) { // Only on non-touch devices
                        e.currentTarget.style.transform = 'translateY(-6px) translateZ(0)'
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) translateZ(0)'
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Profile Image - Top Right Corner */}
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                      <div className="relative group">
                        <div 
                          className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-lg border-2 border-white overflow-hidden"
                        >
                          {doctor.profileImage ? (
                            <img 
                              src={doctor.profileImage} 
                              alt={doctor.fullName || 'Doctor'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                e.target.style.display = 'none'
                                const fallback = e.target.parentElement.querySelector('.profile-fallback')
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <span 
                            className={`profile-fallback font-bold text-white ${doctor.profileImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-sm sm:text-base md:text-xl`}
                            style={{ fontWeight: 700 }}
                          >
                            {(doctor.fullName || 'D').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {/* Upload Button Overlay */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDoctorForProfile(doctor)
                            setProfileImagePreview(doctor.profileImage || null)
                            setShowProfileModal(true)
                          }}
                          className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 border-2 border-white touch-manipulation"
                          title="Upload Profile Photo"
                        >
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3">
                      {/* Doctor Name */}
                      <div className="mb-2 pr-14 sm:pr-16 md:pr-20">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight mb-1" style={{ fontWeight: 700 }}>
                          {doctor.fullName}
                        </h3>
                        
                        {/* Specialization */}
                        <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                          <span className="text-xs sm:text-sm flex-shrink-0" role="img" aria-label="Specialization">🩺</span>
                          <p className="text-xs font-semibold capitalize truncate" style={{ fontWeight: 600, color: '#3b82f6' }}>
                            {doctor.specialization || 'General Physician'}
                          </p>
                        </div>
                        
                        {/* Education/Qualification */}
                        {doctor.qualification && (
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <span className="text-xs flex-shrink-0" role="img" aria-label="Education">🎓</span>
                            <p className="text-xs text-gray-600 italic truncate" style={{ fontStyle: 'italic' }}>
                              {doctor.qualification}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>


                      {/* Visiting Time Section - Horizontal Layout */}
                      <div className={`mb-2 transition-opacity duration-300 ${!isAvailable ? 'opacity-60' : 'opacity-100'}`}>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 items-stretch">
                          {/* Morning Slot */}
                          {(() => {
                            const morningStart = doctor.visitingHours?.morning?.start || '09:00'
                            const morningEnd = doctor.visitingHours?.morning?.end || '12:00'
                            return (
                              <div 
                                className="flex-1 min-w-[calc(33.333%-0.5rem)] sm:min-w-0 flex flex-col items-center justify-center px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-lg bg-gradient-to-br from-amber-50 to-amber-50/70 border border-amber-200/60 overflow-hidden gpu-accelerated" 
                                style={{ 
                                  minHeight: '50px',
                                  transition: 'all 0.2s ease-out'
                                }}
                                onMouseEnter={(e) => {
                                  if (window.innerWidth > 640) {
                                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #fef3c7, #fde68a)'
                                    e.currentTarget.style.borderColor = '#fbbf24'
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(251, 191, 36, 0.2)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(to bottom right, #fffbeb, #fef3c7)'
                                  e.currentTarget.style.borderColor = '#fde68a'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                <div className="flex items-center justify-center gap-0.5 mb-0.5 w-full">
                                  <span className="text-[10px] flex-shrink-0" role="img" aria-label="Morning" style={{ fontSize: '10px', lineHeight: '1' }}>☀️</span>
                                  <span className="text-[9px] font-bold text-amber-900 uppercase tracking-tight text-center leading-tight" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.01em' }}>
                                    Morning
                                  </span>
                                </div>
                                <span className="text-[8px] font-mono text-amber-800 text-center leading-tight font-medium" style={{ fontSize: '8px', lineHeight: '1.2' }}>
                                  {formatTime12Hour(morningStart)}<br />{formatTime12Hour(morningEnd)}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Afternoon Slot */}
                          {(() => {
                            const afternoonStart = doctor.visitingHours?.afternoon?.start || '13:00'
                            const afternoonEnd = doctor.visitingHours?.afternoon?.end || '16:00'
                            return (
                              <div 
                                className="flex-1 min-w-[calc(33.333%-0.5rem)] sm:min-w-0 flex flex-col items-center justify-center px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-lg bg-gradient-to-br from-orange-50 to-orange-50/70 border border-orange-200/60 overflow-hidden gpu-accelerated" 
                                style={{ 
                                  minHeight: '50px',
                                  transition: 'all 0.2s ease-out'
                                }}
                                onMouseEnter={(e) => {
                                  if (window.innerWidth > 640) {
                                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #fed7aa, #fdba74)'
                                    e.currentTarget.style.borderColor = '#fb923c'
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(251, 146, 60, 0.2)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(to bottom right, #fff7ed, #ffedd5)'
                                  e.currentTarget.style.borderColor = '#fed7aa'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                <div className="flex items-center justify-center gap-0.5 mb-0.5 w-full">
                                  <span className="text-[10px] flex-shrink-0" role="img" aria-label="Afternoon" style={{ fontSize: '10px', lineHeight: '1' }}>🌤️</span>
                                  <span className="text-[9px] font-bold text-orange-900 uppercase tracking-tight text-center leading-tight" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.01em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                    Afternoon
                                  </span>
                                </div>
                                <span className="text-[8px] font-mono text-orange-800 text-center leading-tight font-medium" style={{ fontSize: '8px', lineHeight: '1.2' }}>
                                  {formatTime12Hour(afternoonStart)}<br />{formatTime12Hour(afternoonEnd)}
                                </span>
                              </div>
                            )
                          })()}
                          
                          {/* Evening Slot */}
                          {(() => {
                            const eveningStart = doctor.visitingHours?.evening?.start || '18:00'
                            const eveningEnd = doctor.visitingHours?.evening?.end || '21:00'
                            return (
                              <div 
                                className="flex-1 min-w-[calc(33.333%-0.5rem)] sm:min-w-0 flex flex-col items-center justify-center px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/70 border border-blue-200/60 overflow-hidden gpu-accelerated" 
                                style={{ 
                                  minHeight: '50px',
                                  transition: 'all 0.2s ease-out'
                                }}
                                onMouseEnter={(e) => {
                                  if (window.innerWidth > 640) {
                                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)'
                                    e.currentTarget.style.borderColor = '#60a5fa'
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(96, 165, 250, 0.2)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'linear-gradient(to bottom right, #eff6ff, #dbeafe)'
                                  e.currentTarget.style.borderColor = '#bfdbfe'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}
                              >
                                <div className="flex items-center justify-center gap-0.5 mb-0.5 w-full">
                                  <span className="text-[10px] flex-shrink-0" role="img" aria-label="Evening" style={{ fontSize: '10px', lineHeight: '1' }}>🌙</span>
                                  <span className="text-[9px] font-bold text-blue-900 uppercase tracking-tight text-center leading-tight" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.01em' }}>
                                    Evening
                                  </span>
                                </div>
                                <span className="text-[8px] font-mono text-blue-800 text-center leading-tight font-medium" style={{ fontSize: '8px', lineHeight: '1.2' }}>
                                  {formatTime12Hour(eveningStart)}<br />{formatTime12Hour(eveningEnd)}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Daily Stats - Inline Row */}
                      <div className="flex items-center justify-between gap-1 sm:gap-2 mb-2 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-gray-50 rounded-lg">
                        <div className="flex-1 text-center min-w-0">
                          <p className="text-[8px] sm:text-[9px] text-gray-500 font-medium mb-0.5">Daily Limit</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900" style={{ fontWeight: 700 }}>{dailyLimit}</p>
                        </div>
                        <div className="w-px h-5 sm:h-6 bg-gray-200"></div>
                        <div className="flex-1 text-center min-w-0">
                          <p className="text-[8px] sm:text-[9px] text-gray-500 font-medium mb-0.5">Today</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900" style={{ fontWeight: 700 }}>{todayCount}</p>
                        </div>
                        <div className="w-px h-5 sm:h-6 bg-gray-200"></div>
                        <div className="flex-1 text-center min-w-0">
                          <p className={`text-[8px] sm:text-[9px] font-medium mb-0.5 ${
                            limitReached ? 'text-red-600' : 'text-green-600'
                          }`}>Remaining</p>
                          <p className={`text-xs sm:text-sm font-bold ${
                            limitReached ? 'text-red-600' : 'text-green-600'
                          }`} style={{ fontWeight: 700 }}>{remainingSlots}</p>
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-1.5 sm:gap-2 mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Ripple effect
                            const button = e.currentTarget
                            const ripple = document.createElement('span')
                            const rect = button.getBoundingClientRect()
                            const size = Math.max(rect.width, rect.height)
                            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - size / 2
                            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top - size / 2
                            
                            ripple.style.width = ripple.style.height = size + 'px'
                            ripple.style.left = x + 'px'
                            ripple.style.top = y + 'px'
                            ripple.style.position = 'absolute'
                            ripple.style.borderRadius = '50%'
                            ripple.style.background = 'rgba(255, 255, 255, 0.5)'
                            ripple.style.transform = 'scale(0)'
                            ripple.style.animation = 'ripple 0.6s ease-out'
                            ripple.style.pointerEvents = 'none'
                            
                            button.style.position = 'relative'
                            button.style.overflow = 'hidden'
                            button.appendChild(ripple)
                            
                            setTimeout(() => ripple.remove(), 600)
                            
                            handleToggleAvailability(doctor)
                          }}
                          className={`flex-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold gpu-accelerated touch-manipulation ${
                            isAvailable
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 border border-amber-200'
                              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 border border-green-600'
                          }`}
                          style={{
                            transition: 'transform 0.2s ease-out, background-color 0.2s ease-out',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (window.innerWidth > 640) {
                              e.currentTarget.style.transform = 'scale(1.02) translateZ(0)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1) translateZ(0)'
                          }}
                        >
                          {isAvailable ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Mark Unavailable</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Mark Available</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Ripple effect
                            const button = e.currentTarget
                            const ripple = document.createElement('span')
                            const rect = button.getBoundingClientRect()
                            const size = Math.max(rect.width, rect.height)
                            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - size / 2
                            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top - size / 2
                            
                            ripple.style.width = ripple.style.height = size + 'px'
                            ripple.style.left = x + 'px'
                            ripple.style.top = y + 'px'
                            ripple.style.position = 'absolute'
                            ripple.style.borderRadius = '50%'
                            ripple.style.background = 'rgba(59, 130, 246, 0.3)'
                            ripple.style.transform = 'scale(0)'
                            ripple.style.animation = 'ripple 0.6s ease-out'
                            ripple.style.pointerEvents = 'none'
                            
                            button.style.position = 'relative'
                            button.style.overflow = 'hidden'
                            button.appendChild(ripple)
                            
                            setTimeout(() => ripple.remove(), 600)
                            
                            handleSetLimitClick(doctor)
                          }}
                          className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 gpu-accelerated touch-manipulation"
                          style={{
                            transition: 'transform 0.2s ease-out, background-color 0.2s ease-out',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (window.innerWidth > 640) {
                              e.currentTarget.style.transform = 'scale(1.02) translateZ(0)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1) translateZ(0)'
                          }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                          <span>Set Limit</span>
                        </button>
                      </div>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Availability Status Bar */}
                      <div 
                        className={`w-full rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 gpu-accelerated ${
                          isAvailable 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-orange-50 border border-orange-200'
                        }`}
                        style={{
                          animation: isAvailable ? 'slideInLeft 0.3s ease-out' : 'fadeIn 0.3s ease-out'
                        }}
                      >
                        {isAvailable ? (
                          <>
                            <div 
                              className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 gpu-accelerated"
                              style={{
                                animation: 'pulseGlow 2.5s ease-in-out infinite'
                              }}
                            ></div>
                            <span className="text-[10px] sm:text-xs text-green-700 font-medium flex-1 leading-tight" style={{ fontWeight: 500 }}>
                              Doctor is available and accepting patients.
                            </span>
                          </>
                        ) : (
                          <>
                            <div 
                              className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 gpu-accelerated"
                              style={{
                                animation: 'fadeIn 0.3s ease-out'
                              }}
                            ></div>
                            <span className="text-[10px] sm:text-xs text-orange-700 font-medium flex-1 leading-tight" style={{ fontWeight: 500 }}>
                              Doctor is not available.
                            </span>
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                )
                  })}
                </div>

                {/* Pagination Controls */}
                {doctorsPagination.pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 transition-all duration-300">
                    {/* Pagination Info */}
                    <div className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Showing <span className="font-semibold text-gray-900">
                        {doctors.length > 0 ? ((doctorsPage - 1) * doctorsLimit + 1) : 0}
                      </span> to{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.min(doctorsPage * doctorsLimit, doctorsPagination.total)}
                      </span> of{' '}
                      <span className="font-semibold text-gray-900">{doctorsPagination.total}</span> doctors
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => setDoctorsPage(prev => Math.max(1, prev - 1))}
                        disabled={doctorsPage === 1 || loadingDoctors}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          doctorsPage === 1 || loadingDoctors
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                        }`}
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>

                      {/* Page Info */}
                      <div className="px-4 py-2 text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Page {doctorsPage} of {doctorsPagination.pages}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setDoctorsPage(prev => Math.min(doctorsPagination.pages, prev + 1))}
                        disabled={doctorsPage >= doctorsPagination.pages || loadingDoctors}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          doctorsPage >= doctorsPagination.pages || loadingDoctors
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                        }`}
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loadingDoctors && doctors.length === 0 && (
                  <div className="text-center py-12 transition-all duration-300">
                    <div className="text-gray-400 text-4xl mb-4">🔍</div>
                    <p className="text-gray-600 text-lg font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {doctorsSearch.trim() ? 'No doctors found' : 'No doctors available'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {doctorsSearch.trim() ? 'Try adjusting your search criteria' : 'Please contact admin'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Patient Registration Tab */}
        {activeTab === 'registration' && (
          <div className="space-y-8">
            {/* Registration Form */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Register New Patient</h2>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={getLabelClasses('fullName')}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter full name"
                  autoComplete="name"
                  ref={(el) => (inputRefs.current.fullName = el)}
                  value={formData.fullName}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('fullName')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('fullName')}
                />
                {formErrors.fullName && (
                  <p className="text-xs text-red-600">{formErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('mobileNumber')}>
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  ref={(el) => (inputRefs.current.mobileNumber = el)}
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('mobileNumber')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('mobileNumber')}
                  inputMode="numeric"
                  maxLength={10}
                />
                {formErrors.mobileNumber && (
                  <p className="text-xs text-red-600">{formErrors.mobileNumber}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className={getLabelClasses('address')}>
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="House number, street, city"
                  autoComplete="street-address"
                  ref={(el) => (inputRefs.current.address = el)}
                  value={formData.address}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('address')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('address')}
                />
                {formErrors.address && (
                  <p className="text-xs text-red-600">{formErrors.address}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('age')}>
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  placeholder="e.g. 42"
                  ref={(el) => (inputRefs.current.age = el)}
                  value={formData.age}
                  onChange={handleChange}
                  min="0"
                  max="150"
                  onFocus={() => handleFieldFocus('age')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('age')}
                />
                {formErrors.age && (
                  <p className="text-xs text-red-600">{formErrors.age}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('gender')}>
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  ref={(el) => (inputRefs.current.gender = el)}
                  value={formData.gender}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('gender')}
                  onBlur={handleFieldBlur}
                  className={`${getFieldClasses('gender')} appearance-none pr-10`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.gender && (
                  <p className="text-xs text-red-600">{formErrors.gender}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('doctor')}>
                  Select Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  name="doctor"
                  ref={(el) => (inputRefs.current.doctor = el)}
                  value={formData.doctor}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('doctor')}
                  onBlur={handleFieldBlur}
                  className={`${getFieldClasses('doctor')} appearance-none pr-10`}
                >
                  <option value="">Select a doctor</option>
                  {allDoctors.map((doctor) => {
                    const stats = doctorStats[doctor._id]
                    const slotsInfo = stats ? ` [${stats.remainingSlots} slots left]` : ''
                    const isLimitReached = stats?.isLimitReached
                    const isAvailable = stats?.isAvailable !== undefined ? stats.isAvailable : doctor.isAvailable !== undefined ? doctor.isAvailable : true
                    const isDisabled = isLimitReached || !isAvailable
                    return (
                      <option
                        key={doctor._id}
                        value={doctor._id}
                        disabled={isDisabled}
                      >
                        {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''} {doctor.fees ? `(₹${doctor.fees})` : ''}{slotsInfo}{!isAvailable ? ' - NOT AVAILABLE' : ''}{isLimitReached ? ' - LIMIT REACHED' : ''}
                      </option>
                    )
                  })}
                </select>
                {formErrors.doctor && (
                  <p className="text-xs text-red-600">{formErrors.doctor}</p>
                )}
                {selectedDoctor && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Consultation Fee</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-700">₹{consultationFee || 'Not set'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoctorForFeeEdit(selectedDoctor)
                            setEditFeeValue(selectedDoctor.fees || 0)
                            setShowEditFeeModal(true)
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
                          title="Edit Doctor Fees"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                    {selectedDoctorStats && (
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                        <span className="font-semibold text-slate-600">Today:</span>
                        <span className="font-semibold">
                          {selectedDoctorStats.todayPatientCount} / {selectedDoctorStats.dailyPatientLimit}
                        </span>
                        <span className={selectedDoctorStats.remainingSlots > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          ({selectedDoctorStats.remainingSlots} remaining)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('visitDate')}>
                  Visit Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="visitDate"
                  ref={(el) => (inputRefs.current.visitDate = el)}
                  value={formData.visitDate}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('visitDate')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('visitDate')}
                />
                {formErrors.visitDate && (
                  <p className="text-xs text-red-600">{formErrors.visitDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('visitTime')}>
                  Visit Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="visitTime"
                  ref={(el) => (inputRefs.current.visitTime = el)}
                  value={formData.visitTime}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('visitTime')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('visitTime')}
                />
                {formErrors.visitTime && (
                  <p className="text-xs text-red-600">{formErrors.visitTime}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className={getLabelClasses('disease')}>
                  Disease / Health Issue <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  instanceId="disease-select"
                  classNamePrefix="disease-select"
                  styles={diseaseSelectStyles}
                  ref={(ref) => {
                    inputRefs.current.disease = ref
                  }}
                  value={selectedDiseaseOption}
                  options={diseaseOptions}
                  placeholder={diseasePlaceholder}
                  onFocus={() => handleFieldFocus('disease')}
                  onBlur={handleFieldBlur}
                  onChange={handleDiseaseChange}
                  onCreateOption={handleDiseaseCreate}
                  isClearable
                />
                {formErrors.disease && (
                  <p className="text-xs text-red-600">{formErrors.disease}</p>
                )}
                <p className="text-xs text-slate-500">{diseaseHelperText}</p>
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('bloodPressure')}>
                  Blood Pressure (BP)
                </label>
                <input
                  type="text"
                  name="bloodPressure"
                  placeholder="e.g. 120/80 (Optional)"
                  ref={(el) => (inputRefs.current.bloodPressure = el)}
                  value={formData.bloodPressure}
                  onChange={handleChange}
                  onFocus={() => handleFieldFocus('bloodPressure')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('bloodPressure')}
                />
                {formErrors.bloodPressure && (
                  <p className="text-xs text-red-600">{formErrors.bloodPressure}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className={getLabelClasses('sugarLevel')}>
                  Sugar Level (mg/dL)
                </label>
                <input
                  type="number"
                  name="sugarLevel"
                  placeholder="e.g. 95 (Optional)"
                  ref={(el) => (inputRefs.current.sugarLevel = el)}
                  value={formData.sugarLevel}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  onFocus={() => handleFieldFocus('sugarLevel')}
                  onBlur={handleFieldBlur}
                  className={getFieldClasses('sugarLevel')}
                />
                {formErrors.sugarLevel && (
                  <p className="text-xs text-red-600">{formErrors.sugarLevel}</p>
                )}
              </div>

              {/* Scanner and PDF Upload Section */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex flex-wrap gap-3">
                  {/* Scanner Button */}
                  <button
                    type="button"
                    onClick={showScanner ? stopScanner : startScanner}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
                  >
                    {showScanner ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                        Stop Scanner
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Scan Patient Details
                      </>
                    )}
                  </button>

                  {/* PDF Upload Button */}
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploadingPDF ? 'Uploading...' : uploadedPDF ? 'Change PDF' : 'Upload PDF'}
                    <input
                      ref={pdfFileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handlePDFUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Scanned Data Preview */}
                {scannedData && Object.keys(scannedData).length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-green-800">Scanned Data Preview</span>
                      <button
                        type="button"
                        onClick={() => setScannedData(null)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-green-700 space-y-1">
                      {scannedData.fullName && <p><strong>Name:</strong> {scannedData.fullName}</p>}
                      {scannedData.mobileNumber && <p><strong>Mobile:</strong> {scannedData.mobileNumber}</p>}
                      {scannedData.age && <p><strong>Age:</strong> {scannedData.age}</p>}
                      {scannedData.address && <p><strong>Address:</strong> {scannedData.address}</p>}
                      {scannedData.gender && <p><strong>Gender:</strong> {scannedData.gender}</p>}
                    </div>
                  </div>
                )}

                {/* Uploaded PDF Preview */}
                {uploadedPDF && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-semibold text-purple-800">PDF Uploaded</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeUploadedPDF}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-purple-700">{uploadedPDF.name} ({(uploadedPDF.size / 1024).toFixed(2)} KB)</p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRecheck"
                    checked={formData.isRecheck}
                    onChange={handleChange}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-400"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">Recheck-Up</span>
                    <span className="block text-xs text-slate-500">Check if this is a follow-up visit for the same patient.</span>
                  </span>
                </label>
              </div>

              {!formData.isRecheck ? (
                <div className="md:col-span-2 space-y-4">
                  <label className={getLabelClasses('paymentMethod')}>
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col lg:flex-row gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:p-6 shadow-sm">
                    <div className="flex-1 space-y-4">
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        onFocus={() => handleFieldFocus('paymentMethod')}
                        onBlur={handleFieldBlur}
                        className={`${getFieldClasses('paymentMethod')} font-medium appearance-none pr-10`}
                      >
                        <option value="online">💳 Online Payment (Razorpay)</option>
                        <option value="cash">💵 Cash Payment (Offline)</option>
                      </select>

                      {selectedDoctor && (
                        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Consultation Fee</span>
                            <span className="text-2xl font-bold text-blue-600">₹{consultationFee}</span>
                          </div>
                        </div>
                      )}

                      {isOnlinePayment && selectedDoctor && (
                        <div className="flex flex-col lg:flex-row items-center gap-6 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                          <div className="flex-1 space-y-4">
                            <p className="text-sm font-semibold text-slate-700">Choose Payment Option</p>
                            <button
                              type="button"
                              onClick={createQRCode}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h4v4H3V3zm14 0h4v4h-4V3zM3 17h4v4H3v-4zm14 0h4v4h-4v-4zM7 7h6v6H7V7zm8 8h2v2h-2v-2z" />
                              </svg>
                              Scan QR Code
                            </button>
                            <button
                              type="button"
                              onClick={handlePayment}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              Card / UPI
                            </button>
                            <p className="text-xs text-slate-500">
                              💡 QR Code: Instant payment via UPI apps | Card/UPI: Online payment gateway
                            </p>
                          </div>

                          <div className="flex w-full max-w-[260px] flex-col items-center rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-center shadow-inner">
                            <p className="text-sm font-semibold text-slate-700">Scan to Pay (Demo QR)</p>
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              <img
                                src={demoQrUrl}
                                alt={`Demo payment QR for ₹${consultationFee}`}
                                className="h-44 w-44 rounded-lg object-contain"
                                loading="lazy"
                              />
                            </div>
                            <p className="mt-3 text-xs text-slate-400 italic">*For client presentation purpose only</p>
                            <p className="mt-1 text-sm font-semibold text-slate-600">Amount: ₹{consultationFee}</p>
                          </div>
                        </div>
                      )}

                      {formData.paymentMethod === 'cash' && selectedDoctor && (
                        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">Collect Cash at Counter</p>
                              <p className="text-xs text-slate-500">Confirm payment before completing registration.</p>
                            </div>
                          </div>
                          <div className="rounded-lg border border-emerald-200 bg-white/70 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-600">Amount to Collect</span>
                              <span className="text-xl font-bold text-emerald-700">₹{consultationFee}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 text-center">
                            💡 Click "Register Patient" after receiving cash payment.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-semibold text-emerald-700">
                  ✓ No Consultation Fee Required (Recheck-Up Visit)
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Patient Behavior Rating
                  <span className="text-xs font-normal text-slate-500">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, behaviorRating: star }))}
                      className={`text-3xl transition ${
                        formData.behaviorRating >= star
                          ? 'text-yellow-400 drop-shadow'
                          : 'text-slate-300 hover:text-yellow-300'
                      }`}
                      title={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  {formData.behaviorRating && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, behaviorRating: null }))}
                      className="ml-2 text-xs font-medium text-slate-500 underline hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {formData.behaviorRating === 1 && 'Very argumentative or non-cooperative.'}
                  {formData.behaviorRating === 2 && 'Somewhat argumentative or difficult.'}
                  {formData.behaviorRating === 3 && 'Neutral behavior observed.'}
                  {formData.behaviorRating === 4 && 'Polite and cooperative behavior.'}
                  {formData.behaviorRating === 5 && 'Exceptionally polite and cooperative.'}
                  {!formData.behaviorRating && 'Select stars to rate the patient experience.'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 px-4 py-4 text-lg font-semibold text-white shadow-xl transition duration-200 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {!formData.isRecheck && formData.paymentMethod === 'online' && formData.feeStatus === 'pending' ? (
                <>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Complete Payment First
                </>
              ) : formData.paymentMethod === 'cash' ? (
                <>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Register Patient (Cash Payment)
                </>
              ) : (
                <>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Register Patient
                </>
              )}
            </button>
          </form>
        </div>

            {/* Patients Register Section - Unified with Toggle Tabs */}
            <div id="patients-register-section" className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {/* Section Header with Professional Layout */}
              <div className={`px-6 py-5 border-b transition-colors duration-300 ${
                patientsRegisterView === 'today'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : patientsRegisterView === 'recheck'
                  ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
              }`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Section - Title and Description */}
                  <div className="lg:col-span-3">
                    <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                      <span className={`w-3 h-3 rounded-full ${
                        patientsRegisterView === 'today' ? 'bg-green-500' 
                        : patientsRegisterView === 'recheck' ? 'bg-purple-500'
                        : 'bg-blue-500'
                      }`}></span>
                      Patients Register
                    </h4>
                    <p className="text-sm text-slate-600">
                      {patientsRegisterView === 'today' 
                        ? 'View and manage today\'s new patient registrations' 
                        : patientsRegisterView === 'recheck'
                        ? 'View and manage returning patients for follow-up'
                        : 'Browse complete historical patient records'}
                    </p>
                  </div>

                  {/* Middle Section - Action Button and Search */}
                  <div className="lg:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* View Medical History Button */}
                    <button
                      onClick={() => {
                        setMedicalHistoryPatientId(null)
                        setMedicalHistoryPatientName(null)
                        setMedicalHistoryPatientMobile(null)
                        setShowMedicalHistoryModal(true)
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Medical History
                    </button>
                    
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={patientsRegisterSearch}
                        onChange={(e) => setPatientsRegisterSearch(e.target.value)}
                        placeholder="Search by Patient Name, Token, or Mobile..."
                        className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          patientsRegisterView === 'today'
                            ? 'border-green-300 focus:ring-green-500 focus:border-green-500 bg-white'
                            : patientsRegisterView === 'recheck'
                            ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500 bg-white'
                            : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
                        } ${patientsRegisterSearch ? 'shadow-sm' : ''}`}
                      />
                      {patientsRegisterSearch && (
                        <button
                          onClick={() => setPatientsRegisterSearch('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label="Clear search"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Statistics Pills (Stacked Vertically) */}
                  <div className="lg:col-span-3 flex flex-col gap-2">
                    {/* Patients Today Pill */}
                    <button
                      onClick={() => setPatientsRegisterView('today')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm ${
                        patientsRegisterView === 'today'
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        patientsRegisterView === 'today' ? 'bg-white' : 'bg-green-500'
                      }`}></span>
                      <span className="flex-1 text-left">Patients Today</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        patientsRegisterView === 'today'
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-green-700'
                      }`}>
                        {patientsRegisterSearchDebounced ? filteredTodayPatients.length : todayPatientsCount}
                      </span>
                    </button>

                    {/* Recheck-up Patients Pill */}
                    <button
                      onClick={() => setPatientsRegisterView('recheck')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm ${
                        patientsRegisterView === 'recheck'
                          ? 'bg-purple-600 text-white shadow-md hover:bg-purple-700'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        patientsRegisterView === 'recheck' ? 'bg-white' : 'bg-purple-500'
                      }`}></span>
                      <span className="flex-1 text-left">Recheck-up Patients</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        patientsRegisterView === 'recheck'
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-purple-700'
                      }`}>
                        {patientsRegisterSearchDebounced ? filteredTodayPatients.filter(p => p.isRecheck).length : recheckPatientsCount}
                      </span>
                    </button>

                    {/* Patient History Pill */}
                    <button
                      onClick={() => setPatientsRegisterView('history')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm ${
                        patientsRegisterView === 'history'
                          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        patientsRegisterView === 'history' ? 'bg-white' : 'bg-blue-500'
                      }`}></span>
                      <span className="flex-1 text-left">Patient History</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        patientsRegisterView === 'history'
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-blue-700'
                      }`}>
                        {patientsRegisterSearchDebounced ? filteredPatientHistory.length : historyPatientsCount}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Patients Today & Recheck-up View */}
              {(patientsRegisterView === 'today' || patientsRegisterView === 'recheck') && (
                <div className="fade-enter">
                  {loadingPatients ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-4 text-slate-500">Loading patients...</p>
                    </div>
                  ) : filteredTodayPatients.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-3-3H5a3 3 0 00-3 3v2h5m6 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-6 0H9" />
                        </svg>
                      </div>
                      <p className="text-lg font-bold text-slate-700 mb-2">
                        {patientsRegisterSearchDebounced 
                          ? 'No patients found matching your search' 
                          : patientsRegisterView === 'recheck'
                          ? 'No recheck-up patients registered today'
                          : 'No patients registered today'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {patientsRegisterSearchDebounced 
                          ? 'Try adjusting your search terms' 
                          : patientsRegisterView === 'recheck'
                          ? 'Returning patients for follow-up will appear here.'
                          : 'New patient registrations will appear here.'}
                      </p>
                    </div>
                  ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-green-100">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">#</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Patient</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Doctor Profile</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Issue</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Token</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Date</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Time</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-green-100">
                        {paginatedTodayPatients.map((patient, index) => {
                          const { dateLabel, timeLabel } = getDateTimeLabels(patient.registrationDate)
                          const globalIndex = todayPatientsStartIndex + index
                          const displayIndex = filteredTodayPatients.length - globalIndex
                          return (
                            <tr key={patient._id} className="bg-green-50/30 hover:bg-green-50/50 transition border-l-4 border-green-400">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                                  {String(displayIndex).padStart(2, '0')}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-slate-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                  <span>{patient.fullName}</span>
                                  {patient.isRecheck && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wide border border-purple-200">
                                      🔄 Recheck-Up
                                    </span>
                                  )}
                                  <span className="hidden sm:inline text-xs uppercase tracking-wide text-slate-400">•</span>
                                  <span className="text-sm text-slate-600 font-normal">Age {patient.age}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Mobile: {patient.mobileNumber || '—'}</p>
                                <div className="flex items-center gap-2 mt-1">
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
                              </td>
                              <td className="px-6 py-4">
                                {patient.doctor ? (
                                  <div className="flex items-center gap-3">
                                    {/* Doctor Profile Image */}
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-md border-2 border-white overflow-hidden">
                                        {patient.doctor.profileImage ? (
                                          <img 
                                            src={patient.doctor.profileImage} 
                                            alt={patient.doctor.fullName || 'Doctor'} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              // Fallback to initials if image fails to load
                                              e.target.style.display = 'none'
                                              const fallback = e.target.parentElement.querySelector('.doctor-profile-fallback')
                                              if (fallback) fallback.style.display = 'flex'
                                            }}
                                          />
                                        ) : null}
                                        <span 
                                          className={`doctor-profile-fallback text-sm font-bold text-white ${patient.doctor.profileImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                                          style={{ fontSize: '14px', fontWeight: 700 }}
                                        >
                                          {(patient.doctor.fullName || 'D').charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Doctor Name and Specialization */}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold text-slate-900 truncate">{patient.doctor.fullName || 'N/A'}</div>
                                      <div className="text-xs text-slate-500 truncate">{patient.doctor.specialization || '—'}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm font-semibold text-slate-400">N/A</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  {patient.disease || 'Not specified'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full font-bold text-sm border border-green-200 shadow-sm">
                                  #{patient.tokenNumber}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {dateLabel}
                                </div>
                              </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{timeLabel}</span>
                            </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                  patient.status === 'completed'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : patient.status === 'in-progress'
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    : patient.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  <span className={`w-2 h-2 rounded-full ${
                                    patient.status === 'completed' ? 'bg-green-500'
                                    : patient.status === 'in-progress' ? 'bg-yellow-500'
                                    : patient.status === 'cancelled' ? 'bg-red-500'
                                    : 'bg-slate-400'
                                  }`}></span>
                                  {patient.status === 'completed'
                                    ? 'Completed'
                                    : patient.status === 'in-progress'
                                    ? 'In Progress'
                                    : patient.status === 'cancelled'
                                    ? 'Cancelled'
                                    : 'Waiting'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setMedicalHistoryPatientId(patient._id)
                                      setMedicalHistoryPatientName(patient.fullName)
                                      setMedicalHistoryPatientMobile(patient.mobileNumber)
                                      setShowMedicalHistoryModal(true)
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View History
                                  </button>
                                  {!patient.isCancelled && patient.status !== 'cancelled' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleCancelClick(patient)
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {todayPatientsTotalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Results Info */}
                        <div className="text-sm text-slate-600">
                          Showing <span className="font-semibold text-slate-900">{todayPatientsStartIndex + 1}</span> to{' '}
                          <span className="font-semibold text-slate-900">
                            {Math.min(todayPatientsEndIndex, filteredTodayPatients.length)}
                          </span>{' '}
                          of <span className="font-semibold text-slate-900">{filteredTodayPatients.length}</span> patients
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-2">
                          {/* Previous Button */}
                          <button
                            onClick={() => handleTodayPatientsPageChange(todayPatientsPage - 1)}
                            disabled={todayPatientsPage === 1}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              todayPatientsPage === 1
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-white text-slate-700 hover:bg-green-50 hover:text-green-700 border border-slate-300 hover:border-green-300 shadow-sm'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                          </button>

                          {/* Page Numbers */}
                          <div className="flex items-center gap-1">
                            {getVisiblePageNumbers().map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                                  ...
                                </span>
                              ) : (
                                <button
                                  key={page}
                                  onClick={() => handleTodayPatientsPageChange(page)}
                                  className={`min-w-[2.5rem] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    todayPatientsPage === page
                                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md border border-green-700'
                                      : 'bg-white text-slate-700 hover:bg-green-50 hover:text-green-700 border border-slate-300 hover:border-green-300 shadow-sm'
                                  }`}
                                >
                                  {page}
                                </button>
                              )
                            ))}
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => handleTodayPatientsPageChange(todayPatientsPage + 1)}
                            disabled={todayPatientsPage === todayPatientsTotalPages}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              todayPatientsPage === todayPatientsTotalPages
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-white text-slate-700 hover:bg-green-50 hover:text-green-700 border border-slate-300 hover:border-green-300 shadow-sm'
                            }`}
                          >
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              )}

              {/* Patient History View */}
              {patientsRegisterView === 'history' && (
                <div className="fade-enter">
                  {filteredPatientHistory.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-slate-700 mb-2">
                        {patientsRegisterSearchDebounced 
                          ? 'No patient records found matching your search' 
                          : 'No patient history available'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {patientsRegisterSearchDebounced 
                          ? 'Try adjusting your search terms' 
                          : 'Historical patient records will appear here.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">#</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Patient</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Doctor</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Issue</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Token</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Date</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Time</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {paginatedPatientHistory.map((patient, index) => {
                              const { dateLabel, timeLabel } = getDateTimeLabels(patient.registrationDate || patient.createdAt)
                              const globalIndex = patientHistoryStartIndex + index
                              const displayIndex = filteredPatientHistory.length - globalIndex
                              return (
                                <tr key={patient._id} className="hover:bg-green-50/40 transition border border-slate-200">
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                                      {String(displayIndex).padStart(2, '0')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                      <span>{patient.fullName}</span>
                                      {patient.isRecheck && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wide border border-purple-200">
                                          🔄 Recheck-Up
                                        </span>
                                      )}
                                      <span className="hidden sm:inline text-xs uppercase tracking-wide text-slate-400">•</span>
                                      <span className="text-sm text-slate-600 font-normal">Age {patient.age}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Mobile: {patient.mobileNumber || '—'}</p>
                                    <div className="flex items-center gap-2 mt-1">
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
                                  </td>
                                  <td className="px-6 py-4 border-r border-slate-200">
                                    {patient.doctor ? (
                                      <div className="flex items-center gap-3">
                                        {/* Doctor Profile Image */}
                                        <div className="flex-shrink-0">
                                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-md border-2 border-white overflow-hidden">
                                            {patient.doctor.profileImage ? (
                                              <img 
                                                src={patient.doctor.profileImage} 
                                                alt={patient.doctor.fullName || 'Doctor'} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  // Fallback to initials if image fails to load
                                                  e.target.style.display = 'none'
                                                  const fallback = e.target.parentElement.querySelector('.doctor-profile-fallback-history')
                                                  if (fallback) fallback.style.display = 'flex'
                                                }}
                                              />
                                            ) : null}
                                            <span 
                                              className={`doctor-profile-fallback-history text-sm font-bold text-white ${patient.doctor.profileImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
                                              style={{ fontSize: '14px', fontWeight: 700 }}
                                            >
                                              {(patient.doctor.fullName || 'D').charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        </div>
                                        {/* Doctor Name and Specialization */}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-semibold text-slate-900 truncate">{patient.doctor.fullName || 'N/A'}</div>
                                          <div className="text-xs text-slate-500 truncate">{patient.doctor.specialization || '—'}</div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm font-semibold text-slate-400">N/A</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-200">
                                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                      {patient.disease || 'Not specified'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full font-bold text-sm border border-blue-200 shadow-sm">
                                      #{patient.tokenNumber}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {dateLabel}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>{timeLabel}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                      patient.status === 'completed'
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : patient.status === 'in-progress'
                                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        : patient.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      <span className={`w-2 h-2 rounded-full ${
                                        patient.status === 'completed' ? 'bg-green-500'
                                        : patient.status === 'in-progress' ? 'bg-yellow-500'
                                        : patient.status === 'cancelled' ? 'bg-red-500'
                                        : 'bg-slate-400'
                                      }`}></span>
                                      {patient.status === 'completed'
                                        ? 'Completed'
                                        : patient.status === 'in-progress'
                                        ? 'In Progress'
                                        : patient.status === 'cancelled'
                                        ? 'Cancelled'
                                        : 'Waiting'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => {
                                          setMedicalHistoryPatientId(patient._id)
                                          setMedicalHistoryPatientName(patient.fullName)
                                          setMedicalHistoryPatientMobile(patient.mobileNumber)
                                          setShowMedicalHistoryModal(true)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        View History
                                      </button>
                                      <button
                                        onClick={() => handleDownloadPatientReport(patient)}
                                        disabled={downloadingReport === patient._id}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                          downloadingReport === patient._id
                                            ? 'text-gray-500 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                            : 'text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300'
                                        }`}
                                        title="Download Patient History Report"
                                      >
                                        {downloadingReport === patient._id ? (
                                          <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download Report
                                          </>
                                        )}
                                      </button>
                                      {!patient.isCancelled && patient.status !== 'cancelled' && (
                                        <button
                                          onClick={() => handleCancelClick(patient)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-colors"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {patientHistoryTotalPages > 1 && (
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Results Info */}
                            <div className="text-sm text-slate-600">
                              Showing <span className="font-semibold text-slate-900">{patientHistoryStartIndex + 1}</span> to{' '}
                              <span className="font-semibold text-slate-900">
                                {Math.min(patientHistoryEndIndex, filteredPatientHistory.length)}
                              </span>{' '}
                              of <span className="font-semibold text-slate-900">{filteredPatientHistory.length}</span> records
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-2">
                              {/* Previous Button */}
                              <button
                                onClick={() => handlePatientHistoryPageChange(patientHistoryPage - 1)}
                                disabled={patientHistoryPage === 1}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                  patientHistoryPage === 1
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-300 hover:border-purple-300 shadow-sm'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous
                              </button>

                              {/* Page Numbers */}
                              <div className="flex items-center gap-1">
                                {getVisibleHistoryPageNumbers().map((page, idx) => (
                                  page === '...' ? (
                                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                                      ...
                                    </span>
                                  ) : (
                                    <button
                                      key={page}
                                      onClick={() => handlePatientHistoryPageChange(page)}
                                      className={`min-w-[2.5rem] px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                                        patientHistoryPage === page
                                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-700'
                                          : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-300 hover:border-purple-300 shadow-sm'
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  )
                                ))}
                              </div>

                              {/* Next Button */}
                              <button
                                onClick={() => handlePatientHistoryPageChange(patientHistoryPage + 1)}
                                disabled={patientHistoryPage === patientHistoryTotalPages}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                  patientHistoryPage === patientHistoryTotalPages
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-300 hover:border-purple-300 shadow-sm'
                                }`}
                              >
                                Next
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              )}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'emergency' && (
          <div className="space-y-8">
            {/* Emergency Patient Registration Form */}
            <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-2xl shadow-xl border-2 border-red-200 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-red-700">Emergency Patient Registration</h2>
                  <p className="text-sm text-red-600 mt-1">Quick registration for critical cases - bypasses daily limits</p>
                </div>
              </div>

              <form onSubmit={handleEmergencySubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={emergencyFormData.fullName}
                      onChange={(e) => setEmergencyFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter patient name"
                      className="w-full px-4 py-3 text-sm font-medium rounded-lg border-2 border-red-200 bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required
                    />
                    {emergencyFormErrors.fullName && (
                      <p className="text-xs text-red-600">{emergencyFormErrors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={emergencyFormData.age}
                      onChange={(e) => setEmergencyFormData(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="e.g. 42"
                      min="0"
                      max="150"
                      className="w-full px-4 py-3 text-sm font-medium rounded-lg border-2 border-red-200 bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required
                    />
                    {emergencyFormErrors.age && (
                      <p className="text-xs text-red-600">{emergencyFormErrors.age}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={emergencyFormData.gender}
                      onChange={(e) => setEmergencyFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-3 text-sm font-medium rounded-lg border-2 border-red-200 bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all appearance-none"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {emergencyFormErrors.gender && (
                      <p className="text-xs text-red-600">{emergencyFormErrors.gender}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Select Doctor <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="doctor"
                      value={emergencyFormData.doctor}
                      onChange={(e) => {
                        const selectedDoc = allDoctors.find(d => d._id === e.target.value)
                        setEmergencyFormData(prev => ({
                          ...prev,
                          doctor: e.target.value,
                          fees: selectedDoc?.fees || prev.fees || ''
                        }))
                      }}
                      className="w-full px-4 py-3 text-sm font-medium rounded-lg border-2 border-red-200 bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all appearance-none"
                      required
                    >
                      <option value="">Select a doctor</option>
                      {allDoctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''} {doctor.fees ? `(₹${doctor.fees})` : ''}
                        </option>
                      ))}
                    </select>
                    {emergencyFormErrors.doctor && (
                      <p className="text-xs text-red-600">{emergencyFormErrors.doctor}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Consultation Fees (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="fees"
                      value={emergencyFormData.fees}
                      onChange={(e) => setEmergencyFormData(prev => ({ ...prev, fees: e.target.value }))}
                      placeholder="Enter consultation fee"
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 text-sm font-medium rounded-lg border-2 border-red-200 bg-white text-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required
                    />
                    {emergencyFormErrors.fees && (
                      <p className="text-xs text-red-600">{emergencyFormErrors.fees}</p>
                    )}
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-800 mb-1">Emergency Registration Notice</p>
                      <p className="text-xs text-red-700">
                        Emergency patients bypass daily patient limits and are immediately visible to doctors.
                        This form registers critical cases that require immediate attention.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full group relative flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-600 via-red-700 to-red-600 px-6 py-4 text-lg font-bold text-white shadow-xl transition duration-200 hover:from-red-700 hover:via-red-800 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transform hover:scale-[1.02]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Register Emergency Patient
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-8">
            {/* Doctor Availability Section */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-6 border-b border-green-100">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Doctor Availability</h2>
                <p className="text-gray-600">View real-time availability and schedule appointments</p>
              </div>

              {/* Filters */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filter by Specialty */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Specialty
                    </label>
                    <select
                      value={availabilityFilterSpecialty}
                      onChange={(e) => setAvailabilityFilterSpecialty(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    >
                      <option value="all">All Specialties</option>
                      {[...new Set(allDoctors.map(doc => doc.specialization).filter(Boolean))].sort().map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Doctor */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Doctor
                    </label>
                    <select
                      value={availabilityFilterDoctor}
                      onChange={(e) => setAvailabilityFilterDoctor(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    >
                      <option value="all">All Doctors</option>
                      {allDoctors.map(doctor => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filter by Date
                    </label>
                    <input
                      type="date"
                      value={availabilityFilterDate}
                      onChange={(e) => setAvailabilityFilterDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                      placeholder="dd-mm-yyyy"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Cards Grid */}
              <div className="p-6">
                {(() => {
                  // Filter doctors based on selected filters
                  let filteredDoctors = allDoctors.filter(doctor => {
                    const stats = doctorStats[doctor._id] || {}
                    const isAvailable = stats.isAvailable !== undefined ? stats.isAvailable : doctor.isAvailable !== undefined ? doctor.isAvailable : true
                    
                    // Specialty filter
                    if (availabilityFilterSpecialty !== 'all' && doctor.specialization !== availabilityFilterSpecialty) {
                      return false
                    }
                    
                    // Doctor filter
                    if (availabilityFilterDoctor !== 'all' && doctor._id !== availabilityFilterDoctor) {
                      return false
                    }
                    
                    // Date filter (check if doctor is available on selected date)
                    if (availabilityFilterDate) {
                      if (!isDateAvailable(availabilityFilterDate, doctor)) {
                        return false
                      }
                    }
                    
                    return true
                  })

                  // Calculate pagination
                  const totalDoctors = filteredDoctors.length
                  const totalPages = Math.ceil(totalDoctors / availabilityPerPage)
                  const startIndex = (availabilityPage - 1) * availabilityPerPage
                  const endIndex = startIndex + availabilityPerPage
                  const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex)

                  // Get unique specializations for filtering
                  const specializations = [...new Set(allDoctors.map(doc => doc.specialization).filter(Boolean))]

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedDoctors.map((doctor) => {
                        const stats = doctorStats[doctor._id] || {}
                        const isAvailable = stats.isAvailable !== undefined ? stats.isAvailable : doctor.isAvailable !== undefined ? doctor.isAvailable : true
                        const schedule = doctor.weeklySchedule || {}
                        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        const availableDays = dayNames
                          .map((day, index) => ({ day, label: dayLabels[index], available: schedule[day] !== false }))
                          .filter(d => d.available)
                          .map(d => d.label)

                        const visitingHours = doctor.visitingHours || {}
                        const hasTimeSlots = Object.values(visitingHours).some(period => period?.enabled)

                        return (
                          <div
                            key={doctor._id}
                            className="bg-white border border-gray-200 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col h-full"
                          >
                            {/* Profile Image - Centered, Circular, Medium Size, Soft Shadow */}
                            <div className="flex justify-center mb-2">
                              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white overflow-hidden">
                                {doctor.profileImage ? (
                                  <img
                                    src={doctor.profileImage}
                                    alt={doctor.fullName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  doctor.fullName.charAt(0).toUpperCase()
                                )}
                              </div>
                            </div>

                            {/* Doctor Name - Bold, Centered, Larger Font */}
                            <div className="text-center mb-1.5">
                              <h3 className="text-base font-bold text-gray-900 leading-tight">{doctor.fullName}</h3>
                            </div>

                            {/* Specialty & Degree - Centered, Clear Hierarchy */}
                            <div className="text-center mb-2">
                              {doctor.specialization && (
                                <p className="text-xs font-semibold text-blue-600">{doctor.specialization}</p>
                              )}
                              {doctor.qualification && (
                                <p className="text-xs font-medium text-gray-500">{doctor.qualification}</p>
                              )}
                            </div>

                            {/* Availability Indicator */}
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className={`text-xs font-semibold ${isAvailable ? 'text-green-700' : 'text-red-700'}`}>
                                {isAvailable ? 'Available Today' : 'Not Available'}
                              </span>
                            </div>

                            {/* Next Available Date/Time for Unavailable Doctors - Highlighted Box */}
                            {!isAvailable && (() => {
                              const nextAvailable = getNextAvailableDate(doctor)
                              
                              if (nextAvailable) {
                                const dayName = nextAvailable.dateObj.toLocaleDateString('en-US', { weekday: 'long' })
                                const formattedDate = nextAvailable.dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                                
                                // Get time range
                                let timeRange = ''
                                if (nextAvailable.timeSlots && nextAvailable.timeSlots.length > 0) {
                                  const firstSlot = formatTime12Hour(nextAvailable.timeSlots[0])
                                  const lastSlot = formatTime12Hour(nextAvailable.timeSlots[nextAvailable.timeSlots.length - 1])
                                  timeRange = `${firstSlot} – ${lastSlot}`
                                } else {
                                  // Fallback to first enabled period's time range
                                  const visitingHours = doctor.visitingHours || {}
                                  const periods = ['morning', 'afternoon', 'evening']
                                  for (const period of periods) {
                                    const periodHours = visitingHours[period]
                                    if (periodHours?.enabled && periodHours.start && periodHours.end) {
                                      timeRange = `${formatTime12Hour(periodHours.start)} – ${formatTime12Hour(periodHours.end)}`
                                      break
                                    }
                                  }
                                }
                                
                                return (
                                  <div className="mb-2 p-1.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <p className="text-xs font-bold text-blue-900 mb-0.5">Next Available:</p>
                                    <p className="text-xs font-semibold text-blue-700 leading-tight">
                                      {dayName}, {formattedDate}
                                      {timeRange && ` | ${timeRange}`}
                                    </p>
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="mb-2 p-1.5 bg-orange-50 border-2 border-orange-200 rounded-lg">
                                    <p className="text-xs font-medium text-orange-700">
                                      No upcoming availability found
                                    </p>
                                  </div>
                                )
                              }
                            })()}

                            {/* Available Days - Small Rounded Tags in Single Row */}
                            {availableDays.length > 0 && (
                              <div className="mb-2">
                                <div className="flex flex-wrap justify-center gap-1">
                                  {availableDays.map(day => (
                                    <span 
                                      key={day} 
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200"
                                    >
                                      {day}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Warning Text - Subtle Orange */}
                            {!hasTimeSlots && isAvailable && (
                              <p className="text-xs text-orange-600 text-center mb-2 font-medium">No time slots configured</p>
                            )}

                            {/* Book Appointment Button - Full Width, Rounded, Elevated Shadow */}
                            <button
                              onClick={() => {
                                setSelectedDoctorForAppointment(doctor)
                                
                                // Always get next available date and time for unavailable doctors
                                let appointmentDate = null
                                let appointmentTime = null
                                
                                if (!isAvailable) {
                                  // For unavailable doctors, always use next available date
                                  const nextAvailable = getNextAvailableDate(doctor)
                                  if (nextAvailable) {
                                    // Always set to next available date (format: YYYY-MM-DD)
                                    appointmentDate = nextAvailable.date
                                    
                                    // Set time to first available slot of that day (format: HH:MM)
                                    if (nextAvailable.timeSlots && nextAvailable.timeSlots.length > 0) {
                                      // Use first time slot from available slots
                                      appointmentTime = nextAvailable.timeSlots[0]
                                    } else {
                                      // Fallback: Use first enabled period's start time
                                      const visitingHours = doctor.visitingHours || {}
                                      const periods = ['morning', 'afternoon', 'evening']
                                      for (const period of periods) {
                                        const periodHours = visitingHours[period]
                                        if (periodHours?.enabled && periodHours.start) {
                                          appointmentTime = periodHours.start // Format: HH:MM
                                          break
                                        }
                                      }
                                    }
                                    
                                    const dayName = nextAvailable.dateObj.toLocaleDateString('en-US', { weekday: 'long' })
                                    const formattedDate = nextAvailable.dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                                    const timeDisplay = appointmentTime ? formatTime12Hour(appointmentTime) : 'available time'
                                    
                                    toast.success(`Appointment pre-filled for ${dayName}, ${formattedDate} at ${timeDisplay}`, {
                                      duration: 3000
                                    })
                                  } else {
                                    toast.error('No available dates found for this doctor. Please contact admin.', {
                                      duration: 4000
                                    })
                                    return // Don't proceed if no availability found
                                  }
                                } else {
                                  // For available doctors, use default date if no date selected
                                  if (!appointmentForm.appointmentDate) {
                                    appointmentDate = getDefaultAppointmentDate()
                                  }
                                  // If no time selected, use default
                                  if (!appointmentForm.appointmentTime) {
                                    appointmentTime = getDefaultAppointmentTime()
                                  }
                                }
                                
                                // Update form with pre-filled values (editable fields)
                                // Date format: YYYY-MM-DD (required by HTML date input)
                                // Time format: HH:MM (required by HTML time input/select)
                                setAppointmentForm(prev => ({ 
                                  ...prev, 
                                  doctor: doctor._id, // Pre-select doctor
                                  appointmentDate: appointmentDate || prev.appointmentDate || getDefaultAppointmentDate(), // Auto-fill date (editable)
                                  appointmentTime: appointmentTime || prev.appointmentTime || getDefaultAppointmentTime() // Auto-fill time (editable)
                                }))
                                
                                // Scroll to appointment form
                                setTimeout(() => {
                                  document.getElementById('schedule-appointment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }, 100)
                              }}
                              className="mt-auto w-full py-1.5 rounded-lg font-semibold text-xs transition-all duration-200 bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-xl transform hover:scale-[1.02]"
                            >
                              Book Appointment
                            </button>
                          </div>
                        )
                      })}
                      </div>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="mt-6 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                              <span className="font-semibold">
                                {Math.min(endIndex, totalDoctors)}
                              </span>{' '}
                              of <span className="font-semibold">{totalDoctors}</span> doctors
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newPage = availabilityPage - 1
                                  setAvailabilityPage(newPage)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                disabled={availabilityPage === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Previous
                              </button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum
                                  if (totalPages <= 5) {
                                    pageNum = i + 1
                                  } else if (availabilityPage <= 3) {
                                    pageNum = i + 1
                                  } else if (availabilityPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                  } else {
                                    pageNum = availabilityPage - 2 + i
                                  }
                                  
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => {
                                        setAvailabilityPage(pageNum)
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                      }}
                                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        availabilityPage === pageNum
                                          ? 'bg-green-600 text-white'
                                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  )
                                })}
                              </div>
                              <button
                                onClick={() => {
                                  const newPage = availabilityPage + 1
                                  setAvailabilityPage(newPage)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                disabled={availabilityPage >= totalPages}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}

                {allDoctors.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No doctors available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Appointment Form */}
            <div id="schedule-appointment-form" className="bg-white rounded-lg shadow p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Schedule Appointment</h2>

              <form onSubmit={handleScheduleAppointment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      name="patientName"
                      value={appointmentForm.patientName}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={appointmentForm.mobileNumber}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={appointmentForm.email}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Doctor *
                    </label>
                    <select
                      name="doctor"
                      value={appointmentForm.doctor}
                      onChange={handleAppointmentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    >
                      <option value="">Select a doctor</option>
                      {allDoctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Date *
                    </label>
                    <input
                      type="date"
                      name="appointmentDate"
                      value={appointmentForm.appointmentDate}
                      onChange={handleAppointmentChange}
                      min={getDefaultAppointmentDate()}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none ${
                        selectedAppointmentDoctor && appointmentForm.appointmentDate && !isDateAvailable(appointmentForm.appointmentDate, selectedAppointmentDoctor)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      required
                    />
                    {selectedAppointmentDoctor && (
                      <div className="mt-2 space-y-1">
                        {availableWeekdays.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-green-700">Available on:</span>
                            <div className="flex flex-wrap gap-1">
                              {availableWeekdays.map((day, index) => (
                                <span
                                  key={day}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                                >
                                  {day}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠️ No available days configured for this doctor
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {availableDates.length > 0 
                            ? `${availableDates.length} available date${availableDates.length !== 1 ? 's' : ''} in the next 30 days`
                            : 'No available dates in the next 30 days'}
                        </p>
                        {appointmentForm.appointmentDate && !isDateAvailable(appointmentForm.appointmentDate, selectedAppointmentDoctor) && (
                          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-xs text-red-600 font-medium mb-2">
                              ⚠️ Selected date is not available for this doctor.
                            </p>
                            {nextAvailableDates.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-700 font-medium">
                                  Next available on:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {nextAvailableDates.map((dateStr) => {
                                    const date = new Date(dateStr)
                                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
                                    const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                                    return (
                                      <button
                                        key={dateStr}
                                        type="button"
                                        onClick={() => {
                                          setAppointmentForm(prev => ({ ...prev, appointmentDate: dateStr }))
                                          toast.success(`Appointment date updated to ${dayName}, ${formattedDate}`)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        {dayName}, {formattedDate}
                                      </button>
                                    )
                                  })}
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                  Click a date above to update the appointment
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600">
                                No available dates found in the next 60 days. Please contact the doctor or admin.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {!selectedAppointmentDoctor && (
                      <p className="mt-1 text-xs text-gray-500">We schedule visits from the next calendar day by default.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Time *
                    </label>
                    {selectedAppointmentDoctor ? (
                      <>
                        {appointmentForm.appointmentDate && isDateAvailable(appointmentForm.appointmentDate, selectedAppointmentDoctor) ? (
                          availableTimeSlots.length > 0 ? (
                            <>
                              <select
                                name="appointmentTime"
                                value={appointmentForm.appointmentTime}
                                onChange={handleAppointmentChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                required
                              >
                                <option value="">Select available time</option>
                                {availableTimeSlots.map((slot) => (
                                  <option key={slot} value={slot}>
                                    {formatTime12Hour(slot)}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-1 text-xs text-green-600 font-medium">
                                ✓ {availableTimeSlots.length} available time slot{availableTimeSlots.length !== 1 ? 's' : ''} for {new Date(appointmentForm.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                              </p>
                            </>
                          ) : (
                            <>
                              <input
                                type="time"
                                name="appointmentTime"
                                value={appointmentForm.appointmentTime}
                                onChange={handleAppointmentChange}
                                className="w-full px-4 py-2 border border-orange-300 bg-orange-50 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                required
                                disabled
                              />
                              <p className="mt-1 text-xs text-red-600 font-medium">
                                ⚠️ No time slots configured for this doctor on the selected date. Please configure visiting hours or select another date.
                              </p>
                            </>
                          )
                        ) : (
                          <>
                            <input
                              type="time"
                              name="appointmentTime"
                              value={appointmentForm.appointmentTime}
                              onChange={handleAppointmentChange}
                              className="w-full px-4 py-2 border border-red-300 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                              required
                              disabled
                            />
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              ⚠️ Please select an available date first to see time slots.
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <input
                        type="time"
                        name="appointmentTime"
                        value={appointmentForm.appointmentTime}
                        onChange={handleAppointmentChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        required
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Appointment
                    </label>
                    <input
                      type="text"
                      name="reason"
                      value={appointmentForm.reason}
                      onChange={handleAppointmentChange}
                      placeholder="e.g., Routine checkup, Follow-up, Consultation"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={appointmentForm.notes}
                      onChange={handleAppointmentChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Any additional notes..."
                    ></textarea>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                >
                  Schedule Next-Day Appointment & Send SMS
                </button>
              </form>
            </div>

            {/* Appointments List */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">All Appointments</h3>
                    <p className="text-sm text-slate-600 mt-1">View today's appointments and upcoming scheduled visits</p>
                  </div>
                  {/* Search Bar and Toggle Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:flex-initial sm:w-80">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={appointmentsSearch}
                          onChange={(e) => setAppointmentsSearch(e.target.value)}
                          placeholder="Search by Patient Name, Token, or Mobile..."
                          className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 border-slate-300 focus:ring-blue-500 focus:border-blue-500 bg-white/90 ${appointmentsSearch ? 'shadow-sm' : ''}`}
                        />
                        {appointmentsSearch && (
                          <button
                            onClick={() => setAppointmentsSearch('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Clear search"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Toggle Buttons */}
                    <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAppointmentsView('today')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm border ${
                        appointmentsView === 'today'
                          ? 'bg-green-50 text-green-700 border-green-300 shadow-md'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                      }`}
                    >
                      <span className="text-lg">🟢</span>
                      <span>Today's Patients</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        appointmentsView === 'today'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {appointmentsSearchDebounced ? filteredTodayAppointments.length : todayAppointments.length}
                      </span>
                      <span className="text-xs opacity-75">appointments</span>
                    </button>
                    <button
                      onClick={() => setAppointmentsView('upcoming')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm border ${
                        appointmentsView === 'upcoming'
                          ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-md'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-lg">🔵</span>
                      <span>Upcoming Patients</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        appointmentsView === 'upcoming'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {appointmentsSearchDebounced ? filteredUpcomingAppointments.length : upcomingAppointments.length}
                      </span>
                      <span className="text-xs opacity-75">appointments</span>
                    </button>
                  </div>
                </div>
              </div>
              </div>

              {loadingAppointments ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-slate-500">Loading appointments...</p>
                </div>
              ) : (
                <>
                  {/* Today's Patients Section */}
                  {appointmentsView === 'today' && (
                    <div>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3 border-b border-green-200">
                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-green-600">🟢</span>
                          Today's Patients
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold ml-2">
                            {appointmentsSearchDebounced ? filteredTodayAppointments.length : todayAppointments.length} appointment{(appointmentsSearchDebounced ? filteredTodayAppointments.length : todayAppointments.length) !== 1 ? 's' : ''}
                          </span>
                        </h4>
                      </div>
                    {filteredTodayAppointments.length === 0 ? (
                      <div className="text-center py-12 px-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-slate-700 mb-2">
                          {appointmentsSearchDebounced 
                            ? 'No appointments found matching your search' 
                            : 'No appointments scheduled for today'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {appointmentsSearchDebounced 
                            ? 'Try adjusting your search terms' 
                            : 'Schedule new appointments to see them here.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-green-100">
                          <thead className="bg-green-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">#</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Date</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Time</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Patient</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Doctor</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Reason</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">SMS</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-green-100">
                            {filteredTodayAppointments.map((appointment, index) => {
                              const { dateLabel, timeLabel } = getAppointmentLabels(appointment.appointmentDate, appointment.appointmentTime)
                              return (
                                <tr key={appointment._id} className="bg-green-50/30 hover:bg-green-50/50 transition border-l-4 border-green-400">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                                      {String(index + 1).padStart(2, '0')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {dateLabel}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {timeLabel}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-slate-900">{appointment.patientName}</div>
                                    <div className="text-xs text-slate-500 mt-1">{appointment.mobileNumber}</div>
                                    {appointment.email && (
                                      <div className="text-xs text-slate-400 truncate max-w-xs">{appointment.email}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-slate-900">{appointment.doctor?.fullName || 'N/A'}</div>
                                    <div className="text-xs text-slate-500">{appointment.doctor?.specialization || '—'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      {appointment.reason || 'General consultation'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                      appointment.status === 'completed'
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : appointment.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : appointment.status === 'confirmed'
                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>
                                      <span className={`w-2 h-2 rounded-full ${
                                        appointment.status === 'completed' ? 'bg-green-500'
                                        : appointment.status === 'cancelled' ? 'bg-red-500'
                                        : appointment.status === 'confirmed' ? 'bg-blue-500'
                                        : 'bg-yellow-500'
                                      }`}></span>
                                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {appointment.smsSent ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Sent
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleResendSMS(appointment._id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Resend
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                      onClick={() => handleCancelAppointment(appointment)}
                                      disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        appointment.status === 'cancelled' || appointment.status === 'completed'
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                      }`}
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </div>
                  )}

                  {/* Upcoming Patients Section */}
                  {appointmentsView === 'upcoming' && (
                    <div>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 border-b border-blue-200">
                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-blue-600">🔵</span>
                          Upcoming Patients
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold ml-2">
                            {appointmentsSearchDebounced ? filteredUpcomingAppointments.length : upcomingAppointments.length} appointment{(appointmentsSearchDebounced ? filteredUpcomingAppointments.length : upcomingAppointments.length) !== 1 ? 's' : ''}
                          </span>
                        </h4>
                      </div>
                    {filteredUpcomingAppointments.length === 0 ? (
                      <div className="text-center py-12 px-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-slate-700 mb-2">
                          {appointmentsSearchDebounced 
                            ? 'No appointments found matching your search' 
                            : 'No upcoming appointments scheduled'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {appointmentsSearchDebounced 
                            ? 'Try adjusting your search terms' 
                            : 'Schedule new appointments to see them here.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">#</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Date</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Visit Time</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Patient</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Doctor</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Reason</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">SMS</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {filteredUpcomingAppointments.map((appointment, index) => {
                              const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`)
                              const { dateLabel, timeLabel } = getAppointmentLabels(appointment.appointmentDate, appointment.appointmentTime)
                              const daysUntil = Math.ceil((appointmentDateTime - new Date()) / (1000 * 60 * 60 * 24))

                              return (
                                <tr key={appointment._id} className="hover:bg-slate-50 transition border border-slate-200">
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                                      {String(index + 1).padStart(2, '0')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {dateLabel}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {timeLabel}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900">{appointment.patientName}</div>
                                    <div className="text-xs text-slate-500 mt-1">{appointment.mobileNumber}</div>
                                    {appointment.email && (
                                      <div className="text-xs text-slate-400 truncate max-w-xs">{appointment.email}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 border-r border-slate-200">
                                    <div className="text-sm font-semibold text-slate-900">{appointment.doctor?.fullName || 'N/A'}</div>
                                    <div className="text-xs text-slate-500">{appointment.doctor?.specialization || '—'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      {appointment.reason || 'General consultation'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                                      appointment.status === 'completed'
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : appointment.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : appointment.status === 'confirmed'
                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    }`}>
                                      <span className={`w-2 h-2 rounded-full ${
                                        appointment.status === 'completed' ? 'bg-green-500'
                                        : appointment.status === 'cancelled' ? 'bg-red-500'
                                        : appointment.status === 'confirmed' ? 'bg-blue-500'
                                        : 'bg-yellow-500'
                                      }`}></span>
                                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap border-r border-slate-200">
                                    {appointment.smsSent ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Sent
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleResendSMS(appointment._id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Resend
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                      onClick={() => handleCancelAppointment(appointment)}
                                      disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        appointment.status === 'cancelled' || appointment.status === 'completed'
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                          : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                      }`}
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Payment Modal */}
      {showQRModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center shadow-xl">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Scan QR Code to Pay</h3>
              <p className="text-gray-600">Patient can scan this QR code with any UPI app</p>
            </div>

            <div className="bg-white rounded-lg p-6 mb-6 border-2 border-gray-200 flex items-center justify-center">
              {qrCodeData.qrImageUrl ? (
                <img 
                  src={qrCodeData.qrImageUrl} 
                  alt="Payment QR Code" 
                  className="w-64 h-64 mx-auto"
                />
              ) : qrCodeData.qrShortUrl ? (
                <QRCodeSVG 
                  value={qrCodeData.qrShortUrl} 
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="text-gray-500">Loading QR code...</div>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
              <p className="text-3xl font-bold text-blue-600">₹{qrCodeData.amount}</p>
            </div>

            <div className="mb-6">
              {qrPaymentStatus === 'pending' && (
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm font-medium">Waiting for payment...</p>
                </div>
              )}
              {qrPaymentStatus === 'paid' && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium">Payment received! Registering patient...</p>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 mb-4">
              <p>Instructions:</p>
              <p>1. Open any UPI app (PhonePe, Google Pay, Paytm, etc.)</p>
              <p>2. Scan this QR code</p>
              <p>3. Confirm payment</p>
            </div>

            <button
              onClick={() => {
                stopQRPolling()
                setShowQRModal(false)
                setQrCodeData(null)
                setQrPaymentStatus('pending')
              }}
              className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
              disabled={qrPaymentStatus === 'paid'}
            >
              {qrPaymentStatus === 'paid' ? 'Payment Completed' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Patient Registered!</h3>
              <p className="text-gray-600">Token Number Generated</p>
            </div>

            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Token Number</p>
              <p className="text-6xl font-bold text-green-600">{generatedToken.tokenNumber}</p>
            </div>

            <div className="text-left mb-6 space-y-2 text-sm">
              <p><span className="font-semibold">Patient:</span> {generatedToken.fullName}</p>
              <p><span className="font-semibold">Doctor:</span> {generatedToken.doctor?.fullName}</p>
              <p>
                <span className="font-semibold">Visit:</span>{' '}
                {generatedTokenDateTime
                  ? `${generatedTokenDateTime.dateLabel} • ${generatedTokenDateTime.timeLabel}`
                  : new Date(generatedToken.registrationDate).toLocaleString()}
              </p>
            </div>

            <button
              onClick={closeTokenModal}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Appointment Success Modal */}
      {showAppointmentSuccess && appointmentSuccessData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Appointment Scheduled!</h3>
              <p className="text-gray-600">Details saved in Tekisky Hospital system.</p>
            </div>

            <div className="text-left mb-6 space-y-2 text-sm bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p><span className="font-semibold text-gray-700">Patient:</span> {appointmentSuccessData.patientName}</p>
              <p><span className="font-semibold text-gray-700">Mobile:</span> {appointmentSuccessData.mobileNumber}</p>
              <p><span className="font-semibold text-gray-700">Doctor:</span> {appointmentSuccessData.doctor?.fullName || '—'}</p>
              <p><span className="font-semibold text-gray-700">Specialization:</span> {appointmentSuccessData.doctor?.specialization || '—'}</p>
              <p><span className="font-semibold text-gray-700">Visit:</span> {(() => {
                const { dateLabel, timeLabel } = getAppointmentLabels(
                  appointmentSuccessData.appointmentDate,
                  appointmentSuccessData.appointmentTime
                )
                return `${dateLabel} • ${timeLabel}`
              })()}</p>
            </div>

            <button
              onClick={() => {
                setShowAppointmentSuccess(false)
                setAppointmentSuccessData(null)
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-8 my-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Appointment</h3>

            <form onSubmit={handleUpdateAppointment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    name="patientName"
                    value={editingAppointmentForm.patientName}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, patientName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={editingAppointmentForm.mobileNumber}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, mobileNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editingAppointmentForm.email}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor *
                  </label>
                  <select
                    name="doctor"
                    value={editingAppointmentForm.doctor}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, doctor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.fullName} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={editingAppointmentForm.appointmentDate}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, appointmentDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Time *
                  </label>
                  <input
                    type="time"
                    name="appointmentTime"
                    value={editingAppointmentForm.appointmentTime}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, appointmentTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={editingAppointmentForm.status}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Appointment
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={editingAppointmentForm.reason}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, reason: e.target.value })}
                    placeholder="e.g., Routine checkup, Follow-up, Consultation"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={editingAppointmentForm.notes}
                    onChange={(e) => setEditingAppointmentForm({ ...editingAppointmentForm, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Any additional notes..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                >
                  Update Appointment
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Prescription Records Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Header - Matching login screen spacing proportions */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-lg border border-purple-100 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center sm:justify-start gap-3">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Prescription Records
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mt-2">View all prescriptions issued by doctors • Total: {prescriptionsPagination.total || 0} records</p>
                </div>
                
                {/* Search Bar */}
                <div className="relative max-w-md w-full sm:w-auto mx-auto sm:mx-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={prescriptionsSearch}
                    onChange={(e) => setPrescriptionsSearch(e.target.value)}
                    placeholder="Search by patient name, doctor, or diagnosis..."
                    className="block w-full pl-10 pr-3 py-2.5 border border-purple-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Prescriptions Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {loadingPrescriptions ? (
                <div className="p-16 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                  <p className="mt-4 text-gray-600 font-medium">Loading prescriptions...</p>
                  <p className="text-sm text-gray-400 mt-2">Please wait while we fetch the data</p>
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-gray-700 font-semibold text-lg">No prescriptions found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {prescriptionsSearch.trim() 
                      ? 'Try adjusting your search criteria'
                      : 'Prescriptions will appear here once doctors mark patients as prescribed'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-purple-600 to-indigo-600">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Patient</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Doctor</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Visit Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Diagnosis</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Medicines</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {prescriptions.map((patient, index) => (
                          <tr key={patient._id} className={`hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                                  {patient.fullName?.charAt(0)?.toUpperCase() || 'P'}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{patient.fullName}</div>
                                  <div className="text-sm text-gray-500">{patient.mobileNumber}</div>
                                  {patient.tokenNumber && (
                                    <div className="text-xs text-purple-600 font-medium mt-0.5">Token: {patient.tokenNumber}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {patient.doctor?.fullName || 'N/A'}
                                </div>
                                {patient.doctor?.specialization && (
                                  <div className="text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-2.5 py-1 rounded-full inline-block mt-1.5 border border-purple-200 shadow-sm">
                                    {patient.doctor.specialization}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(patient.prescription?.createdAt || patient.registrationDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(patient.prescription?.createdAt || patient.registrationDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 max-w-xs">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200 shadow-sm">
                                  {patient.prescription?.diagnosis || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {patient.prescription?.medicines?.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {patient.prescription.medicines.slice(0, 2).map((med, idx) => (
                                      <div key={idx} className="text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                        <span className="font-medium text-gray-900">{med.name}</span>
                                        {med.dosage && <span className="text-gray-600"> - {med.dosage}</span>}
                                      </div>
                                    ))}
                                    {patient.prescription.medicines.length > 2 && (
                                      <div className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded">
                                        +{patient.prescription.medicines.length - 2} more medicine{patient.prescription.medicines.length - 2 > 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No medicines</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                {patient.prescription?.pdfPath && getPDFUrl(patient.prescription.pdfPath) ? (
                                  <>
                                    <button
                                      onClick={() => handleViewPrescription(patient)}
                                      className="group relative p-2.5 text-purple-600 hover:text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-lg transform hover:scale-105"
                                      title="View PDF"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        View PDF
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => handleDownloadPrescription(patient)}
                                      className="group relative p-2.5 text-indigo-600 hover:text-white hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-lg transform hover:scale-105"
                                      title="Download PDF"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        Download PDF
                                      </span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400 italic px-2 py-1 bg-gray-50 rounded">No PDF</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {prescriptionsPagination.pages > 1 && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-semibold">{(prescriptionsPagination.page - 1) * prescriptionsPagination.limit + 1}</span> to{' '}
                          <span className="font-semibold">
                            {Math.min(prescriptionsPagination.page * prescriptionsPagination.limit, prescriptionsPagination.total)}
                          </span>{' '}
                          of <span className="font-semibold">{prescriptionsPagination.total}</span> prescriptions
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newPage = prescriptionsPage - 1
                              setPrescriptionsPage(newPage)
                            }}
                            disabled={prescriptionsPage === 1 || loadingPrescriptions}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, prescriptionsPagination.pages) }, (_, i) => {
                              let pageNum
                              if (prescriptionsPagination.pages <= 5) {
                                pageNum = i + 1
                              } else if (prescriptionsPage <= 3) {
                                pageNum = i + 1
                              } else if (prescriptionsPage >= prescriptionsPagination.pages - 2) {
                                pageNum = prescriptionsPagination.pages - 4 + i
                              } else {
                                pageNum = prescriptionsPage - 2 + i
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => {
                                    setPrescriptionsPage(pageNum)
                                  }}
                                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    prescriptionsPage === pageNum
                                      ? 'bg-purple-600 text-white'
                                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => {
                              const newPage = prescriptionsPage + 1
                              setPrescriptionsPage(newPage)
                            }}
                            disabled={prescriptionsPage >= prescriptionsPagination.pages || loadingPrescriptions}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
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

      {/* Cancellation Success Modal */}
      {showCancelSuccess && cancelledAppointmentInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m2 9H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Appointment Has Been Cancelled</h3>
            <p className="text-sm text-gray-600 mb-6">
              The appointment for <span className="font-semibold">{cancelledAppointmentInfo.patientName}</span> with Dr. {cancelledAppointmentInfo.doctorName}
              {' '}on {new Date(cancelledAppointmentInfo.appointmentDate).toLocaleString()} has been cancelled. Please inform the patient and process any refunds if applicable.
            </p>
            <button
              onClick={() => {
                setShowCancelSuccess(false)
                setCancelledAppointmentInfo(null)
              }}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Cancel Patient Confirmation Modal */}
      {showCancelModal && patientToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4 mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              Cancel Patient Confirmation
            </h3>
            <div className="mb-6 space-y-3">
              <p className="text-gray-700 text-center">
                Are you sure you want to cancel this patient's appointment?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{patientToCancel.fullName}</p>
                <p className="text-xs text-gray-600">Token #{patientToCancel.tokenNumber}</p>
              </div>
              <p className="text-sm text-red-600 text-center font-medium">
                Once canceled, this appointment cannot be restored.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
              >
                Confirm Cancel
              </button>
              <button
                onClick={handleCancelClose}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Patient Success Modal */}
      {showCancelSuccessModal && cancelledPatientName && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4 mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              Patient Cancelled Successfully
            </h3>
            <div className="mb-6 space-y-3">
              <p className="text-gray-700 text-center font-medium text-lg">
                Patient has been cancelled successfully.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{cancelledPatientName}</p>
                <p className="text-xs text-gray-600">The patient has been removed from the active list.</p>
              </div>
            </div>
            <button
              onClick={handleCancelSuccessClose}
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Patient Limit Modal */}
      {selectedDoctorForLimit && (
        <PatientLimitModal
          doctor={selectedDoctorForLimit}
          isOpen={showLimitModal}
          onClose={() => {
            setShowLimitModal(false)
            setSelectedDoctorForLimit(null)
          }}
          onUpdate={fetchDoctors}
        />
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

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Scan Patient Details</h3>
              <button
                onClick={stopScanner}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <div id="scanner-container" ref={scannerContainerRef} className="w-full"></div>
              </div>
              
              {scannerError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{scannerError}</p>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Instructions:</strong> Point your camera at a QR code or document containing patient information. 
                  The system will automatically extract and fill the form fields.
                </p>
              </div>
              
              <button
                onClick={stopScanner}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Photo Upload Modal */}
      {showProfileModal && selectedDoctorForProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Upload Profile Photo</h3>
            <p className="text-sm text-gray-600 mb-4">for {selectedDoctorForProfile.fullName}</p>
            
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
                      {(selectedDoctorForProfile.fullName || 'D').charAt(0).toUpperCase()}
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
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
                <button
                  onClick={() => profileFileInputRef.current?.click()}
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
                      setSelectedDoctorForProfile(null)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
                {selectedDoctorForProfile?.profileImage && (
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

      {/* Edit Doctor Fees Modal */}
      {showEditFeeModal && selectedDoctorForFeeEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Edit Doctor Fees</h3>
            <p className="text-sm text-gray-600 mb-4">
              Update consultation fees for <span className="font-semibold">{selectedDoctorForFeeEdit.fullName}</span>
              {selectedDoctorForFeeEdit.specialization && (
                <span className="text-gray-500"> - {selectedDoctorForFeeEdit.specialization}</span>
              )}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  value={editFeeValue}
                  onChange={(e) => setEditFeeValue(e.target.value)}
                  min="0"
                  step="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-semibold"
                  placeholder="Enter fee amount"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current fee: ₹{selectedDoctorForFeeEdit.fees || 0}
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateDoctorFee}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Update Fee
                </button>
                <button
                  onClick={() => {
                    setShowEditFeeModal(false)
                    setSelectedDoctorForFeeEdit(null)
                    setEditFeeValue(0)
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
    </div>
  )
}


export default ReceptionistDashboard

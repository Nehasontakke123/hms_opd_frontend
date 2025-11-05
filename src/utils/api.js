import axios from 'axios'
import toast from 'react-hot-toast'

// const api = axios.create({
//   // Prefer env var; otherwise use deployed backend by default
//   baseURL: import.meta.env.VITE_API_BASE_URL || "https://hms-opd-backend.vercel.app/api",
//   headers: {
//     'Content-Type': 'application/json',
//   },
// })

const isLocalhost = window.location.hostname === "localhost";


const api = axios.create({
  // Prefer environment variable; then local; then deployed backend
  baseURL : isLocalhost
    ? "http://localhost:7000/api"
    : "https://hms-opd-backend.vercel.app/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not auto-redirect on login endpoint; allow the page to show errors
      const requestUrl = error.config?.url || ''
      if (requestUrl.includes('/auth/login')) {
        return Promise.reject(error)
      }
      const storedUser = localStorage.getItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      try {
        const role = storedUser ? JSON.parse(storedUser)?.role : null
        if (role === 'admin' || role === 'doctor' || role === 'receptionist' || role === 'medical') {
          window.location.href = `/${role}`
        } else {
          window.location.href = '/'
        }
      } catch {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api

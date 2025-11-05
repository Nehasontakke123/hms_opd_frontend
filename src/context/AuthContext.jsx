import { createContext, useState, useContext, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing user in localStorage
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
    }
    
    setLoading(false)
  }, [])

  const login = async (email, password, role) => {
    try {
      const response = await api.post('/auth/login', { 
        email, 
        password, 
        role 
      })

      const data = response.data

      // Store user and token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      console.log(error)
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    toast.success('Logged out successfully')
    window.location.replace('/')
  }

  const updateUser = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        // Fallback: try to get user from localStorage
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          return userData
        }
        return null
      }

      // Fetch updated user data from backend
      const response = await api.get('/auth/me')
      const updatedUser = response.data.data

      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)

      return updatedUser
    } catch (error) {
      console.error('Failed to update user data:', error)
      // Fallback: try to get user from localStorage
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        return userData
      }
      return null
    }
  }

  const setUserData = (userData) => {
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
    }
  }

  const value = {
    user,
    login,
    logout,
    loading,
    updateUser,
    setUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

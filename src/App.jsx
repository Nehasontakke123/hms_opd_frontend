import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { PrescriptionDownloadPopupProvider, usePrescriptionDownloadPopup, setGlobalShowPopup } from './context/PrescriptionDownloadPopupContext'
import ProtectedRoute from './components/ProtectedRoute'
import PrescriptionDownloadPopup from './components/PrescriptionDownloadPopup'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ReceptionistLogin from './pages/ReceptionistLogin'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import DoctorLogin from './pages/DoctorLogin'
import DoctorDashboard from './pages/DoctorDashboard'
import MedicalLogin from './pages/MedicalLogin'
import MedicalDashboard from './pages/MedicalDashboard'

function AppContent() {
  const { isVisible, hidePopup, showPopup } = usePrescriptionDownloadPopup()

  // Register global function for use outside React components
  React.useEffect(() => {
    setGlobalShowPopup(showPopup)
  }, [showPopup])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/receptionist" element={<ReceptionistLogin />} />
        <Route 
          path="/receptionist/dashboard" 
          element={
            <ProtectedRoute role="receptionist">
              <ReceptionistDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/doctor" element={<DoctorLogin />} />
        <Route 
          path="/doctor/dashboard" 
          element={
            <ProtectedRoute role="doctor">
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/medical" element={<MedicalLogin />} />
        <Route 
          path="/medical/dashboard" 
          element={
            <ProtectedRoute role="medical">
              <MedicalDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <Toaster 
        position="top-center"
        containerStyle={{
          top: '24px',
          zIndex: 10000
        }}
        toastOptions={{
          className: '',
          duration: 3000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            margin: 0,
            maxWidth: '520px',
            width: 'auto'
          }
        }}
      />
      <PrescriptionDownloadPopup isVisible={isVisible} onClose={hidePopup} />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <PrescriptionDownloadPopupProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <AppContent />
          </div>
        </Router>
      </PrescriptionDownloadPopupProvider>
    </AuthProvider>
  )
}

export default App

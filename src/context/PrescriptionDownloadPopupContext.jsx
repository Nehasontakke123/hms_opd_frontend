import React, { createContext, useContext, useState, useCallback } from 'react'

const PrescriptionDownloadPopupContext = createContext(null)

export const PrescriptionDownloadPopupProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false)

  const showPopup = useCallback(() => {
    setIsVisible(true)
  }, [])

  const hidePopup = useCallback(() => {
    setIsVisible(false)
  }, [])

  return (
    <PrescriptionDownloadPopupContext.Provider
      value={{
        isVisible,
        showPopup,
        hidePopup
      }}
    >
      {children}
    </PrescriptionDownloadPopupContext.Provider>
  )
}

export const usePrescriptionDownloadPopup = () => {
  const context = useContext(PrescriptionDownloadPopupContext)
  if (!context) {
    throw new Error('usePrescriptionDownloadPopup must be used within PrescriptionDownloadPopupProvider')
  }
  return context
}

// Utility function for use outside React components
let globalShowPopup = null

export const setGlobalShowPopup = (fn) => {
  globalShowPopup = fn
}

export const showPrescriptionDownloadPopup = () => {
  if (globalShowPopup) {
    globalShowPopup()
  }
}


// Reusable Web Speech API hook
// API: useVoiceRecognition({ onResult, onStart, onEnd })
// Returns: { start, stop, isSupported, isListening, error }
import { useCallback, useEffect, useRef, useState } from 'react'

export default function useVoiceRecognition({ onResult, onStart, onEnd } = {}) {
  const [isSupported] = useState(() => typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)

  useEffect(() => {
    if (!isSupported) return
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new Recognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      if (onStart) onStart()
      // Safety stop on prolonged silence (10s)
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop()
        } catch {}
      }, 10000)
    }

    recognition.onend = () => {
      clearTimeout(silenceTimerRef.current)
      setIsListening(false)
      if (onEnd) onEnd()
    }

    recognition.onerror = (e) => {
      clearTimeout(silenceTimerRef.current)
      setIsListening(false)
      setError(e?.error || 'voice_error')
      if (onEnd) onEnd()
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim()
      if (transcript && onResult) onResult(transcript)
    }

    recognitionRef.current = recognition
    return () => {
      clearTimeout(silenceTimerRef.current)
      try {
        recognition.stop()
      } catch {}
      recognitionRef.current = null
    }
  }, [isSupported, onResult, onStart, onEnd])

  const start = useCallback(() => {
    if (!isSupported) return
    try {
      recognitionRef.current?.start()
    } catch (e) {
      // noop if already started
    }
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported) return
    try {
      recognitionRef.current?.stop()
    } catch {}
  }, [isSupported])

  return { start, stop, isSupported, isListening, error }
}



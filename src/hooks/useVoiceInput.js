import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Simple, reusable Web Speech API hook
 * usage:
 * const { isSupported, isListening, start, stop } = useVoiceInput({
 *   onResult: (text) => setValue(prev => prev + text),
 *   onStart: () => setPulse(true),
 *   onEnd: () => setPulse(false),
 * })
 */
export default function useVoiceInput({ onResult, onStart, onEnd } = {}) {
  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const isSupported = Boolean(SpeechRecognition)

  useEffect(() => {
    if (!isSupported) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
      onStart && onStart()
    }
    recognition.onerror = () => {
      setIsListening(false)
      onEnd && onEnd()
    }
    recognition.onend = () => {
      setIsListening(false)
      onEnd && onEnd()
    }
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0]?.transcript || '')
        .join(' ')
        .trim()
      if (transcript) onResult && onResult(transcript)
    }
    recognitionRef.current = recognition
    return () => {
      try {
        recognition.stop()
      } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
    } catch (_) {}
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (_) {}
  }, [])

  return { isSupported, isListening, start, stop }
}






import * as Speech from 'expo-speech'
import { useCallback, useRef, useState } from 'react'

export const DEFAULT_SPEECH_RATE = 1.0
export const DEFAULT_SPEECH_PITCH = 1.0
export const DEFAULT_SPEECH_LANGUAGE = 'pt-BR'

export interface SpeakOptions {
  interrupt?: boolean
  language?: string
  rate?: number
  pitch?: number
  voice?: string
}

export function useTTS(
  defaults: Omit<SpeakOptions, 'interrupt'> = {
    language: DEFAULT_SPEECH_LANGUAGE,
    rate: DEFAULT_SPEECH_RATE,
    pitch: DEFAULT_SPEECH_PITCH,
  },
) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const lastOptionsRef = useRef<SpeakOptions>(defaults)

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      const merged: SpeakOptions = {
        language: defaults.language,
        rate: defaults.rate,
        pitch: defaults.pitch,
        ...options,
      }
      lastOptionsRef.current = merged

      try {
        if (merged.interrupt) {
          try {
            Speech.stop()
          } catch (error) {
            console.error(error)
          }
        }
        setIsSpeaking(true)

        Speech.speak(text, {
          language: merged.language,
          rate: merged.rate,
          pitch: merged.pitch,
          voice: merged.voice,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        } as SpeakOptions)
      } catch {
        setIsSpeaking(false)
      }
    },
    [defaults.language, defaults.pitch, defaults.rate],
  )

  const stop = useCallback(() => {
    try {
      Speech.stop()
    } catch (error) {
      console.error(error)
    }
    setIsSpeaking(false)
  }, [])

  return { isSpeaking, speak, stop, lastOptionsRef }
}

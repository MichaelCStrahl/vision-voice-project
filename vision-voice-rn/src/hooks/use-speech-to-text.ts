import { Audio } from 'expo-av'
import { Alert } from 'react-native'
import * as Speech from 'expo-speech'
import { useCallback, useState, useEffect, useRef } from 'react'

import { convertAudioFileToBase64 } from '@/utils/convert-audio-file-to-base64'
import { getEncodingByAudioFormat } from '@/utils/get-encoding-by-audio-format'

import { transcribeText } from '@/services/transcribe-text'

interface UseSpeechToText {
  isRecording: boolean
  isTranscribing: boolean
  isProcessing: boolean
  transcribedText: string
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  resetTranscription: () => void
}

type Phase = 'idle' | 'starting' | 'recording' | 'stopping' | 'transcribing'

export function useSpeechToText(): UseSpeechToText {
  const [phase, setPhase] = useState<Phase>('idle')
  const [transcribedText, setTranscribedText] = useState('')

  const phaseRef = useRef<Phase>('idle')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const cleanupPromiseRef = useRef<Promise<void> | null>(null)

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const stopAndUnload = useCallback(async (rec: Audio.Recording) => {
    // In quick touches, the Recording may be in an intermediate state.
    // We try to stop/unload in a "best effort" way with short retry.
    const tryStop = async () => {
      await rec.stopAndUnloadAsync()
    }

    try {
      await tryStop()
    } catch (error) {
      const message = String((error as { message?: unknown })?.message ?? error)
      const isAlreadyUnloaded = message.includes('already been unloaded')

      if (isAlreadyUnloaded) {
        return
      }

      // Retry small: sometimes it needs a few ms to become "loaded/prepared".
      for (const delayMs of [50, 100, 150]) {
        try {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          await tryStop()
          return
        } catch {
          // continue to the next delay
        }
      }

      console.warn('stopAndUnload failed:', error)
    }
  }, [])

  const transcribeAudio = useCallback(async (uri: string): Promise<string> => {
    try {
      const audio = await convertAudioFileToBase64(uri)
      if (!audio) {
        throw new Error('Não foi possível ler o arquivo de áudio')
      }

      // Try to infer encoding + sampleRate by MIME type or file extension.
      const encodingInfo =
        getEncodingByAudioFormat(audio.format) ?? getEncodingByAudioFormat(uri)

      const encoding = encodingInfo?.encoding ?? 'WEBM_OPUS'

      const transcription = await transcribeText({
        audioBase64: audio.base64,
        encoding,
      })
      return transcription
    } catch (err) {
      console.error('Error transcribing:', err)
      Alert.alert(
        'Erro',
        'Não foi possível transcrever o áudio. Verifique se o Google Speech-to-Text está disponível.',
      )
      return ''
    }
  }, [])

  const stopCurrentRecording = useCallback(
    async (delayMs: number) => {
      const rec = recordingRef.current
      if (!rec) {
        // If the recording doesn't exist (quick tap), leave the `phase` as 'stopping'
        // and the start will finish as soon as the recording is created.
        return
      }

      try {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }

        const cleanupPromise = stopAndUnload(rec)
        cleanupPromiseRef.current = cleanupPromise
        await cleanupPromise
        cleanupPromiseRef.current = null

        const uri = rec.getURI()
        recordingRef.current = null

        if (uri) {
          setPhaseSafe('transcribing')
          const transcription = await transcribeAudio(uri)
          setTranscribedText(transcription)
        }
      } catch (error) {
        console.error('Error stopping recording:', error as Error)
        Alert.alert('Erro', 'Não foi possível parar a gravação.')
      } finally {
        cleanupPromiseRef.current = null
        setPhaseSafe('idle')
      }
    },
    [setPhaseSafe, stopAndUnload, transcribeAudio],
  )

  const startRecording = useCallback(async () => {
    // Single source of truth: phaseRef
    const initialPhase = phaseRef.current
    if (initialPhase !== 'idle') return

    setPhaseSafe('starting')

    try {
      // Ensure any previous cleanup finished before preparing another recording.
      if (cleanupPromiseRef.current) {
        await cleanupPromiseRef.current
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      // Avoid conflict between TTS and audio capture
      try {
        Speech.stop()
      } catch (error) {
        console.error('Error stopping speech:', error as Error)
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
      )

      recordingRef.current = recording
      setTranscribedText('')

      // If the user released while we were "starting", the `phase` already became
      // 'stopping'. In this case, finish immediately.
      if (phaseRef.current === 'stopping') {
        await stopCurrentRecording(0)
        return
      }

      setPhaseSafe('recording')
    } catch (error) {
      console.error('Error starting recording:', error as Error)
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.')
      recordingRef.current = null
      setPhaseSafe('idle')
    }
  }, [setPhaseSafe, stopCurrentRecording])

  const stopRecording = useCallback(async () => {
    const currentPhase = phaseRef.current
    if (currentPhase === 'idle') return
    if (currentPhase === 'stopping' || currentPhase === 'transcribing') return

    // If still starting, mark as stopping and the start will finish later.
    setPhaseSafe('stopping')

    if (currentPhase === 'starting') {
      return
    }

    await stopCurrentRecording(500)
  }, [setPhaseSafe, stopCurrentRecording])

  const resetTranscription = () => {
    setTranscribedText('')
  }

  useEffect(() => {
    return () => {
      // On unmount, only try to stop if still loaded.
      const currentPhase = phaseRef.current
      if (currentPhase === 'idle') return
      if (currentPhase === 'stopping' || currentPhase === 'transcribing') return
      stopRecording()
    }
  }, [stopRecording])

  const isRecording = phase === 'starting' || phase === 'recording'
  const isProcessing = phase === 'stopping'
  const isTranscribing = phase === 'transcribing'

  return {
    isRecording,
    isTranscribing,
    isProcessing,
    transcribedText,
    startRecording,
    stopRecording,
    resetTranscription,
  }
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import * as Haptics from 'expo-haptics'
import { CameraView } from 'expo-camera'
import { StyleSheet, Text, View } from 'react-native'

import { theme } from '@/theme'

import { interceptVoiceCommand } from '@/utils/intercept-voice-command'

import { useTTS } from '@/hooks/use-tts'
import { useCaption } from '@/hooks/use-caption'
import { useDetection } from '@/hooks/use-detection'
import { useSpeechToText } from '@/hooks/use-speech-to-text'

import { ResultCard } from '@/components/result-card'
import { VoiceCommandActions } from '@/components/voice-command-actions'

type ActionsProps = {
  cameraRef: RefObject<CameraView | null>
}

type ResultMode = 'text' | 'detection'

const HELP_TEXT =
  'Ajuda. Você pode dizer: descrever ambiente, identificar objetos, repetir ou cancelar.'

export function Actions({ cameraRef }: ActionsProps) {
  const [resultTitle, setResultTitle] = useState('Resultado')
  const [resultText, setResultText] = useState('')
  const [resultMode, setResultMode] = useState<ResultMode>('text')
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [isCommandRunning, setIsCommandRunning] = useState(false)

  const lastResponseRef = useRef('')
  const lastResultTitleRef = useRef(resultTitle)
  const lastResultModeRef = useRef<ResultMode>('text')
  const lastResultTextRef = useRef('')
  const lastDetectedObjectsRef = useRef<DetectedObject[]>([])

  const {
    isRecording,
    isTranscribing,
    isProcessing,
    startRecording,
    stopRecording,
    transcribedText,
    resetTranscription,
  } = useSpeechToText()

  const { isSpeaking, speak: ttsSpeak } = useTTS()

  const {
    loading: isCaptionLoading,
    error: captionError,
    getCaption,
  } = useCaption()
  const {
    loading: isDetectionLoading,
    error: detectionError,
    getDetection,
  } = useDetection()

  const isImageProcessing = isCaptionLoading || isDetectionLoading
  const isBusy = isImageProcessing || isCommandRunning

  const speak = useCallback(
    (text: string, interrupt: boolean = false) => {
      ttsSpeak(text, { interrupt })
    },
    [ttsSpeak],
  )

  const storeLastResult = useCallback(
    (result: {
      title: string
      mode: ResultMode
      text: string
      objects: DetectedObject[]
      speech: string
    }) => {
      lastResponseRef.current = result.speech
      lastResultTitleRef.current = result.title
      lastResultModeRef.current = result.mode
      lastResultTextRef.current = result.text
      lastDetectedObjectsRef.current = result.objects
    },
    [],
  )

  const takeSnapshot = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error('Câmera indisponível')
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      skipProcessing: false,
      shutterSound: false,
    })

    return photo.uri
  }, [cameraRef])

  const handleCaption = useCallback(async () => {
    setResultTitle('Descrição do ambiente')
    setResultMode('text')
    setResultText('Analisando imagem...')
    setDetectedObjects([])

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const uri = await takeSnapshot()
      const caption = await getCaption(uri)

      if (!caption) {
        const message = 'Não foi possível gerar a descrição.'
        setResultText(message)
        speak(message, true)
        storeLastResult({
          title: 'Descrição do ambiente',
          mode: 'text',
          text: message,
          objects: [],
          speech: message,
        })
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        )
        return
      }

      setResultText(caption)
      speak(caption, true)
      storeLastResult({
        title: 'Descrição do ambiente',
        mode: 'text',
        text: caption,
        objects: [],
        speech: caption,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      const message = 'Erro ao capturar a imagem.'
      console.error(message, error)
      setResultText(message)
      speak(message, true)
      storeLastResult({
        title: 'Descrição do ambiente',
        mode: 'text',
        text: message,
        objects: [],
        speech: message,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [getCaption, speak, storeLastResult, takeSnapshot])

  const handleDetection = useCallback(async () => {
    setResultTitle('Objetos detectados')
    setResultMode('detection')
    setResultText('')
    setDetectedObjects([])

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const uri = await takeSnapshot()
      const objects = await getDetection(uri)

      const filteredObjects =
        objects?.filter(
          (obj) => typeof obj.confidence === 'number' && obj.confidence >= 0.5,
        ) ?? []

      if (filteredObjects.length === 0) {
        const message = 'Nenhum objeto com confiança acima de 50%.'
        setResultMode('text')
        setResultText(message)
        speak(message, true)
        storeLastResult({
          title: 'Objetos detectados',
          mode: 'text',
          text: message,
          objects: [],
          speech: message,
        })
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        )
        return
      }

      setDetectedObjects(filteredObjects)

      const readable = filteredObjects
        .map((obj) => obj.class)
        .filter(Boolean)
        .join(', ')

      const speech = readable
        ? `Encontrei: ${readable}.`
        : 'Encontrei alguns objetos.'

      speak(speech, true)
      storeLastResult({
        title: 'Objetos detectados',
        mode: 'detection',
        text: '',
        objects: filteredObjects,
        speech,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      const message = 'Erro ao capturar a imagem.'
      console.error(message, error)
      setResultMode('text')
      setResultText(message)
      speak(message, true)
      storeLastResult({
        title: 'Objetos detectados',
        mode: 'text',
        text: message,
        objects: [],
        speech: message,
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [getDetection, speak, storeLastResult, takeSnapshot])

  const handleHelp = useCallback(() => {
    setResultTitle('Ajuda')
    setResultMode('text')
    setResultText(HELP_TEXT)
    speak(HELP_TEXT, true)
    storeLastResult({
      title: 'Ajuda',
      mode: 'text',
      text: HELP_TEXT,
      objects: [],
      speech: HELP_TEXT,
    })
  }, [speak, storeLastResult])

  const handleRepeat = useCallback(() => {
    if (!lastResponseRef.current) {
      const message = 'Nada para repetir.'
      setResultTitle('Repetir')
      setResultMode('text')
      setResultText(message)
      speak(message, true)
      return
    }

    setResultTitle(lastResultTitleRef.current)
    setResultMode(lastResultModeRef.current)
    setResultText(lastResultTextRef.current)
    setDetectedObjects(lastDetectedObjectsRef.current)
    speak(lastResponseRef.current, true)
  }, [speak])

  const handleUnknown = useCallback(() => {
    const message =
      'Comando não reconhecido. Diga "ajuda" para ouvir os comandos.'
    setResultTitle('Comando')
    setResultMode('text')
    setResultText(message)
    speak(message, true)
    storeLastResult({
      title: 'Comando',
      mode: 'text',
      text: message,
      objects: [],
      speech: message,
    })
  }, [speak, storeLastResult])

  const handleVoiceCommand = useCallback(
    async (text: string) => {
      if (isBusy) {
        const message = 'Aguarde o comando anterior terminar.'
        speak(message, true)
        return
      }

      setIsCommandRunning(true)

      const command = interceptVoiceCommand(text)
      try {
        if (command === 'caption') {
          await handleCaption()
          return
        }
        if (command === 'detection') {
          await handleDetection()
          return
        }
        if (command === 'help') {
          handleHelp()
          return
        }
        if (command === 'repeat') {
          handleRepeat()
          return
        }
        handleUnknown()
      } finally {
        setIsCommandRunning(false)
      }
    },
    [
      handleCaption,
      handleDetection,
      handleHelp,
      handleRepeat,
      handleUnknown,
      isBusy,
      speak,
    ],
  )

  useEffect(() => {
    if (!transcribedText) return

    handleVoiceCommand(transcribedText).finally(() => {
      resetTranscription()
    })
  }, [handleVoiceCommand, resetTranscription, transcribedText])

  const errorText = captionError || detectionError

  const resultContent = useMemo(() => {
    if (isImageProcessing) {
      return (
        <Text
          style={styles.resultCardText}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          Analisando imagem...
        </Text>
      )
    }

    if (errorText) {
      return (
        <Text
          style={styles.resultCardText}
          accessibilityRole="text"
          accessibilityLiveRegion="assertive"
        >
          {errorText}
        </Text>
      )
    }

    if (resultMode === 'detection' && detectedObjects.length > 0) {
      const summaryItems = detectedObjects
        .map((obj) => {
          if (typeof obj.confidence !== 'number') {
            return obj.class
          }
          return `${obj.class} ${(obj.confidence * 100).toFixed(0)}%`
        })
        .filter(Boolean)

      const summary = summaryItems.join(', ')
      const displayText = summaryItems.join('  |  ')

      return (
        <View
          style={styles.resultCardTextContainer}
          accessibilityRole="text"
          accessibilityLabel={`Objetos detectados: ${summary}`}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.resultCardText}>{displayText}</Text>
        </View>
      )
    }

    const fallback = resultText || 'Aguardando comando de voz...'
    return (
      <Text
        style={styles.resultCardText}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
      >
        {fallback}
      </Text>
    )
  }, [detectedObjects, errorText, isImageProcessing, resultMode, resultText])

  const accessibilitySummary = useMemo(() => {
    if (isImageProcessing) return 'Analisando imagem.'
    if (errorText) return errorText
    if (resultMode === 'detection' && detectedObjects.length > 0) {
      const summary = detectedObjects
        .map((obj) => {
          if (typeof obj.confidence !== 'number') {
            return obj.class
          }
          return `${obj.class} ${(obj.confidence * 100).toFixed(0)}%`
        })
        .filter(Boolean)
        .join(', ')
      return `Objetos detectados: ${summary}`
    }
    return resultText || 'Aguardando comando de voz.'
  }, [detectedObjects, errorText, isImageProcessing, resultMode, resultText])

  return (
    <View style={styles.container}>
      <View style={styles.resultCardContainer}>
        <ResultCard
          title={resultTitle}
          accessibilityLabel={`Resultado. ${resultTitle}. ${accessibilitySummary}`}
        >
          {resultContent}
        </ResultCard>
      </View>
      <VoiceCommandActions
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        isProcessing={isProcessing}
        isBusy={isBusy || isSpeaking}
        onStartRecording={async () => {
          await Haptics.selectionAsync()
          await startRecording()
        }}
        onStopRecording={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          await stopRecording()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    gap: theme.spacing.sm,
  },
  resultCardContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resultCardText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.gray[800],
    textAlign: 'center',
  },
  resultCardTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCardTextItem: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.gray[800],
    textAlign: 'center',
    wordWrap: 'wrap',
  },
})

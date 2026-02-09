import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
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

  const lastSpeechRef = useRef('')

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

  const speakWithState = useCallback(
    (text: string, interrupt: boolean = false) => {
      ttsSpeak(text, { interrupt })
      lastSpeechRef.current = text
    },
    [ttsSpeak],
  )

  const takeSnapshot = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error('Câmera indisponível')
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      skipProcessing: true,
    })

    return photo.uri
  }, [cameraRef])

  const handleCaption = useCallback(async () => {
    setResultTitle('Descrição do ambiente')
    setResultMode('text')
    setResultText('Analisando imagem...')
    setDetectedObjects([])

    try {
      const uri = await takeSnapshot()
      const caption = await getCaption(uri)

      if (!caption) {
        const message = 'Não foi possível gerar a descrição.'
        setResultText(message)
        speakWithState(message, true)
        return
      }

      setResultText(caption)
      speakWithState(caption, true)
    } catch (error) {
      const message = 'Erro ao capturar a imagem.'
      console.error(message, error)
      setResultText(message)
      speakWithState(message, true)
    }
  }, [getCaption, speakWithState, takeSnapshot])

  const handleDetection = useCallback(async () => {
    setResultTitle('Objetos detectados')
    setResultMode('detection')
    setResultText('')
    setDetectedObjects([])

    try {
      const uri = await takeSnapshot()
      const objects = await getDetection(uri)

      if (!objects || objects.length === 0) {
        const message = 'Nenhum objeto foi identificado.'
        setResultMode('text')
        setResultText(message)
        speakWithState(message, true)
        return
      }

      setDetectedObjects(objects)

      const readable = objects
        .slice(0, 4)
        .map((obj) => obj.class)
        .filter(Boolean)
        .join(', ')

      const speech = readable
        ? `Encontrei: ${readable}.`
        : 'Encontrei alguns objetos.'

      speakWithState(speech, true)
    } catch (error) {
      const message = 'Erro ao capturar a imagem.'
      console.error(message, error)
      setResultMode('text')
      setResultText(message)
      speakWithState(message, true)
    }
  }, [getDetection, speakWithState, takeSnapshot])

  const handleHelp = useCallback(() => {
    setResultTitle('Ajuda')
    setResultMode('text')
    setResultText(HELP_TEXT)
    speakWithState(HELP_TEXT, true)
  }, [speakWithState])

  const handleRepeat = useCallback(() => {
    if (!lastSpeechRef.current) {
      const message = 'Nada para repetir.'
      setResultTitle('Repetir')
      setResultMode('text')
      setResultText(message)
      speakWithState(message, true)
      return
    }

    setResultTitle('Repetir')
    setResultMode('text')
    setResultText(lastSpeechRef.current)
    speakWithState(lastSpeechRef.current, true)
  }, [speakWithState])

  const handleUnknown = useCallback(() => {
    const message =
      'Comando não reconhecido. Diga "ajuda" para ouvir os comandos.'
    setResultTitle('Comando')
    setResultMode('text')
    setResultText(message)
    speakWithState(message, true)
  }, [speakWithState])

  const handleVoiceCommand = useCallback(
    async (text: string) => {
      if (isBusy) {
        const message = 'Aguarde o comando anterior terminar.'
        setResultTitle('Processando')
        setResultMode('text')
        setResultText(message)
        speakWithState(message, true)
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
      speakWithState,
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
      return <Text style={styles.resultCardText}>Analisando imagem...</Text>
    }

    if (errorText) {
      return <Text style={styles.resultCardText}>{errorText}</Text>
    }

    if (resultMode === 'detection' && detectedObjects.length > 0) {
      return (
        <View style={styles.resultCardTextContainer}>
          {detectedObjects.map((obj, index) => {
            const confidence =
              typeof obj.confidence === 'number'
                ? `${(obj.confidence * 100).toFixed(1)}%`
                : undefined

            return (
              <Fragment key={`${obj.class}-${index}`}>
                <Text style={styles.resultCardTextItem}>
                  {obj.class}
                  {confidence ? `: ${confidence}` : ''}
                </Text>
                {index < detectedObjects.length - 1 && (
                  <Text style={styles.resultCardTextItem}>{'  |  '}</Text>
                )}
              </Fragment>
            )
          })}
        </View>
      )
    }

    const fallback = resultText || 'Aguardando comando de voz...'
    return <Text style={styles.resultCardText}>{fallback}</Text>
  }, [detectedObjects, errorText, isImageProcessing, resultMode, resultText])

  return (
    <View style={styles.container}>
      <View style={styles.resultCardContainer}>
        <ResultCard title={resultTitle} accessibilityLabel="Resultado">
          {resultContent}
        </ResultCard>
      </View>
      <VoiceCommandActions
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        isProcessing={isProcessing}
        isBusy={isBusy || isSpeaking}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
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
  },
})

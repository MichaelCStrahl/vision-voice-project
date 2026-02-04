import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { theme } from '@/theme'

import { useSpeechToText } from '@/hooks/use-speech-to-text'

import { AudioVisualizer } from '@/components/audio-visualizer'
import { VoiceCommandButton } from '@/components/voice-command-button'

export function VoiceCommandActions() {
  const {
    isRecording,
    isTranscribing,
    isProcessing,
    startRecording,
    stopRecording,
    transcribedText,
  } = useSpeechToText()

  const isButtonDisabled = isProcessing || isTranscribing

  useEffect(() => {
    if (transcribedText) {
      console.log(transcribedText)
    }
  }, [transcribedText])

  return (
    <View style={styles.container}>
      {isRecording && <AudioVisualizer isRecording />}

      {isProcessing && <Text style={styles.text}>Processando áudio...</Text>}
      {isTranscribing && <Text style={styles.text}>Transcrevendo...</Text>}

      <VoiceCommandButton
        isRecording={isRecording}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={isButtonDisabled}
        accessibilityLabel={
          isRecording
            ? 'Solte para finalizar'
            : isButtonDisabled
              ? 'Processando comando'
              : 'Segure para falar'
        }
      >
        {isRecording
          ? 'Solte para finalizar'
          : isButtonDisabled
            ? 'Processando...'
            : 'Segure para falar'}
      </VoiceCommandButton>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '100%',
    paddingBottom: theme.spacing.lg,
  },
  text: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.gray[200],
    fontWeight: theme.fontWeights.bold,
    textAlign: 'center',
  },
})

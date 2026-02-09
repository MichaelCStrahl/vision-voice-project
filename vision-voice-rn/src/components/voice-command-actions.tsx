import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { theme } from '@/theme'

import { AudioVisualizer } from '@/components/audio-visualizer'
import { VoiceCommandButton } from '@/components/voice-command-button'

type VoiceCommandActionsProps = {
  isRecording: boolean
  isTranscribing: boolean
  isProcessing: boolean
  isBusy?: boolean
  onStartRecording: () => Promise<void>
  onStopRecording: () => Promise<void>
}

export function VoiceCommandActions({
  isRecording,
  isTranscribing,
  isProcessing,
  isBusy = false,
  onStartRecording,
  onStopRecording,
}: VoiceCommandActionsProps) {
  const isButtonDisabled = isProcessing || isTranscribing || isBusy

  return (
    <View style={styles.container}>
      {isRecording && <AudioVisualizer isRecording />}

      {isProcessing && <Text style={styles.text}>Processando áudio...</Text>}
      {isTranscribing && <Text style={styles.text}>Transcrevendo...</Text>}

      <VoiceCommandButton
        isRecording={isRecording}
        onPressIn={onStartRecording}
        onPressOut={onStopRecording}
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

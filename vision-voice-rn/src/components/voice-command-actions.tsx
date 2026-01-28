import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { theme } from '@/theme'

import { useTTS } from '@/hooks/use-tts'

import AudioVisualizer from '@/components/audio-visualizer'
import VoiceCommandButton from '@/components/voice-command-button'

export function VoiceCommandActions() {
  const { isSpeaking } = useTTS()

  return (
    <View style={styles.container}>
      <AudioVisualizer isRecording={isSpeaking} />

      {isSpeaking && <Text style={styles.text}>Processando comando...</Text>}

      <VoiceCommandButton isRecording={isSpeaking}>
        <Text>Segure para falar</Text>
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
    paddingBottom: theme.spacing.sm,
  },
  text: {
    fontSize: theme.fontSizes.lg,
    color: theme.colors.gray[200],
    textAlign: 'center',
  },
})

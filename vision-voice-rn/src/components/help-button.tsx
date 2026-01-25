import { HelpCircle } from 'lucide-react-native'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { theme } from '@/theme'
import { DEFAULT_SPEECH_RATE, useTTS } from '@/hooks/use-tts'

export function HelpButton() {
  const insets = useSafeAreaInsets()

  const { isSpeaking, speak: ttsSpeak } = useTTS()

  const speakWithState = (text: string, interrupt: boolean = false) =>
    ttsSpeak(text, { interrupt, rate: DEFAULT_SPEECH_RATE })

  const handlePress = () => {
    if (isSpeaking) {
      ttsSpeak('Cancelando...', { interrupt: true })
    } else {
      speakWithState(
        'Ajuda. Você pode dizer: descrever ambiente, identificar objetos, repetir ou cancelar.',
        true,
      )
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityLabel="Ajuda"
      accessibilityHint="Falar os comandos disponíveis"
      accessibilityRole="button"
      style={[styles.button, { top: insets.top + theme.spacing.md }]}
    >
      <HelpCircle color="white" size={theme.sizes.xl} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: theme.spacing.lg,
    zIndex: theme.zIndex.helpButton,
    backgroundColor: 'transparent',
  },
})

import { ReactNode } from 'react'
import { Mic, MicOff } from 'lucide-react-native'

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native'

import { theme } from '@/theme'

type VoiceCommandButtonProps = TouchableOpacityProps & {
  isRecording: boolean
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function VoiceCommandButton({
  children,
  isRecording,
  variant = 'primary',
  ...props
}: VoiceCommandButtonProps) {
  const containerStyle = styles[
    `container${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles
  ] as ViewStyle

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle]}
      activeOpacity={0.8}
      {...props}
    >
      {isRecording ? (
        <MicOff size={20} color="white" />
      ) : (
        <Mic size={20} color="white" />
      )}
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    height: theme.sizes['4xl'],
    borderRadius: theme.radii.md,
    gap: theme.spacing.sm,
  },
  text: {
    fontSize: theme.fontSizes['2xl'],
    color: theme.colors.white,
  },

  // Primary variants
  containerPrimary: {
    backgroundColor: theme.colors.blue[800],
  },

  // Secondary variants
  containerSecondary: {
    backgroundColor: theme.colors.red[800],
  },
})

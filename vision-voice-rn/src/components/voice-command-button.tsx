import { ReactNode } from 'react'
import { Mic, MicOff } from 'lucide-react-native'

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
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
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: VoiceCommandButtonProps) {
  const variant = isRecording ? 'secondary' : 'primary'

  const containerStyle =
    (variant === 'secondary' && styles.containerSecondary) ||
    (variant === 'primary' && styles.containerPrimary)

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle, disabled && styles.disabled]}
      activeOpacity={0.8}
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
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
  disabled: {
    opacity: theme.opacity.disabled,
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

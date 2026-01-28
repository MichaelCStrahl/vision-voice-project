import { forwardRef, ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { theme } from '@/theme'

interface ResultCardProps {
  title: string
  children: ReactNode
  accessibilityLabel: string
}

export const ResultCard = forwardRef<View, ResultCardProps>(function ResultCard(
  { title, children, accessibilityLabel },
  ref,
) {
  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    width: '95%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  title: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.blue[800],
  },
})

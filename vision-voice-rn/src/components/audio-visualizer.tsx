import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'

import { theme } from '@/theme'

interface AudioVisualizerProps {
  isRecording: boolean
}

export default function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  const animatedValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current

  useEffect(() => {
    if (isRecording) {
      const animations = animatedValues.map((value, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: 300 + index * 100,
              useNativeDriver: false,
            }),
            Animated.timing(value, {
              toValue: 0,
              duration: 300 + index * 100,
              useNativeDriver: false,
            }),
          ]),
        ),
      )

      Animated.parallel(animations).start()
    } else {
      animatedValues.forEach((value) => value.setValue(0))
    }
  }, [isRecording, animatedValues])

  if (!isRecording) return null

  return (
    <View style={styles.container}>
      {animatedValues.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: value.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 50],
              }),
              opacity: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: theme.sizes['4xl'],
    gap: theme.spacing.xs,
  },
  bar: {
    width: theme.sizes.xs,
    backgroundColor: theme.colors.red[700],
    borderRadius: theme.radii.sm,
  },
})

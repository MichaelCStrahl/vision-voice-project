import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react-native'
import { View, Text, StyleSheet, Animated } from 'react-native'

import { theme } from '@/theme'

export const Loading = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ).start()
  }, [rotateAnim])

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={styles.container}>
      <View style={styles.loaderContainer}>
        <Animated.View
          style={[
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <Loader2
            size={24}
            color={theme.colors.gray[800]}
            style={styles.loaderIcon}
          />
        </Animated.View>
        <Text style={styles.text}>Carregando...</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loaderIcon: {
    margin: theme.spacing.none,
    padding: theme.spacing.none,
  },
  text: {
    color: theme.colors.gray[800],
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.normal,
    alignSelf: 'center',
  },
})

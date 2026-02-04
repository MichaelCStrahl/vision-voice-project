import { useRef } from 'react'
import { CameraView } from 'expo-camera'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'

import { Actions } from '@/components/actions'
import { HelpButton } from '@/components/help-button'
import { PermissionsGate } from '@/components/permissions-gate'

export default function Home() {
  const cameraRef = useRef<CameraView>(null)

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent
        animated
      />
      <PermissionsGate>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            facing="back"
            style={styles.camera}
            accessibilityElementsHidden
          />
          <HelpButton />
          <Actions />
        </View>
      </PermissionsGate>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    position: 'relative',
    flex: 1,
    width: '100%',
    height: '100%',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
})

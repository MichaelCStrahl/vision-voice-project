import { useRef } from 'react'
import { CameraView } from 'expo-camera'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'

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
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} facing="back" style={styles.camera} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
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

import { Audio } from 'expo-av'
import { Camera } from 'expo-camera'
import { useEffect, useMemo, useState } from 'react'
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { theme } from '@/theme'

import { Loading } from '@/components/loading'

type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unknown'

type PermissionState = {
  camera: PermissionStatus
  microphone: PermissionStatus
}

type PermissionsGateProps = {
  children: React.ReactNode
}

const toPermissionStatus = (status?: string | null): PermissionStatus => {
  if (status === 'granted') return 'granted'
  if (status === 'denied') return 'denied'
  if (status === 'undetermined') return 'undetermined'
  return 'unknown'
}

export function PermissionsGate({ children }: PermissionsGateProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasRequested, setHasRequested] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>({
    camera: 'unknown',
    microphone: 'unknown',
  })

  const missing = useMemo(() => {
    const miss: string[] = []
    if (permissionState.camera !== 'granted') miss.push('Câmera')
    if (permissionState.microphone !== 'granted')
      miss.push('Microfone / Gravação')
    return miss
  }, [permissionState])

  useEffect(() => {
    let isMounted = true

    const checkOnly = async () => {
      setIsLoading(true)
      try {
        // Just check status. Does not trigger system prompts automatically.
        const camPerm = await Camera.getCameraPermissionsAsync()
        const micPerm = await Audio.getPermissionsAsync()

        if (!isMounted) return

        setPermissionState({
          camera: toPermissionStatus(camPerm.status),
          microphone: toPermissionStatus(micPerm.status),
        })
      } catch (error) {
        console.error('Erro ao solicitar permissões:', error)
        if (!isMounted) return
        setPermissionState({
          camera: 'unknown',
          microphone: 'unknown',
        })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    checkOnly()

    return () => {
      isMounted = false
    }
  }, [])

  const requestPermissions = async () => {
    setHasRequested(true)
    setIsLoading(true)
    try {
      const camFinal = await Camera.requestCameraPermissionsAsync()
      const micFinal = await Audio.requestPermissionsAsync()

      setPermissionState({
        camera: toPermissionStatus(camFinal.status),
        microphone: toPermissionStatus(micFinal.status),
      })
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error)
      setPermissionState({
        camera: 'unknown',
        microphone: 'unknown',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (missing.length > 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Permissões necessárias</Text>
        <Text style={styles.subtitle}>
          Para usar o app, precisamos de acesso a:
        </Text>

        <View style={styles.list}>
          {missing.map((item) => (
            <Text key={item} style={styles.item}>
              - {item}
            </Text>
          ))}
        </View>

        {!hasRequested ? (
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={requestPermissions}
            accessibilityRole="button"
            accessibilityLabel="Solicitar permissões"
          >
            <Text style={styles.buttonText}>Solicitar permissões</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Abrir configurações do app"
          >
            <Text style={styles.buttonText}>Abrir configurações</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.white,
    fontSize: theme.fontSizes['4xl'],
    fontWeight: theme.fontWeights.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.gray[300],
    fontSize: theme.fontSizes.xl,
    textAlign: 'center',
  },
  list: {
    gap: theme.spacing.xs,
    alignSelf: 'center',
  },
  item: {
    color: theme.colors.gray[200],
    fontSize: theme.fontSizes.lg,
    textAlign: 'left',
  },
  button: {
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.blue[800],
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
  },
})

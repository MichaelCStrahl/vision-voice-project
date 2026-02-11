import { useRef, useState } from 'react'

import { translateText } from '@/services/translate-text'
import { getObjects as getObjectsService } from '@/services/get-objects'

type UseDetectionResult = {
  result: string
  loading: boolean
  error: string | null
  getDetection: (uri: string) => Promise<DetectedObject[] | undefined>
}

export function useDetection(): UseDetectionResult {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  const getDetection = async (currentUri: string) => {
    if (!currentUri) return undefined

    const requestId = ++requestIdRef.current

    setLoading(true)
    setError(null)
    setResult('')

    try {
      const objects = await getObjectsService({ uri: currentUri })
      if (requestId !== requestIdRef.current) return

      const translatedObjects = await Promise.all(
        objects.map(async (obj: DetectedObject) => {
          if (!obj.class) return obj
          try {
            const translatedClass = await translateText({ text: obj.class })
            return {
              ...obj,
              class: translatedClass || obj.class,
            }
          } catch {
            return obj
          }
        }),
      )

      if (requestId !== requestIdRef.current) return
      setResult(JSON.stringify(translatedObjects))
      return translatedObjects
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : 'Erro ao detectar objetos')
      setResult('')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }

  return {
    result,
    loading,
    error,
    getDetection,
  }
}

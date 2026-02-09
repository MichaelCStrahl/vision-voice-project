import { useRef, useState } from 'react'

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
      setResult(JSON.stringify(objects))
      return objects
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

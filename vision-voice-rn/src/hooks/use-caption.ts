import { useRef, useState } from 'react'

import { translateText } from '@/services/translate-text'
import { getCaption as getCaptionService } from '@/services/get-caption'

type UseCaptionResult = {
  result: string
  loading: boolean
  error: string | null
  getCaption: (uri: string) => Promise<string | undefined>
}

export function useCaption(): UseCaptionResult {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  const getCaption = async (currentUri: string) => {
    if (!currentUri) return undefined

    const requestId = ++requestIdRef.current

    setLoading(true)
    setError(null)
    setResult('')

    try {
      const caption = await getCaptionService({ uri: currentUri })
      if (requestId !== requestIdRef.current) return

      if (!caption) {
        setResult('')
        return ''
      }

      const translated = await translateText({ text: caption })
      if (requestId !== requestIdRef.current) return
      setResult(translated)
      return translated
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : 'Erro ao gerar a legenda')
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
    getCaption,
  }
}

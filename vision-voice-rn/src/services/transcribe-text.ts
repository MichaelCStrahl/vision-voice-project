import { api } from '@/api'
import { env } from '@/env'

import { SAMPLE_RATE } from '@/constants'

type TranscribeTextParams = {
  audioBase64: string
  encoding: string
}

type TranscriptionRequest = {
  audio: {
    content: string
  }
  config: {
    encoding: string
    sampleRateHertz: number
    languageCode: string
    enableAutomaticPunctuation: boolean
    model?: string
  }
}

type TranscriptionResponse = {
  results?: Array<{
    alternatives?: Array<{
      transcript?: string
    }>
  }>
  error?: {
    message?: string
  }
}

const key = env.EXPO_PUBLIC_API_TRANSCRIPTION_KEY

export const transcribeText = async ({
  audioBase64,
  encoding,
}: TranscribeTextParams) => {
  const transcriptionApi = api({ isTranscription: true })

  const requestBody: TranscriptionRequest = {
    audio: {
      content: audioBase64,
    },
    config: {
      encoding,
      sampleRateHertz: SAMPLE_RATE,
      languageCode: 'pt-BR',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
    },
  }

  const response = await transcriptionApi.post<TranscriptionResponse>(
    '/',
    requestBody,
    {
      params: { key },
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  return response.data?.results?.[0]?.alternatives?.[0]?.transcript ?? ''
}

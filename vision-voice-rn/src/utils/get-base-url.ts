import { env } from '@/env'

type GetBaseUrlProps = {
  isDetection: boolean
  isCaption: boolean
  isTranscription: boolean
  isTranslation: boolean
}

export const getBaseUrl = ({
  isDetection = false,
  isCaption = false,
  isTranscription = false,
  isTranslation = false,
}: GetBaseUrlProps) => {
  if (isDetection) {
    return env.EXPO_PUBLIC_API_DETECTION_URL
  }
  if (isCaption) {
    return env.EXPO_PUBLIC_API_CAPTION_URL
  }
  if (isTranscription) {
    return env.EXPO_PUBLIC_API_TRANSCRIPTION_URL
  }
  if (isTranslation) {
    return env.EXPO_PUBLIC_API_TRANSLATION_URL
  }
  return ''
}

import { z } from 'zod'

const envSchema = z.object({
  EXPO_PUBLIC_API_DETECTION_URL: z.string(),
  EXPO_PUBLIC_API_CAPTION_URL: z.string(),
  EXPO_PUBLIC_API_TRANSCRIPTION_URL: z.string(),
  EXPO_PUBLIC_API_TRANSCRIPTION_KEY: z.string(),
  EXPO_PUBLIC_API_TRANSLATION_URL: z.string(),
  EXPO_PUBLIC_API_TRANSLATION_KEY: z.string(),
})

export const env = envSchema.parse(process.env)

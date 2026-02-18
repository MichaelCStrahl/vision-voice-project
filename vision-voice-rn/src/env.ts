import { z } from 'zod'

const envSchema = z.object({
  EXPO_PUBLIC_API_DETECTION_URL: z.string(),
  EXPO_PUBLIC_API_CAPTION_URL: z.string(),
  EXPO_PUBLIC_API_TRANSCRIPTION_URL: z.string(),
  EXPO_PUBLIC_API_TRANSCRIPTION_KEY: z.string(),
  EXPO_PUBLIC_API_TRANSLATION_URL: z.string(),
  EXPO_PUBLIC_API_TRANSLATION_KEY: z.string(),
})

// Expo replaces direct `process.env.EXPO_PUBLIC_*` references at bundle time.
// Parsing `process.env` directly can fail in release builds.
const rawEnv = {
  EXPO_PUBLIC_API_DETECTION_URL: process.env.EXPO_PUBLIC_API_DETECTION_URL,
  EXPO_PUBLIC_API_CAPTION_URL: process.env.EXPO_PUBLIC_API_CAPTION_URL,
  EXPO_PUBLIC_API_TRANSCRIPTION_URL:
    process.env.EXPO_PUBLIC_API_TRANSCRIPTION_URL,
  EXPO_PUBLIC_API_TRANSCRIPTION_KEY:
    process.env.EXPO_PUBLIC_API_TRANSCRIPTION_KEY,
  EXPO_PUBLIC_API_TRANSLATION_URL: process.env.EXPO_PUBLIC_API_TRANSLATION_URL,
  EXPO_PUBLIC_API_TRANSLATION_KEY: process.env.EXPO_PUBLIC_API_TRANSLATION_KEY,
}

const parsedEnv = envSchema.safeParse(rawEnv)

if (!parsedEnv.success) {
  const missing = parsedEnv.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ')

  throw new Error(
    `Invalid environment configuration. Missing/invalid variables: ${missing}`,
  )
}

export const env = parsedEnv.data

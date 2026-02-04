import { File } from 'expo-file-system'

export type AudioBase64Result = {
  base64: string
  format: string
}

export const convertAudioFileToBase64 = async (
  uri: string,
): Promise<AudioBase64Result | null> => {
  if (!uri) return null

  const file = new File(uri)
  const base64 = await file.base64()
  const format = file.type

  return { base64, format }
}

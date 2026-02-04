export type SpeechEncoding = 'MP3' | 'LINEAR16' | 'WEBM_OPUS' | 'FLAC' | 'M4A'

export type EncodingAndSampleRate = {
  encoding: SpeechEncoding
  sampleRate: number
}

/**
 * Receives a format/ MIME type (ex: "audio/mpeg", "audio/wav", "audio/webm;codecs=opus")
 * or extension (ex: "mp3", "wav") and returns the recommended encoding + sampleRate
 * for the Google Cloud Speech-to-Text.
 */
export const getEncodingByAudioFormat = (
  audioFormat: string | null | undefined,
): EncodingAndSampleRate | undefined => {
  const format = (audioFormat ?? '').toLowerCase()

  if (format.includes('mpeg') || format.includes('mp3')) {
    return { encoding: 'MP3', sampleRate: 44100 }
  }

  if (format.includes('m4a') || format.includes('mp4')) {
    return { encoding: 'M4A', sampleRate: 44100 }
  }

  if (format.includes('wav') || format.includes('pcm')) {
    return { encoding: 'LINEAR16', sampleRate: 16000 }
  }

  if (
    format.includes('webm') ||
    format.includes('opus') ||
    format.includes('ogg')
  ) {
    return { encoding: 'WEBM_OPUS', sampleRate: 48000 }
  }

  if (format.includes('flac')) {
    return { encoding: 'FLAC', sampleRate: 16000 }
  }

  return undefined
}

import { VOICE_COMMANDS } from '@/constants'

import { normalizeText } from '@/utils/normalize-text'

const NORMALIZED_COMMANDS = VOICE_COMMANDS.map(({ command, candidates }) => ({
  command,
  candidates: candidates.map(normalizeText),
}))

export const interceptVoiceCommand = (text: string): VoiceCommand => {
  const normText = normalizeText(text)
  if (!normText) return 'unknown'

  for (const { command, candidates } of NORMALIZED_COMMANDS) {
    if (candidates.some((candidate) => normText.includes(candidate))) {
      return command
    }
  }

  return 'unknown'
}

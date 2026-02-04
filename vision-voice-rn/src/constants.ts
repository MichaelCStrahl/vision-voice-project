/**
 * Speech configuration
 */
export const DEFAULT_SPEECH_RATE = 1.0
export const DEFAULT_SPEECH_PITCH = 1.0
export const DEFAULT_SPEECH_LANGUAGE = 'pt-BR'

/**
 * API configuration
 */
export const API_TIMEOUT = 15000 // 15 seconds

/**
 * Audio configuration
 */
export const SAMPLE_RATE = 48000

/**
 * Voice Command candidates
 */
export const VOICE_COMMAND_CANDIDATES = {
  CAPTION: [
    'descreva',
    'descrever',
    'descrever ambiente',
    'descreva o ambiente',
    'descrever a cena',
    'descreva a cena',
  ],
  DETECTION: [
    'identifique',
    'identificar',
    'identificar objetos',
    'detectar objetos',
    'encontrar objetos',
    'O que tem aqui',
    'o que esta na frente',
    'o que voce ve',
  ],
  HELP: [
    'ajuda',
    'o que posso falar',
    'quais comandos',
    'como usar',
    'como funciona',
    'como faço',
  ],
  REPEAT: ['repita', 'repetir', 'fale novamente'],
} as const

export const VOICE_COMMANDS: readonly {
  command: VoiceCommand
  candidates: readonly string[]
}[] = [
  // The order matters: the first match wins.
  { command: 'caption', candidates: VOICE_COMMAND_CANDIDATES.CAPTION },
  { command: 'detection', candidates: VOICE_COMMAND_CANDIDATES.DETECTION },
  { command: 'help', candidates: VOICE_COMMAND_CANDIDATES.HELP },
  { command: 'repeat', candidates: VOICE_COMMAND_CANDIDATES.REPEAT },
] as const

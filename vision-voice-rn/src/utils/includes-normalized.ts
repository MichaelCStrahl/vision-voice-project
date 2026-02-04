import { normalizeText } from '@/utils/normalize-text'

export const includesNormalized = (
  text: string,
  candidates: readonly string[],
): boolean => {
  const normText = normalizeText(text)

  return candidates.some((candidate) =>
    normText.includes(normalizeText(candidate)),
  )
}

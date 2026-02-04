export const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // remove special characters and punctuation
    .replace(/\s+/g, ' ') // normalize multiple spaces
    .trim()
}

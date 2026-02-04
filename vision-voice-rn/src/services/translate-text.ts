import { api } from '@/api'
import { env } from '@/env'

import { decodeHtmlEntities } from '@/utils/decode-html-entities'

type TranslateTextParams = {
  text: string
}

const apiKey = env.EXPO_PUBLIC_API_TRANSLATION_KEY

export const translateText = async ({ text }: TranslateTextParams) => {
  const translationApi = api({ isTranslation: true })

  const config = {
    params: { key: apiKey },
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const response = await translationApi.post(
    '/',
    {
      q: text,
      target: 'pt-BR',
      format: 'text',
    },
    config,
  )

  return decodeHtmlEntities(
    response.data.data.translations[0].translatedText ?? '',
  )
}

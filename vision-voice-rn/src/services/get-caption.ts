import { api } from '@/api'

type GetCaptionParams = {
  uri: string
}

export const getCaption = async ({
  uri,
}: GetCaptionParams): Promise<string> => {
  if (!uri) return ''

  const captionApi = api({ isCaption: true })

  const fileName = `photo-${Date.now()}.jpg`

  const formData = new FormData()

  formData.append('file', {
    uri,
    name: fileName,
    type: 'image/jpeg',
  } as unknown as Blob)

  const response = await captionApi.post('', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data?.caption ?? ''
}

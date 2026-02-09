import { api } from '@/api'

type GetObjectsParams = {
  uri: string
}

export const getObjects = async ({ uri }: GetObjectsParams) => {
  if (!uri) return []

  const objectsApi = api({ isDetection: true })

  const fileName = `photo-${Date.now()}.jpg`

  const formData = new FormData()

  formData.append('file', {
    uri,
    name: fileName,
    type: 'image/jpeg',
  } as unknown as Blob)

  const response = await objectsApi.post('', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data?.detected_objects ?? []
}

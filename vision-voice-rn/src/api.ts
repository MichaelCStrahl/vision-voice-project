import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios'

import { API_TIMEOUT } from '@/constants'

import { getBaseUrl } from '@/utils/get-base-url'

type APIInstanceProps = AxiosInstance & {
  isDetection?: boolean
  isCaption?: boolean
  isTranscription?: boolean
  isTranslation?: boolean
}

type APIConfig = {
  baseURL?: string
  isDetection?: boolean
  isCaption?: boolean
  isTranscription?: boolean
  isTranslation?: boolean
} & Omit<AxiosRequestConfig, 'baseURL'>

const isDebugging = true

const createErrorInterceptor = () => {
  return (response: AxiosResponse) => response
}

const createErrorHandler = () => {
  return (error: AxiosError) => {
    try {
      const method = (error?.config?.method || 'GET').toUpperCase()
      const url = `${error?.config?.baseURL || ''}${error?.config?.url || ''}`
      const status = error?.response?.status
      const code = error?.code
      const message = error?.message
      const data = error?.response?.data
      console.log('[API ERROR]', { method, url, status, code, message, data })
    } catch {
      console.log('Error logging API error', error)
    }
    return Promise.reject(error)
  }
}

// Selective API function that allows selecting the baseURL dynamically
export const api = (config?: APIConfig): APIInstanceProps => {
  let baseURL = config?.baseURL

  // If baseURL is not provided, try to use getBaseUrl with the flags
  if (!baseURL) {
    baseURL = getBaseUrl({
      isDetection: config?.isDetection ?? false,
      isCaption: config?.isCaption ?? false,
      isTranscription: config?.isTranscription ?? false,
      isTranslation: config?.isTranslation ?? false,
    })
  }

  const instance = axios.create({
    baseURL,
    timeout: config?.timeout ?? API_TIMEOUT,
    ...config,
  }) as APIInstanceProps

  // Add error interceptor if in debug mode
  if (isDebugging) {
    instance.interceptors.response.use(
      createErrorInterceptor(),
      createErrorHandler(),
    )
  }

  return instance
}

// Default instance for compatibility with existing code
export const defaultApi = api()

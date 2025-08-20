/**
 * Hook personalizado para gerenciar estado de upload com progresso REAL
 */

import { useState, useCallback, useRef } from 'react'
import { 
  uploadVideoWithRealProgress, 
  uploadFileWithRealProgress, 
  uploadImageWithRealProgress,
  type RealUploadProgress 
} from '@/lib/upload-with-real-progress'

export interface UseUploadOptions {
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
}

export interface UseUploadReturn {
  isUploading: boolean
  progress: RealUploadProgress | null
  error: string | null
  upload: (file: File, userId: string, type: 'video' | 'file') => Promise<string>
  reset: () => void
  cancel: () => void
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<RealUploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Ref para controlar cancelamento
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(null)
    setError(null)
    abortControllerRef.current = null
  }, [])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      reset()
    }
  }, [reset])

  const upload = useCallback(async (
    file: File, 
    userId: string, 
    type: 'video' | 'file'
  ): Promise<string> => {
    // Reset estado anterior
    setError(null)
    setProgress(null)
    setIsUploading(true)

    try {
      // Criar AbortController para cancelamento
      abortControllerRef.current = new AbortController()

      // Usar upload com progresso real
      const uploadFunction = type === 'video' ? uploadVideoWithRealProgress : uploadFileWithRealProgress
      
      const url = await uploadFunction(file, userId, {
        onProgress: (realProgress) => {
          setProgress(realProgress)
        },
        onError: (error) => {
          setError(error)
          options.onError?.(error)
        },
        signal: abortControllerRef.current.signal
      })

      // Upload concluído
      setIsUploading(false)
      setProgress(null)
      options.onSuccess?.(url)

      return url

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido no upload'
      setIsUploading(false)
      setError(errorMessage)
      options.onError?.(errorMessage)
      throw err
    }
  }, [options])

  return {
    isUploading,
    progress,
    error,
    upload,
    reset,
    cancel
  }
}
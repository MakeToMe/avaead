/**
 * Hook personalizado para gerenciar estado de upload com progresso
 */

import { useState, useCallback, useRef } from 'react'
import { uploadWithProgress, type UploadProgress } from '@/lib/upload-with-progress'

export interface UseUploadOptions {
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
}

export interface UseUploadReturn {
  isUploading: boolean
  progress: UploadProgress | null
  error: string | null
  upload: (file: File, userId: string, type: 'video' | 'file') => Promise<string>
  reset: () => void
  cancel: () => void
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
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

      // Simular progresso inicial
      setProgress({
        loaded: 0,
        total: file.size,
        percentage: 0,
        speed: 0,
        timeRemaining: 0,
        stage: "Preparando upload..."
      })

      // Usar as actions existentes que já funcionam
      const { uploadVideoMinio, uploadPdfMinio } = await import("../app/minhas-aulas/actions")
      
      // Simular progresso durante o upload
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev || abortControllerRef.current?.signal.aborted) return prev
          
          const newPercentage = Math.min(prev.percentage + Math.random() * 10, 95)
          const newLoaded = (newPercentage / 100) * file.size
          const speed = 1024 * 1024 * (0.5 + Math.random() * 2) // 0.5-2.5 MB/s
          const remaining = (file.size - newLoaded) / speed
          
          return {
            ...prev,
            loaded: newLoaded,
            percentage: Math.round(newPercentage * 10) / 10,
            speed,
            timeRemaining: remaining,
            stage: newPercentage > 80 ? "Finalizando..." : "Enviando arquivo..."
          }
        })
      }, 500)

      // Fazer upload usando as actions existentes
      const uploadResult = type === 'video' 
        ? await uploadVideoMinio(file, userId)
        : await uploadPdfMinio(file, userId)

      // Limpar intervalo
      clearInterval(progressInterval)

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Erro no upload')
      }

      // Progresso final
      setProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
        speed: 0,
        timeRemaining: 0,
        stage: "Upload concluído!"
      })

      // Aguardar um pouco para mostrar o 100%
      await new Promise(resolve => setTimeout(resolve, 500))

      setIsUploading(false)
      setProgress(null)
      options.onSuccess?.(uploadResult.url!)

      return uploadResult.url!

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
/**
 * Hook personalizado para gerenciar estado de upload com progresso REAL
 * Inclui renovação automática de sessão durante uploads longos
 */

import { useState, useCallback, useRef } from 'react'
import { 
  uploadVideoWithRealProgress, 
  uploadFileWithRealProgress, 
  uploadImageWithRealProgress,
  type RealUploadProgress 
} from '@/lib/upload-with-real-progress'
import { uploadSessionManager } from '@/lib/services/upload-session-manager'

export interface UseUploadOptions {
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
  onSessionRenewed?: (renewalTime: Date) => void
  onSessionError?: (error: string) => void
}

export interface UseUploadReturn {
  isUploading: boolean
  progress: RealUploadProgress | null
  error: string | null
  sessionStatus: 'active' | 'renewing' | 'expired' | 'error'
  upload: (file: File, userId: string, type: 'video' | 'file') => Promise<string>
  reset: () => void
  cancel: () => void
}

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<RealUploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'active' | 'renewing' | 'expired' | 'error'>('active')
  
  // Refs para controlar upload e sessão
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentUploadIdRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    // Remover upload do session manager se existir
    if (currentUploadIdRef.current) {
      uploadSessionManager.unregisterUpload(currentUploadIdRef.current)
      currentUploadIdRef.current = null
    }
    
    setIsUploading(false)
    setProgress(null)
    setError(null)
    setSessionStatus('active')
    abortControllerRef.current = null
  }, [])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    reset()
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
    setSessionStatus('active')

    // Gerar ID único para este upload
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    currentUploadIdRef.current = uploadId

    try {
      // Registrar upload no session manager
      uploadSessionManager.registerActiveUpload(
        uploadId,
        userId,
        file.name,
        file.size
      )

      // Criar AbortController para cancelamento
      abortControllerRef.current = new AbortController()

      // Configurar listeners para eventos de sessão
      const handleSessionRenewed = (event: CustomEvent) => {
        console.log('🔄 Upload: Sessão renovada durante upload')
        setSessionStatus('active')
        options.onSessionRenewed?.(new Date(event.detail.renewalTime))
      }

      const handleSessionError = (event: CustomEvent) => {
        console.log('❌ Upload: Erro na sessão durante upload')
        setSessionStatus('error')
        options.onSessionError?.(event.detail.error)
      }

      // Adicionar listeners
      if (typeof window !== 'undefined') {
        window.addEventListener('session-renewed', handleSessionRenewed as EventListener)
        window.addEventListener('session-renewal-error', handleSessionError as EventListener)
      }

      // Usar upload com progresso real
      const uploadFunction = type === 'video' ? uploadVideoWithRealProgress : uploadFileWithRealProgress
      
      const url = await uploadFunction(file, userId, {
        onProgress: (realProgress) => {
          setProgress(realProgress)
          
          // Atualizar status da sessão baseado no progresso
          if (realProgress.percentage > 0 && realProgress.percentage < 100) {
            setSessionStatus('active')
          }
        },
        onError: (error) => {
          setError(error)
          options.onError?.(error)
        },
        signal: abortControllerRef.current.signal
      })

      // Upload concluído com sucesso
      setIsUploading(false)
      setProgress(null)
      setSessionStatus('active')
      
      // Remover listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('session-renewed', handleSessionRenewed as EventListener)
        window.removeEventListener('session-renewal-error', handleSessionError as EventListener)
      }
      
      // Remover do session manager
      uploadSessionManager.unregisterUpload(uploadId)
      currentUploadIdRef.current = null
      
      options.onSuccess?.(url)
      return url

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido no upload'
      
      setIsUploading(false)
      setError(errorMessage)
      setSessionStatus('error')
      
      // Limpar upload do session manager em caso de erro
      if (currentUploadIdRef.current) {
        uploadSessionManager.unregisterUpload(currentUploadIdRef.current)
        currentUploadIdRef.current = null
      }
      
      options.onError?.(errorMessage)
      throw err
    }
  }, [options])

  return {
    isUploading,
    progress,
    error,
    sessionStatus,
    upload,
    reset,
    cancel
  }
}
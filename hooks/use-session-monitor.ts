/**
 * Hook para monitorar status da sessão durante uploads
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionRenewalService, type SessionStatus } from '@/lib/services/session-renewal-service'
import { uploadSessionManager } from '@/lib/services/upload-session-manager'

export interface SessionMonitorState {
  sessionStatus: SessionStatus | null
  isRenewing: boolean
  lastRenewal: Date | null
  renewalCount: number
  error: string | null
  isMonitoring: boolean
}

export interface UseSessionMonitorReturn extends SessionMonitorState {
  // Ações
  forceCheck: () => Promise<void>
  forceRenewal: () => Promise<boolean>
  clearError: () => void
  
  // Utilitários
  formatTimeRemaining: (minutes: number) => string
  getSessionHealth: () => 'healthy' | 'warning' | 'critical' | 'expired'
}

export function useSessionMonitor(): UseSessionMonitorReturn {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const [isRenewing, setIsRenewing] = useState(false)
  const [lastRenewal, setLastRenewal] = useState<Date | null>(null)
  const [renewalCount, setRenewalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  
  // Refs para evitar re-renders desnecessários
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  /**
   * Verifica status da sessão
   */
  const checkSessionStatus = useCallback(async () => {
    if (!mountedRef.current) return
    
    try {
      const status = await sessionRenewalService.checkSessionStatus()
      
      if (mountedRef.current) {
        setSessionStatus(status)
        
        if (status.error) {
          setError(status.error)
        } else {
          setError(null)
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar sessão'
        setError(errorMessage)
      }
    }
  }, [])

  /**
   * Força verificação da sessão
   */
  const forceCheck = useCallback(async () => {
    await checkSessionStatus()
  }, [checkSessionStatus])

  /**
   * Força renovação da sessão
   */
  const forceRenewal = useCallback(async (): Promise<boolean> => {
    if (isRenewing) {
      return false
    }

    setIsRenewing(true)
    setError(null)

    try {
      const result = await sessionRenewalService.renewToken()
      
      if (mountedRef.current) {
        if (result.success) {
          setLastRenewal(new Date())
          setRenewalCount(prev => prev + 1)
          
          // Verificar status atualizado
          await checkSessionStatus()
          
          return true
        } else {
          setError(result.error || 'Falha na renovação')
          return false
        }
      }
      
      return result.success
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Erro na renovação'
        setError(errorMessage)
      }
      return false
    } finally {
      if (mountedRef.current) {
        setIsRenewing(false)
      }
    }
  }, [isRenewing, checkSessionStatus])

  /**
   * Limpa erro atual
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Formata tempo restante para exibição
   */
  const formatTimeRemaining = useCallback((minutes: number): string => {
    if (minutes <= 0) return '0 min'
    if (minutes < 60) return `${minutes} min`
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    
    return `${hours}h ${remainingMinutes}min`
  }, [])

  /**
   * Avalia saúde da sessão
   */
  const getSessionHealth = useCallback((): 'healthy' | 'warning' | 'critical' | 'expired' => {
    if (!sessionStatus || !sessionStatus.isActive) {
      return 'expired'
    }
    
    const timeRemaining = sessionStatus.timeRemainingMinutes
    
    if (timeRemaining <= 5) {
      return 'critical'
    } else if (timeRemaining <= 15) {
      return 'warning'
    } else {
      return 'healthy'
    }
  }, [sessionStatus])

  /**
   * Listener para eventos de renovação automática
   */
  useEffect(() => {
    const handleSessionRenewed = (event: CustomEvent) => {
      if (!mountedRef.current) return
      
      console.log('🔄 Hook: Sessão renovada automaticamente')
      setLastRenewal(new Date(event.detail.renewalTime))
      setRenewalCount(event.detail.totalRenewals)
      
      // Atualizar status da sessão
      checkSessionStatus()
    }

    const handleRenewalError = (event: CustomEvent) => {
      if (!mountedRef.current) return
      
      console.log('❌ Hook: Erro na renovação automática')
      setError(event.detail.error || 'Erro na renovação automática')
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('session-renewed', handleSessionRenewed as EventListener)
      window.addEventListener('session-renewal-error', handleRenewalError as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('session-renewed', handleSessionRenewed as EventListener)
        window.removeEventListener('session-renewal-error', handleRenewalError as EventListener)
      }
    }
  }, [checkSessionStatus])

  /**
   * Monitoramento periódico quando há uploads ativos
   */
  useEffect(() => {
    const startMonitoring = () => {
      if (checkIntervalRef.current) return
      
      console.log('🚀 Hook: Iniciando monitoramento de sessão')
      setIsMonitoring(true)
      
      // Verificação inicial
      checkSessionStatus()
      
      // Verificações periódicas a cada 2 minutos (mais frequente que o manager)
      checkIntervalRef.current = setInterval(() => {
        checkSessionStatus()
      }, 2 * 60 * 1000)
    }

    const stopMonitoring = () => {
      if (!checkIntervalRef.current) return
      
      console.log('🛑 Hook: Parando monitoramento de sessão')
      setIsMonitoring(false)
      
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }

    // Verificar se há uploads ativos
    const hasActiveUploads = uploadSessionManager.hasActiveUploads()
    
    if (hasActiveUploads) {
      startMonitoring()
    } else {
      stopMonitoring()
    }

    // Verificar periodicamente se há uploads ativos
    const uploadCheckInterval = setInterval(() => {
      const hasUploads = uploadSessionManager.hasActiveUploads()
      
      if (hasUploads && !checkIntervalRef.current) {
        startMonitoring()
      } else if (!hasUploads && checkIntervalRef.current) {
        stopMonitoring()
      }
    }, 10000) // Verificar a cada 10 segundos

    return () => {
      stopMonitoring()
      clearInterval(uploadCheckInterval)
    }
  }, [checkSessionStatus])

  /**
   * Cleanup no unmount
   */
  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [])

  return {
    // Estado
    sessionStatus,
    isRenewing,
    lastRenewal,
    renewalCount,
    error,
    isMonitoring,
    
    // Ações
    forceCheck,
    forceRenewal,
    clearError,
    
    // Utilitários
    formatTimeRemaining,
    getSessionHealth
  }
}
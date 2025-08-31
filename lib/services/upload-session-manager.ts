/**
 * Gerenciador de sessão durante uploads ativos
 * Monitora e renova automaticamente a sessão enquanto há uploads em progresso
 */

import { sessionRenewalService, type SessionStatus } from './session-renewal-service'

export interface UploadSessionContext {
  uploadId: string
  startTime: Date
  userId: string
  fileName: string
  fileSize: number
  sessionRenewals: Date[]
}

export interface SessionMonitoringStats {
  activeUploads: number
  totalRenewals: number
  isMonitoring: boolean
  lastCheck: Date | null
  errors: string[]
}

export class UploadSessionManager {
  private static instance: UploadSessionManager
  private activeUploads = new Map<string, UploadSessionContext>()
  private monitoringInterval: NodeJS.Timeout | null = null
  private isMonitoring = false
  private totalRenewals = 0
  private lastCheck: Date | null = null
  private errors: string[] = []

  // Configurações
  private readonly MONITORING_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_ERRORS_STORED = 10

  private constructor() {}

  static getInstance(): UploadSessionManager {
    if (!UploadSessionManager.instance) {
      UploadSessionManager.instance = new UploadSessionManager()
    }
    return UploadSessionManager.instance
  }

  /**
   * Registra um upload ativo
   */
  registerActiveUpload(
    uploadId: string, 
    userId: string, 
    fileName: string, 
    fileSize: number
  ): void {
    console.log(`📝 UploadSessionManager: Registrando upload ativo - ${fileName}`)
    
    const context: UploadSessionContext = {
      uploadId,
      startTime: new Date(),
      userId,
      fileName,
      fileSize,
      sessionRenewals: []
    }

    this.activeUploads.set(uploadId, context)
    
    // Iniciar monitoramento se não estiver ativo
    if (!this.isMonitoring) {
      this.startSessionMonitoring()
    }

    console.log(`📊 Total de uploads ativos: ${this.activeUploads.size}`)
  }

  /**
   * Remove upload da lista ativa
   */
  unregisterUpload(uploadId: string): void {
    const context = this.activeUploads.get(uploadId)
    
    if (context) {
      console.log(`📝 UploadSessionManager: Removendo upload - ${context.fileName}`)
      this.activeUploads.delete(uploadId)
      
      // Parar monitoramento se não há mais uploads
      if (this.activeUploads.size === 0) {
        this.stopSessionMonitoring()
      }
      
      console.log(`📊 Total de uploads ativos: ${this.activeUploads.size}`)
    }
  }

  /**
   * Verifica se há uploads ativos
   */
  hasActiveUploads(): boolean {
    return this.activeUploads.size > 0
  }

  /**
   * Obtém lista de uploads ativos
   */
  getActiveUploads(): UploadSessionContext[] {
    return Array.from(this.activeUploads.values())
  }

  /**
   * Inicia monitoramento automático de sessão
   */
  startSessionMonitoring(): void {
    if (this.isMonitoring) {
      console.log("⚠️ Monitoramento já está ativo")
      return
    }

    console.log("🚀 UploadSessionManager: Iniciando monitoramento de sessão")
    this.isMonitoring = true
    
    // Primeira verificação imediata
    this.checkAndRenewSession()
    
    // Configurar verificações periódicas
    this.monitoringInterval = setInterval(() => {
      this.checkAndRenewSession()
    }, this.MONITORING_INTERVAL_MS)
  }

  /**
   * Para monitoramento de sessão
   */
  stopSessionMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    console.log("🛑 UploadSessionManager: Parando monitoramento de sessão")
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Verifica e renova sessão se necessário
   */
  private async checkAndRenewSession(): Promise<void> {
    if (!this.hasActiveUploads()) {
      console.log("📊 Nenhum upload ativo, pulando verificação de sessão")
      return
    }

    try {
      console.log("🔍 UploadSessionManager: Verificando status da sessão")
      this.lastCheck = new Date()
      
      const shouldRenew = await sessionRenewalService.shouldAutoRenew()
      
      if (shouldRenew) {
        console.log("🔄 Sessão próxima do vencimento, renovando...")
        
        const result = await sessionRenewalService.renewToken()
        
        if (result.success) {
          this.totalRenewals++
          
          // Registrar renovação em todos os uploads ativos
          const renewalTime = new Date()
          this.activeUploads.forEach(context => {
            context.sessionRenewals.push(renewalTime)
          })
          
          console.log(`✅ Sessão renovada durante uploads (${this.totalRenewals}ª renovação)`)
          
          // Disparar evento para componentes React
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('session-renewed', {
              detail: { 
                renewalTime,
                activeUploads: this.activeUploads.size,
                totalRenewals: this.totalRenewals
              }
            }))
          }
          
        } else {
          const error = `Falha na renovação: ${result.error}`
          this.addError(error)
          console.error("❌", error)
          
          // Disparar evento de erro
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('session-renewal-error', {
              detail: { 
                error: result.error,
                activeUploads: this.activeUploads.size
              }
            }))
          }
        }
      } else {
        const timeRemaining = await sessionRenewalService.getTokenTimeRemaining()
        console.log(`✅ Sessão OK. Tempo restante: ${timeRemaining} minutos`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      this.addError(`Erro no monitoramento: ${errorMessage}`)
      console.error("❌ Erro durante verificação de sessão:", error)
    }
  }

  /**
   * Adiciona erro à lista (mantém apenas os últimos)
   */
  private addError(error: string): void {
    this.errors.push(`${new Date().toISOString()}: ${error}`)
    
    // Manter apenas os últimos erros
    if (this.errors.length > this.MAX_ERRORS_STORED) {
      this.errors = this.errors.slice(-this.MAX_ERRORS_STORED)
    }
  }

  /**
   * Força verificação imediata da sessão
   */
  async forceSessionCheck(): Promise<SessionStatus> {
    console.log("🔍 UploadSessionManager: Verificação forçada de sessão")
    return await sessionRenewalService.checkSessionStatus()
  }

  /**
   * Força renovação imediata da sessão
   */
  async forceSessionRenewal(): Promise<boolean> {
    console.log("🔄 UploadSessionManager: Renovação forçada de sessão")
    
    const result = await sessionRenewalService.renewToken()
    
    if (result.success) {
      this.totalRenewals++
      
      // Registrar renovação manual
      const renewalTime = new Date()
      this.activeUploads.forEach(context => {
        context.sessionRenewals.push(renewalTime)
      })
      
      console.log("✅ Renovação manual bem-sucedida")
      return true
    } else {
      this.addError(`Renovação manual falhou: ${result.error}`)
      console.error("❌ Renovação manual falhou:", result.error)
      return false
    }
  }

  /**
   * Obtém estatísticas do monitoramento
   */
  getMonitoringStats(): SessionMonitoringStats {
    return {
      activeUploads: this.activeUploads.size,
      totalRenewals: this.totalRenewals,
      isMonitoring: this.isMonitoring,
      lastCheck: this.lastCheck,
      errors: [...this.errors] // Cópia para evitar mutação
    }
  }

  /**
   * Obtém contexto de um upload específico
   */
  getUploadContext(uploadId: string): UploadSessionContext | undefined {
    return this.activeUploads.get(uploadId)
  }

  /**
   * Reset completo (útil para testes)
   */
  reset(): void {
    this.stopSessionMonitoring()
    this.activeUploads.clear()
    this.totalRenewals = 0
    this.lastCheck = null
    this.errors = []
  }
}

// Export da instância singleton
export const uploadSessionManager = UploadSessionManager.getInstance()
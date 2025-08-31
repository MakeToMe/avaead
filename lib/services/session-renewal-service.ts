/**
 * Serviço para gerenciar renovação automática de sessão durante uploads longos
 */

export interface SessionStatus {
  isActive: boolean
  expiresAt: Date | null
  timeRemainingMinutes: number
  isNearExpiry: boolean
  userId?: string
  error?: string
}

export interface RenewalResult {
  success: boolean
  newExpiresAt?: Date
  error?: string
}

export class SessionRenewalService {
  private static instance: SessionRenewalService
  private renewalInProgress = false
  private lastRenewalTime: Date | null = null
  private renewalCount = 0

  // Configurações
  private readonly RENEWAL_THRESHOLD_MINUTES = 10 // Renovar quando restam menos de 10 min
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly INITIAL_RETRY_DELAY = 1000 // 1 segundo
  
  private constructor() {}

  static getInstance(): SessionRenewalService {
    if (!SessionRenewalService.instance) {
      SessionRenewalService.instance = new SessionRenewalService()
    }
    return SessionRenewalService.instance
  }

  /**
   * Verifica o status atual da sessão
   */
  async checkSessionStatus(): Promise<SessionStatus> {
    try {
      console.log("🔍 SessionRenewalService: Verificando status da sessão")
      
      const response = await fetch('/api/auth/session-status', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          isActive: false,
          expiresAt: null,
          timeRemainingMinutes: 0,
          isNearExpiry: false,
          error: errorData.message || `HTTP ${response.status}`
        }
      }

      const data = await response.json()
      
      return {
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        timeRemainingMinutes: data.timeRemainingMinutes || 0,
        isNearExpiry: data.isNearExpiry || false,
        userId: data.userId
      }

    } catch (error) {
      console.error("❌ Erro ao verificar status da sessão:", error)
      return {
        isActive: false,
        expiresAt: null,
        timeRemainingMinutes: 0,
        isNearExpiry: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  /**
   * Verifica se o token está próximo do vencimento
   */
  async isTokenNearExpiry(): Promise<boolean> {
    const status = await this.checkSessionStatus()
    return status.isNearExpiry
  }

  /**
   * Obtém tempo restante do token em minutos
   */
  async getTokenTimeRemaining(): Promise<number> {
    const status = await this.checkSessionStatus()
    return status.timeRemainingMinutes
  }

  /**
   * Renova o token atual com retry automático
   */
  async renewToken(): Promise<RenewalResult> {
    if (this.renewalInProgress) {
      console.log("⏳ Renovação já em progresso, aguardando...")
      return { success: false, error: "Renewal already in progress" }
    }

    this.renewalInProgress = true
    
    try {
      console.log("🔄 SessionRenewalService: Iniciando renovação de token")
      
      const result = await this.attemptRenewalWithRetry()
      
      if (result.success) {
        this.lastRenewalTime = new Date()
        this.renewalCount++
        console.log(`✅ Token renovado com sucesso (${this.renewalCount}ª renovação)`)
      }
      
      return result

    } finally {
      this.renewalInProgress = false
    }
  }

  /**
   * Tenta renovar com retry automático e backoff exponencial
   */
  private async attemptRenewalWithRetry(): Promise<RenewalResult> {
    let lastError: string = ""
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${this.MAX_RETRY_ATTEMPTS} de renovação`)
        
        const response = await fetch('/api/auth/refresh-session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            newExpiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
          }
        }

        // Tratar erros específicos
        const errorData = await response.json().catch(() => ({}))
        lastError = errorData.message || `HTTP ${response.status}`
        
        // Se for rate limit (429), não tentar novamente
        if (response.status === 429) {
          console.log("❌ Rate limit atingido, parando tentativas")
          break
        }
        
        // Se for erro de autenticação (401), não tentar novamente
        if (response.status === 401) {
          console.log("❌ Sessão inválida, parando tentativas")
          break
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network error'
        console.error(`❌ Erro na tentativa ${attempt}:`, lastError)
      }

      // Aguardar antes da próxima tentativa (backoff exponencial)
      if (attempt < this.MAX_RETRY_ATTEMPTS) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return {
      success: false,
      error: lastError || 'All renewal attempts failed'
    }
  }

  /**
   * Verifica se deve renovar automaticamente baseado no tempo restante
   */
  async shouldAutoRenew(): Promise<boolean> {
    const status = await this.checkSessionStatus()
    
    if (!status.isActive) {
      return false
    }

    // Renovar se restam menos de 10 minutos
    return status.timeRemainingMinutes < this.RENEWAL_THRESHOLD_MINUTES
  }

  /**
   * Obtém estatísticas de renovação
   */
  getRenewalStats() {
    return {
      renewalCount: this.renewalCount,
      lastRenewalTime: this.lastRenewalTime,
      isRenewalInProgress: this.renewalInProgress
    }
  }

  /**
   * Reset das estatísticas (útil para testes)
   */
  resetStats() {
    this.renewalCount = 0
    this.lastRenewalTime = null
    this.renewalInProgress = false
  }
}

// Export da instância singleton
export const sessionRenewalService = SessionRenewalService.getInstance()
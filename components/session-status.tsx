/**
 * Componente para exibir status da sessão durante uploads
 * Mostra indicadores discretos e permite renovação manual
 */

import React from 'react'
import { AlertCircle, CheckCircle, Clock, RefreshCw, Shield, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSessionMonitor } from '@/hooks/use-session-monitor'
import { cn } from '@/lib/utils'

interface SessionStatusProps {
  className?: string
  compact?: boolean
  showDetails?: boolean
}

export function SessionStatus({ 
  className, 
  compact = false, 
  showDetails = false 
}: SessionStatusProps) {
  const {
    sessionStatus,
    isRenewing,
    lastRenewal,
    renewalCount,
    error,
    isMonitoring,
    forceRenewal,
    clearError,
    formatTimeRemaining,
    getSessionHealth
  } = useSessionMonitor()

  // Não mostrar se não há sessão ou não está monitorando
  if (!sessionStatus || !isMonitoring) {
    return null
  }

  const health = getSessionHealth()
  const timeRemaining = sessionStatus.timeRemainingMinutes

  // Configurações visuais baseadas na saúde da sessão
  const getHealthConfig = () => {
    switch (health) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'default' as const,
          message: 'Sessão ativa'
        }
      case 'warning':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeVariant: 'secondary' as const,
          message: 'Sessão expira em breve'
        }
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'destructive' as const,
          message: 'Renovação necessária'
        }
      case 'expired':
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          message: 'Sessão expirada'
        }
    }
  }

  const config = getHealthConfig()
  const Icon = config.icon

  // Versão compacta (apenas badge)
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant={config.badgeVariant}
          className="flex items-center gap-1 text-xs"
        >
          <Icon className="h-3 w-3" />
          {formatTimeRemaining(timeRemaining)}
        </Badge>
        
        {isRenewing && (
          <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
        )}
      </div>
    )
  }

  // Versão completa
  return (
    <Card className={cn(
      "transition-all duration-200",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            
            <div className="flex flex-col">
              <span className={cn("text-sm font-medium", config.color)}>
                {config.message}
              </span>
              
              {showDetails && (
                <span className="text-xs text-gray-600">
                  Tempo restante: {formatTimeRemaining(timeRemaining)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de renovação */}
            {isRenewing && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Renovando...
              </div>
            )}

            {/* Botão de renovação manual */}
            {(health === 'critical' || health === 'expired' || error) && !isRenewing && (
              <Button
                size="sm"
                variant="outline"
                onClick={forceRenewal}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Renovar
              </Button>
            )}
          </div>
        </div>

        {/* Detalhes adicionais */}
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">Renovações:</span> {renewalCount}
              </div>
              
              {lastRenewal && (
                <div>
                  <span className="font-medium">Última:</span>{' '}
                  {lastRenewal.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-red-700">{error}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearError}
                className="h-5 w-5 p-0 text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Componente simplificado para mostrar apenas o ícone de status
 */
export function SessionStatusIcon({ className }: { className?: string }) {
  const { sessionStatus, isRenewing, getSessionHealth } = useSessionMonitor()

  if (!sessionStatus) {
    return null
  }

  const health = getSessionHealth()

  if (isRenewing) {
    return (
      <RefreshCw className={cn("h-4 w-4 animate-spin text-blue-600", className)} />
    )
  }

  switch (health) {
    case 'healthy':
      return <Shield className={cn("h-4 w-4 text-green-600", className)} />
    case 'warning':
      return <Clock className={cn("h-4 w-4 text-yellow-600", className)} />
    case 'critical':
      return <AlertCircle className={cn("h-4 w-4 text-orange-600", className)} />
    case 'expired':
      return <WifiOff className={cn("h-4 w-4 text-red-600", className)} />
    default:
      return null
  }
}

/**
 * Hook para usar status da sessão em outros componentes
 */
export function useSessionStatus() {
  const monitor = useSessionMonitor()
  
  return {
    ...monitor,
    isHealthy: monitor.getSessionHealth() === 'healthy',
    needsAttention: ['warning', 'critical', 'expired'].includes(monitor.getSessionHealth()),
    canRenew: !monitor.isRenewing && monitor.sessionStatus?.isActive
  }
}
"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context-v2'
import { authService } from '@/lib/auth-service-v2'
import { createLogger } from '@/lib/logger-factory'

const logger = createLogger('AuthGuard', 'WARN', 'Proteção de rotas autenticadas')

interface AuthGuardV2Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireRole?: string
}

/**
 * AuthGuard V2 - Proteção de rotas limpa e robusta
 * 
 * Características:
 * - Loading states apropriados
 * - Redirecionamento inteligente
 * - Suporte a roles
 * - Sem flashes de conteúdo
 */
export default function AuthGuardV2({ 
  children, 
  fallback, 
  redirectTo = '/',
  requireRole 
}: AuthGuardV2Props) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [hasCheckedSession, setHasCheckedSession] = React.useState(false)
  const [shouldRedirect, setShouldRedirect] = React.useState(false)
  const [timeoutReached, setTimeoutReached] = React.useState(false)
  
  // Fazer verificação de sessão apenas uma vez quando o guard é montado
  React.useEffect(() => {
    const checkSession = async () => {
      if (!hasCheckedSession) {
        try {
          await authService.checkSession()
        } catch (error) {
          logger.warn('Erro na verificação de sessão', {}, error as Error)
        } finally {
          setHasCheckedSession(true)
        }
      }
    }
    
    checkSession()
  }, [hasCheckedSession])
  
  // Timeout de segurança para evitar loading infinito
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasCheckedSession) {
        logger.warn('Timeout na verificação de sessão - forçando continuação')
        setHasCheckedSession(true)
        setTimeoutReached(true)
      }
    }, 5000) // 5 segundos
    
    return () => clearTimeout(timeout)
  }, [hasCheckedSession])
  
  // Gerenciar redirecionamento (sempre no topo, nunca condicional)
  React.useEffect(() => {
    if (shouldRedirect) {
      router.push(redirectTo)
    }
  }, [shouldRedirect, router, redirectTo])
  
  // Mostrar loading enquanto verifica autenticação (com timeout)
  if ((isLoading || !hasCheckedSession) && !timeoutReached) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Se não está autenticado, preparar redirecionamento
  if (!isAuthenticated || !user) {
    if (!shouldRedirect) {
      setShouldRedirect(true)
    }
    
    // Mostrar fallback enquanto redireciona
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    )
  }
  
  // Se requer role específica, verificar
  if (requireRole && !user.perfis.includes(requireRole)) {
    logger.warn('Usuário sem permissão necessária', { 
      required: requireRole, 
      userRoles: user.perfis 
    })
    
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    )
  }
  
  // Usuário autenticado e com permissões - mostrar conteúdo
  return <>{children}</>
}

/**
 * Hook para verificar se usuário tem role específica
 */
export function useRequireRole(role: string): boolean {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated || !user) {
    return false
  }
  
  return user.perfis.includes(role)
}

/**
 * Hook para verificar se usuário é admin
 */
export function useIsAdmin(): boolean {
  return useRequireRole('admin')
}

/**
 * Hook para verificar se usuário é instrutor
 */
export function useIsInstructor(): boolean {
  return useRequireRole('instrutor')
}

// Exports nomeados para compatibilidade
export { AuthGuardV2 as AuthGuard }
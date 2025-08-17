'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { useVerificacaoAcesso } from '@/hooks/useVerificacaoAcesso';

interface ProtecaoAulaProps {
  aulaId: string;
  usuarioId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirecionarSeNegado?: boolean;
}

export function ProtecaoAula({
  aulaId,
  usuarioId,
  children,
  fallback,
  redirecionarSeNegado = false
}: ProtecaoAulaProps) {
  const router = useRouter();
  const { resultado, carregando, erro, temAcesso } = useVerificacaoAcesso({
    aulaId,
    usuarioId,
    autoVerificar: true
  });

  useEffect(() => {
    if (!carregando && !temAcesso && redirecionarSeNegado) {
      const params = new URLSearchParams({
        motivo: resultado?.motivo || 'Acesso negado',
        aula_id: aulaId
      });
      router.push(`/acesso-negado?${params.toString()}`);
    }
  }, [carregando, temAcesso, redirecionarSeNegado, resultado, aulaId, router]);

  // Estado de carregamento
  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro na Verificação</h3>
          <p className="text-gray-600 mb-4">{erro}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Acesso permitido - renderizar conteúdo
  if (temAcesso) {
    return <>{children}</>;
  }

  // Acesso negado - renderizar fallback ou componente padrão
  if (fallback) {
    return <>{fallback}</>;
  }

  // Componente padrão de acesso negado
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center max-w-md mx-auto p-6">
        <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h3>
        <p className="text-gray-600 mb-6">
          {resultado?.motivo || 'Você não tem permissão para acessar este conteúdo.'}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Voltar
          </button>
          
          <button
            onClick={() => {
              const params = new URLSearchParams({
                motivo: resultado?.motivo || 'Acesso negado',
                aula_id: aulaId
              });
              router.push(`/acesso-negado?${params.toString()}`);
            }}
            className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Mais Informações
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente para proteger seções específicas dentro de uma página
 */
interface ProtecaoSecaoProps {
  aulaId: string;
  usuarioId: string;
  children: React.ReactNode;
  mensagem?: string;
  className?: string;
}

export function ProtecaoSecao({
  aulaId,
  usuarioId,
  children,
  mensagem = 'Conteúdo restrito',
  className = ''
}: ProtecaoSecaoProps) {
  const { temAcesso, carregando } = useVerificacaoAcesso({
    aulaId,
    usuarioId,
    autoVerificar: true
  });

  if (carregando) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-32 ${className}`}></div>
    );
  }

  if (!temAcesso) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center ${className}`}>
        <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">{mensagem}</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * HOC para proteger páginas inteiras
 */
export function comProtecaoAula<T extends object>(
  Component: React.ComponentType<T>,
  aulaIdExtractor: (props: T) => string,
  usuarioIdExtractor: (props: T) => string
) {
  return function ComponenteProtegido(props: T) {
    const aulaId = aulaIdExtractor(props);
    const usuarioId = usuarioIdExtractor(props);

    return (
      <ProtecaoAula
        aulaId={aulaId}
        usuarioId={usuarioId}
        redirecionarSeNegado={true}
      >
        <Component {...props} />
      </ProtecaoAula>
    );
  };
}
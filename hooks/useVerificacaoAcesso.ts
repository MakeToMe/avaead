/**
 * Hook para verificação de acesso a aulas no frontend
 */

import { useState, useEffect } from 'react';
import { VerificacaoAcessoResult } from '@/lib/middleware/verificacao-acesso';

interface UseVerificacaoAcessoOptions {
  aulaId: string;
  usuarioId: string;
  autoVerificar?: boolean;
}

interface UseVerificacaoAcessoReturn {
  resultado: VerificacaoAcessoResult | null;
  carregando: boolean;
  erro: string | null;
  verificar: () => Promise<void>;
  temAcesso: boolean;
}

export function useVerificacaoAcesso({
  aulaId,
  usuarioId,
  autoVerificar = true
}: UseVerificacaoAcessoOptions): UseVerificacaoAcessoReturn {
  const [resultado, setResultado] = useState<VerificacaoAcessoResult | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const verificar = async () => {
    if (!aulaId || !usuarioId) {
      setErro('IDs de aula e usuário são obrigatórios');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const response = await fetch(`/api/aulas/${aulaId}/verificar-acesso?usuario_id=${usuarioId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao verificar acesso');
      }

      const data = await response.json();
      setResultado(data);
    } catch (error) {
      console.error('Erro na verificação de acesso:', error);
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
      setResultado({
        permitido: false,
        motivo: 'Erro na verificação de acesso',
        usuario_id: usuarioId,
        aula_id: aulaId
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (autoVerificar && aulaId && usuarioId) {
      verificar();
    }
  }, [aulaId, usuarioId, autoVerificar]);

  return {
    resultado,
    carregando,
    erro,
    verificar,
    temAcesso: resultado?.permitido || false
  };
}

/**
 * Hook simplificado para verificar apenas se tem acesso
 */
export function useTemAcessoAula(aulaId: string, usuarioId: string): boolean {
  const { temAcesso } = useVerificacaoAcesso({
    aulaId,
    usuarioId,
    autoVerificar: true
  });

  return temAcesso;
}

/**
 * Hook para verificar acesso a múltiplas aulas
 */
export function useVerificacaoAcessoMultiplas(
  aulas: Array<{ id: string }>,
  usuarioId: string
) {
  const [resultados, setResultados] = useState<Record<string, VerificacaoAcessoResult>>({});
  const [carregando, setCarregando] = useState(false);

  const verificarTodas = async () => {
    if (!usuarioId || aulas.length === 0) return;

    setCarregando(true);

    try {
      const promises = aulas.map(async (aula) => {
        const response = await fetch(`/api/aulas/${aula.id}/verificar-acesso?usuario_id=${usuarioId}`);
        const data = await response.json();
        return { aulaId: aula.id, resultado: data };
      });

      const resultadosArray = await Promise.all(promises);
      const resultadosMap = resultadosArray.reduce((acc, { aulaId, resultado }) => {
        acc[aulaId] = resultado;
        return acc;
      }, {} as Record<string, VerificacaoAcessoResult>);

      setResultados(resultadosMap);
    } catch (error) {
      console.error('Erro ao verificar acessos múltiplos:', error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    verificarTodas();
  }, [aulas.length, usuarioId]);

  return {
    resultados,
    carregando,
    verificarTodas,
    getAcesso: (aulaId: string) => resultados[aulaId]?.permitido || false,
    getTipoAcesso: (aulaId: string) => resultados[aulaId]?.tipo_acesso,
    getMotivo: (aulaId: string) => resultados[aulaId]?.motivo
  };
}
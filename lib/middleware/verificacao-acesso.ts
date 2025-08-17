/**
 * Middleware para verificação de acesso a aulas
 * Garante que apenas usuários autorizados possam acessar conteúdo de aulas
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface VerificacaoAcessoResult {
  permitido: boolean;
  motivo?: string;
  tipo_acesso?: 'aula_publica' | 'convidado_curso' | 'convite_especifico';
  usuario_id?: string;
  aula_id?: string;
}

export class MiddlewareVerificacaoAcesso {
  /**
   * Verifica se um usuário pode acessar uma aula específica
   */
  static async verificarAcessoAula(
    aulaId: string, 
    usuarioId: string,
    logTentativa: boolean = true
  ): Promise<VerificacaoAcessoResult> {
    try {
      // 1. Buscar dados da aula
      const { data: aula, error: aulaError } = await supabase
        .from('aulas')
        .select('id, titulo, privada, modulo_id, ativo')
        .eq('id', aulaId)
        .single();

      if (aulaError || !aula) {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, false, 'Aula não encontrada');
        }
        return {
          permitido: false,
          motivo: 'Aula não encontrada',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 2. Verificar se a aula está ativa
      if (!aula.ativo) {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, false, 'Aula inativa');
        }
        return {
          permitido: false,
          motivo: 'Aula não está disponível',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 2.5. Buscar curso_id através do módulo
      const { data: modulo, error: moduloError } = await supabase
        .from('modulos')
        .select('curso_id')
        .eq('id', aula.modulo_id)
        .single();

      if (moduloError || !modulo) {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, false, 'Módulo não encontrado');
        }
        return {
          permitido: false,
          motivo: 'Módulo da aula não encontrado',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 3. Verificar matrícula no curso
      const { data: matricula, error: matriculaError } = await supabase
        .from('matriculas')
        .select('id, tipo_acesso, status')
        .eq('curso_id', modulo.curso_id)
        .eq('aluno_id', usuarioId)
        .single();

      if (matriculaError || !matricula) {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, false, 'Não matriculado no curso');
        }
        return {
          permitido: false,
          motivo: 'Você não está matriculado neste curso',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 4. Verificar se a matrícula está ativa
      if (matricula.status !== 'ativa') {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, false, 'Matrícula inativa');
        }
        return {
          permitido: false,
          motivo: 'Sua matrícula neste curso não está ativa',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 5. Se aula é pública, permitir acesso
      if (!aula.privada) {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, true, 'Aula pública');
        }
        return {
          permitido: true,
          tipo_acesso: 'aula_publica',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 6. Se aula é privada, verificar tipo de acesso
      if (matricula.tipo_acesso === 'convidado_curso') {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, true, 'Convidado do curso');
        }
        return {
          permitido: true,
          tipo_acesso: 'convidado_curso',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 7. Verificar permissão específica para a aula
      const { data: permissao } = await supabase
        .from('aula_permissoes')
        .select('id, tipo_permissao')
        .eq('aula_id', aulaId)
        .eq('aluno_id', usuarioId)
        .single();

      if (permissao) {
        if (logTentativa) {
          await this.logTentativaAcesso(aulaId, usuarioId, true, 'Convite específico');
        }
        return {
          permitido: true,
          tipo_acesso: 'convite_especifico',
          usuario_id: usuarioId,
          aula_id: aulaId
        };
      }

      // 8. Sem permissão para aula privada
      if (logTentativa) {
        await this.logTentativaAcesso(aulaId, usuarioId, false, 'Aula privada sem permissão');
      }
      return {
        permitido: false,
        motivo: 'Esta aula requer convite específico do instrutor',
        usuario_id: usuarioId,
        aula_id: aulaId
      };

    } catch (error) {
      console.error('Erro na verificação de acesso:', error);
      if (logTentativa) {
        await this.logTentativaAcesso(aulaId, usuarioId, false, 'Erro interno');
      }
      return {
        permitido: false,
        motivo: 'Erro interno na verificação de acesso',
        usuario_id: usuarioId,
        aula_id: aulaId
      };
    }
  }

  /**
   * Middleware para APIs que precisam verificar acesso a aulas
   */
  static async middlewareAPI(
    request: NextRequest,
    aulaId: string,
    usuarioId: string
  ): Promise<NextResponse | null> {
    const resultado = await this.verificarAcessoAula(aulaId, usuarioId);

    if (!resultado.permitido) {
      return NextResponse.json(
        { 
          error: 'Acesso negado',
          motivo: resultado.motivo,
          codigo: 'ACESSO_NEGADO'
        },
        { status: 403 }
      );
    }

    // Adicionar informações de acesso ao request (se possível)
    // request.nextUrl.searchParams.set('tipo_acesso', resultado.tipo_acesso || '');

    return null; // Permitir continuação
  }

  /**
   * Verifica se um usuário é instrutor de um curso
   */
  static async verificarInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    try {
      const { data: curso } = await supabase
        .from('cursos')
        .select('instrutor_id')
        .eq('id', cursoId)
        .eq('instrutor_id', usuarioId)
        .single();

      return !!curso;
    } catch (error) {
      console.error('Erro ao verificar instrutor:', error);
      return false;
    }
  }

  /**
   * Registra tentativa de acesso para auditoria
   */
  private static async logTentativaAcesso(
    aulaId: string,
    usuarioId: string,
    sucesso: boolean,
    motivo: string
  ): Promise<void> {
    try {
      // Registrar no sistema de auditoria
      const { sistemaAuditoria } = await import('../auditoria/sistema-auditoria');
      await sistemaAuditoria.registrarAcessoAula(
        usuarioId,
        aulaId,
        sucesso,
        motivo,
        motivo,
        'unknown', // TODO: Capturar IP real
        'unknown'  // TODO: Capturar User-Agent real
      );

    } catch (error) {
      console.error('Erro ao registrar log de acesso:', error);
    }
  }

  /**
   * Middleware para páginas Next.js que exibem conteúdo de aulas
   */
  static criarMiddlewarePagina(aulaId: string) {
    return async (request: NextRequest) => {
      // TODO: Extrair usuário ID do token/sessão
      const usuarioId = 'current_user_id'; // Placeholder

      const resultado = await this.verificarAcessoAula(aulaId, usuarioId);

      if (!resultado.permitido) {
        // Redirecionar para página de acesso negado
        const url = new URL('/acesso-negado', request.url);
        url.searchParams.set('motivo', resultado.motivo || 'Acesso negado');
        url.searchParams.set('aula_id', aulaId);
        
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    };
  }
}

// Função utilitária para uso em componentes
export async function verificarAcessoAula(aulaId: string, usuarioId: string) {
  return MiddlewareVerificacaoAcesso.verificarAcessoAula(aulaId, usuarioId, false);
}

// Função utilitária para verificar se é instrutor
export async function verificarInstrutor(cursoId: string, usuarioId: string) {
  return MiddlewareVerificacaoAcesso.verificarInstrutor(cursoId, usuarioId);
}
/**
 * Middleware para verificação de acesso a aulas
 * Garante que apenas usuários autorizados possam acessar conteúdo de aulas
 */

import { NextRequest, NextResponse } from 'next/server';

// TODO: Converter para PostgreSQL - temporariamente desabilitado

export interface VerificacaoAcessoResult {
  permitido: boolean;
  motivo?: string;
  tipo_acesso?: 'aula_publica' | 'convidado_curso' | 'convite_especifico';
  usuario_id?: string;
  aula_id?: string;
}

export class VerificacaoAcessoMiddleware {
  static async verificarAcessoAula(
    aulaId: string,
    usuarioId: string
  ): Promise<VerificacaoAcessoResult> {
    // TODO: Implementar verificação com PostgreSQL
    return {
      permitido: false,
      motivo: 'Verificação de acesso temporariamente desabilitada'
    };
  }

  static async verificarInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    // TODO: Implementar verificação com PostgreSQL
    return false;
  }

  static criarRespostaAcessoNegado(motivo: string): NextResponse {
    return NextResponse.json(
      { 
        error: 'Acesso negado', 
        motivo,
        codigo: 'ACESSO_NEGADO'
      },
      { status: 403 }
    );
  }

  static criarRespostaErroInterno(erro: string): NextResponse {
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        detalhes: erro,
        codigo: 'ERRO_INTERNO'
      },
      { status: 500 }
    );
  }
}
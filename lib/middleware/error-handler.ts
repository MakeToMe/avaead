import { NextResponse } from 'next/server';
import { z } from 'zod';

// Códigos de erro padronizados
export enum CodigosErro {
  // Convites
  CONVITE_NAO_ENCONTRADO = 'CONVITE_NAO_ENCONTRADO',
  CONVITE_EXPIRADO = 'CONVITE_EXPIRADO',
  CONVITE_JA_ACEITO = 'CONVITE_JA_ACEITO',
  CONVITE_DUPLICADO = 'CONVITE_DUPLICADO',
  
  // Permissões
  NAO_AUTORIZADO = 'NAO_AUTORIZADO',
  NAO_E_INSTRUTOR = 'NAO_E_INSTRUTOR',
  ALUNO_NAO_MATRICULADO = 'ALUNO_NAO_MATRICULADO',
  USUARIO_JA_MATRICULADO = 'USUARIO_JA_MATRICULADO',
  
  // Aulas
  AULA_NAO_ENCONTRADA = 'AULA_NAO_ENCONTRADA',
  AULAS_NAO_PERTENCEM_CURSO = 'AULAS_NAO_PERTENCEM_CURSO',
  AULA_PRIVADA_SEM_PERMISSAO = 'AULA_PRIVADA_SEM_PERMISSAO',
  
  // Validação
  DADOS_INVALIDOS = 'DADOS_INVALIDOS',
  EMAIL_INVALIDO = 'EMAIL_INVALIDO',
  TOKEN_INVALIDO = 'TOKEN_INVALIDO',
  
  // Sistema
  ERRO_INTERNO = 'ERRO_INTERNO',
  ERRO_BANCO_DADOS = 'ERRO_BANCO_DADOS'
}

// Classe de erro personalizada
export class ConviteError extends Error {
  constructor(
    public codigo: CodigosErro,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ConviteError';
  }
}

// Mapeamento de erros do serviço para códigos HTTP
const errorMapping: Record<string, { codigo: CodigosErro; statusCode: number }> = {
  'Usuário não é instrutor deste curso': { codigo: CodigosErro.NAO_E_INSTRUTOR, statusCode: 403 },
  'Já existe um convite pendente para este email neste curso': { codigo: CodigosErro.CONVITE_DUPLICADO, statusCode: 409 },
  'Usuário já está matriculado neste curso': { codigo: CodigosErro.USUARIO_JA_MATRICULADO, statusCode: 409 },
  'Uma ou mais aulas não pertencem a este curso': { codigo: CodigosErro.AULAS_NAO_PERTENCEM_CURSO, statusCode: 400 },
  'Convite não encontrado': { codigo: CodigosErro.CONVITE_NAO_ENCONTRADO, statusCode: 404 },
  'Convite já foi aceito': { codigo: CodigosErro.CONVITE_JA_ACEITO, statusCode: 409 },
  'Convite expirado': { codigo: CodigosErro.CONVITE_EXPIRADO, statusCode: 410 },
  'Aluno não está matriculado neste curso': { codigo: CodigosErro.ALUNO_NAO_MATRICULADO, statusCode: 404 },
  'Erro ao criar usuário': { codigo: CodigosErro.ERRO_INTERNO, statusCode: 500 },
  'Erro ao salvar convite no banco de dados': { codigo: CodigosErro.ERRO_BANCO_DADOS, statusCode: 500 },
  'Erro ao atualizar tipo de acesso': { codigo: CodigosErro.ERRO_BANCO_DADOS, statusCode: 500 },
  'Erro interno do servidor': { codigo: CodigosErro.ERRO_INTERNO, statusCode: 500 }
};

/**
 * Middleware para tratamento de erros das APIs
 * @param error Erro capturado
 * @returns NextResponse com erro formatado
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Erro de validação Zod
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Dados inválidos', 
        codigo: CodigosErro.DADOS_INVALIDOS,
        detalhes: error.errors.map(err => ({
          campo: err.path.join('.'),
          mensagem: err.message
        }))
      },
      { status: 400 }
    );
  }

  // Erro personalizado
  if (error instanceof ConviteError) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message, 
        codigo: error.codigo 
      },
      { status: error.statusCode }
    );
  }

  // Erro do serviço (string)
  if (typeof error === 'string') {
    const mapped = errorMapping[error];
    if (mapped) {
      return NextResponse.json(
        { 
          success: false,
          error: error,
          codigo: mapped.codigo
        },
        { status: mapped.statusCode }
      );
    }
  }

  // Erro com propriedade error (resultado do serviço)
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
    const mapped = errorMapping[error.error];
    if (mapped) {
      return NextResponse.json(
        { 
          success: false,
          error: error.error,
          codigo: mapped.codigo
        },
        { status: mapped.statusCode }
      );
    }
  }

  // Erro genérico
  return NextResponse.json(
    { 
      success: false,
      error: 'Erro interno do servidor',
      codigo: CodigosErro.ERRO_INTERNO
    },
    { status: 500 }
  );
}

/**
 * Wrapper para handlers de API com tratamento de erro automático
 * @param handler Função handler da API
 * @returns Handler com tratamento de erro
 */
export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
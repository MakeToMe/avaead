import { NextRequest, NextResponse } from 'next/server';
import { conviteService } from '@/lib/convite-service';
import { AlterarTipoAcessoSchema } from '@/lib/schemas/convites';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso
 * Altera o tipo de acesso de um aluno matriculado
 */
async function handlePut(
  request: NextRequest,
  { params }: { params: { id: string; aluno_id: string } }
): Promise<NextResponse> {
  // Validar dados da requisição
  const body = await request.json();
  const dadosValidados = AlterarTipoAcessoSchema.parse(body);

  // Alterar tipo de acesso
  const resultado = await conviteService.alterarTipoAcesso(
    params.id,
    params.aluno_id,
    dadosValidados.tipo_acesso,
    dadosValidados.instrutor_id
  );

  if (!resultado.success) {
    throw resultado;
  }

  // Buscar dados atualizados do aluno
  const supabase = (conviteService as any).supabase;
  const { data: matricula } = await supabase
    .from('matriculas')
    .select(`
      id,
      tipo_acesso,
      adicionado_por,
      atualizado_em,
      users:aluno_id (
        uid,
        nome,
        email
      )
    `)
    .eq('curso_id', params.id)
    .eq('aluno_id', params.aluno_id)
    .single();

  return NextResponse.json({
    success: true,
    message: 'Tipo de acesso alterado com sucesso',
    data: {
      aluno_id: params.aluno_id,
      curso_id: params.id,
      tipo_acesso_anterior: body.tipo_acesso_anterior || 'desconhecido',
      tipo_acesso_atual: dadosValidados.tipo_acesso,
      alterado_por: dadosValidados.instrutor_id,
      alterado_em: new Date().toISOString(),
      matricula: matricula
    }
  });
}

export const PUT = withErrorHandler(handlePut);

/**
 * GET /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso
 * Consulta o tipo de acesso atual de um aluno
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string; aluno_id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const instrutorId = searchParams.get('instrutor_id');

  if (!instrutorId) {
    return NextResponse.json({
      success: false,
      error: 'instrutor_id é obrigatório'
    }, { status: 400 });
  }

  // Verificar se é instrutor do curso
  const isInstrutor = await (conviteService as any).verificarInstrutor(params.id, instrutorId);
  if (!isInstrutor) {
    return NextResponse.json({
      success: false,
      error: 'Usuário não é instrutor deste curso'
    }, { status: 403 });
  }

  // Buscar dados da matrícula
  const supabase = (conviteService as any).supabase;
  const { data: matricula, error } = await supabase
    .from('matriculas')
    .select(`
      id,
      tipo_acesso,
      data_matricula,
      adicionado_por,
      progresso_percentual,
      status,
      criado_em,
      atualizado_em,
      users:aluno_id (
        uid,
        nome,
        email
      )
    `)
    .eq('curso_id', params.id)
    .eq('aluno_id', params.aluno_id)
    .single();

  if (error || !matricula) {
    return NextResponse.json({
      success: false,
      error: 'Aluno não está matriculado neste curso'
    }, { status: 404 });
  }

  // Buscar permissões específicas se existirem
  const { data: permissoes } = await supabase
    .from('aula_permissoes')
    .select(`
      id,
      aula_id,
      tipo_permissao,
      criado_em,
      aulas:aula_id (
        id,
        titulo
      )
    `)
    .eq('aluno_id', params.aluno_id)
    .eq('tipo_permissao', 'convite_especifico');

  return NextResponse.json({
    success: true,
    data: {
      matricula,
      permissoes_especificas: permissoes || [],
      total_permissoes_especificas: permissoes?.length || 0
    }
  });
}

export const GET = withErrorHandler(handleGet);
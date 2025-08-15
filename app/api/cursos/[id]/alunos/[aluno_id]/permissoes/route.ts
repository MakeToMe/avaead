import { NextRequest, NextResponse } from 'next/server';
import { aulaPermissoesService } from '@/lib/aula-permissoes-service';
import { ListarPermissoesSchema } from '@/lib/schemas/convites';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * GET /api/cursos/[id]/alunos/[aluno_id]/permissoes?instrutor_id=uuid
 * Lista todas as permissões específicas de um aluno em um curso
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

  // Validar instrutor_id
  const dadosValidados = ListarPermissoesSchema.parse({ instrutor_id: instrutorId });

  // Listar permissões do aluno
  const resultado = await aulaPermissoesService.listarPermissoesAluno(
    params.id,
    params.aluno_id,
    dadosValidados.instrutor_id
  );

  if (!resultado.success) {
    throw resultado;
  }

  return NextResponse.json({
    success: true,
    data: resultado.data
  });
}

export const GET = withErrorHandler(handleGet);

/**
 * POST /api/cursos/[id]/alunos/[aluno_id]/permissoes
 * Concede múltiplas permissões específicas para um aluno
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string; aluno_id: string } }
): Promise<NextResponse> {
  // Validar dados da requisição
  const body = await request.json();
  const { aula_ids, instrutor_id } = body;

  if (!aula_ids || !Array.isArray(aula_ids) || aula_ids.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'aula_ids deve ser um array com pelo menos uma aula'
    }, { status: 400 });
  }

  if (!instrutor_id) {
    return NextResponse.json({
      success: false,
      error: 'instrutor_id é obrigatório'
    }, { status: 400 });
  }

  // Conceder permissões para cada aula
  const resultados = [];
  const erros = [];

  for (const aulaId of aula_ids) {
    try {
      const resultado = await aulaPermissoesService.concederPermissao(
        aulaId,
        params.aluno_id,
        instrutor_id
      );

      if (resultado.success) {
        resultados.push({
          aula_id: aulaId,
          success: true,
          permissao: resultado.data
        });
      } else {
        erros.push({
          aula_id: aulaId,
          success: false,
          error: resultado.error
        });
      }
    } catch (error) {
      erros.push({
        aula_id: aulaId,
        success: false,
        error: 'Erro interno ao processar aula'
      });
    }
  }

  // Buscar dados enriquecidos das aulas processadas
  const supabase = (aulaPermissoesService as any).supabase;
  
  const aulasProcessadas = await Promise.all(
    resultados.map(async (resultado) => {
      const { data: aula } = await supabase
        .from('aulas')
        .select(`
          id,
          titulo,
          modulos:modulo_id (
            titulo
          )
        `)
        .eq('id', resultado.aula_id)
        .single();

      return {
        ...resultado,
        aula: aula
      };
    })
  );

  const statusCode = erros.length === 0 ? 201 : (resultados.length === 0 ? 400 : 207); // 207 = Multi-Status

  return NextResponse.json({
    success: resultados.length > 0,
    message: `${resultados.length} permissões concedidas, ${erros.length} erros`,
    data: {
      curso_id: params.id,
      aluno_id: params.aluno_id,
      total_solicitadas: aula_ids.length,
      total_concedidas: resultados.length,
      total_erros: erros.length,
      permissoes_concedidas: aulasProcessadas,
      erros: erros,
      processado_em: new Date().toISOString()
    }
  }, { status: statusCode });
}

export const POST = withErrorHandler(handlePost);

/**
 * DELETE /api/cursos/[id]/alunos/[aluno_id]/permissoes
 * Remove todas as permissões específicas de um aluno em um curso
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: { id: string; aluno_id: string } }
): Promise<NextResponse> {
  const body = await request.json();
  const { instrutor_id } = body;

  if (!instrutor_id) {
    return NextResponse.json({
      success: false,
      error: 'instrutor_id é obrigatório'
    }, { status: 400 });
  }

  // Verificar se é instrutor
  const supabase = (aulaPermissoesService as any).supabase;
  
  const { data: curso } = await supabase
    .from('cursos')
    .select('instrutor_id')
    .eq('id', params.id)
    .single();

  if (!curso || curso.instrutor_id !== instrutor_id) {
    return NextResponse.json({
      success: false,
      error: 'Usuário não é instrutor deste curso'
    }, { status: 403 });
  }

  // Buscar todas as permissões específicas do aluno no curso
  const { data: permissoes } = await supabase
    .from('aula_permissoes')
    .select(`
      id,
      aula_id,
      aulas:aula_id (
        curso_id,
        titulo
      )
    `)
    .eq('aluno_id', params.aluno_id)
    .eq('tipo_permissao', 'convite_especifico');

  // Filtrar apenas permissões do curso específico
  const permissoesDoCurso = (permissoes || []).filter(
    p => p.aulas?.curso_id === params.id
  );

  if (permissoesDoCurso.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Nenhuma permissão específica encontrada para remover',
      data: {
        curso_id: params.id,
        aluno_id: params.aluno_id,
        permissoes_removidas: 0
      }
    });
  }

  // Remover todas as permissões
  const idsParaRemover = permissoesDoCurso.map(p => p.id);
  
  const { error: deleteError } = await supabase
    .from('aula_permissoes')
    .delete()
    .in('id', idsParaRemover);

  if (deleteError) {
    throw new Error('Erro ao remover permissões do banco de dados');
  }

  return NextResponse.json({
    success: true,
    message: `${permissoesDoCurso.length} permissões removidas com sucesso`,
    data: {
      curso_id: params.id,
      aluno_id: params.aluno_id,
      permissoes_removidas: permissoesDoCurso.length,
      aulas_afetadas: permissoesDoCurso.map(p => ({
        aula_id: p.aula_id,
        titulo: p.aulas?.titulo
      })),
      removido_por: instrutor_id,
      removido_em: new Date().toISOString()
    }
  });
}

export const DELETE = withErrorHandler(handleDelete);
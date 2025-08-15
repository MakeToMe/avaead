import { NextRequest, NextResponse } from 'next/server';
import { acessoAulaService } from '@/lib/acesso-aula-service';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * GET /api/cursos/[id]/aulas/acesso?aluno_id=uuid
 * Verifica acesso do aluno a todas as aulas do curso
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const alunoId = searchParams.get('aluno_id');

  if (!alunoId) {
    return NextResponse.json({
      success: false,
      error: 'aluno_id é obrigatório'
    }, { status: 400 });
  }

  // Verificar acesso a todas as aulas do curso
  const aulasComAcesso = await acessoAulaService.verificarAcessoCurso(params.id, alunoId);

  // Buscar informações adicionais do aluno
  const tipoAcesso = await acessoAulaService.getTipoAcesso(params.id, alunoId);

  if (!tipoAcesso) {
    return NextResponse.json({
      success: false,
      error: 'Aluno não está matriculado neste curso'
    }, { status: 404 });
  }

  // Estatísticas de acesso
  const totalAulas = aulasComAcesso.length;
  const aulasPublicas = aulasComAcesso.filter(a => !a.privada).length;
  const aulasPrivadas = aulasComAcesso.filter(a => a.privada).length;
  const aulasAcessiveis = aulasComAcesso.filter(a => a.pode_assistir).length;
  const aulasBloqueadas = aulasComAcesso.filter(a => !a.pode_assistir).length;

  // Agrupar aulas por módulo
  const supabase = (acessoAulaService as any).supabase;
  const { data: modulos } = await supabase
    .from('modulos')
    .select('id, titulo, ordem')
    .eq('curso_id', params.id)
    .order('ordem', { ascending: true });

  const aulasPorModulo = (modulos || []).map(modulo => {
    const aulasDoModulo = aulasComAcesso.filter(a => a.modulo_id === modulo.id);
    return {
      modulo: {
        id: modulo.id,
        titulo: modulo.titulo,
        ordem: modulo.ordem
      },
      aulas: aulasDoModulo,
      total_aulas: aulasDoModulo.length,
      aulas_acessiveis: aulasDoModulo.filter(a => a.pode_assistir).length,
      aulas_bloqueadas: aulasDoModulo.filter(a => !a.pode_assistir).length
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      aluno_id: alunoId,
      curso_id: params.id,
      tipo_acesso: tipoAcesso,
      estatisticas: {
        total_aulas: totalAulas,
        aulas_publicas: aulasPublicas,
        aulas_privadas: aulasPrivadas,
        aulas_acessiveis: aulasAcessiveis,
        aulas_bloqueadas: aulasBloqueadas,
        percentual_acesso: totalAulas > 0 ? Math.round((aulasAcessiveis / totalAulas) * 100) : 0
      },
      aulas_por_modulo: aulasPorModulo,
      todas_aulas: aulasComAcesso
    }
  });
}

export const GET = withErrorHandler(handleGet);

/**
 * POST /api/cursos/[id]/aulas/acesso
 * Verifica acesso a uma aula específica
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const body = await request.json();
  const { aula_id, aluno_id } = body;

  if (!aula_id || !aluno_id) {
    return NextResponse.json({
      success: false,
      error: 'aula_id e aluno_id são obrigatórios'
    }, { status: 400 });
  }

  // Verificar acesso à aula específica
  const resultado = await acessoAulaService.podeAssistirAula(aula_id, aluno_id);

  // Buscar detalhes da aula
  const supabase = (acessoAulaService as any).supabase;
  const { data: aula } = await supabase
    .from('aulas')
    .select(`
      id,
      titulo,
      descricao,
      privada,
      duracao,
      modulos:modulo_id (
        id,
        titulo
      )
    `)
    .eq('id', aula_id)
    .single();

  if (!aula) {
    return NextResponse.json({
      success: false,
      error: 'Aula não encontrada'
    }, { status: 404 });
  }

  // Verificar se a aula pertence ao curso
  if (aula.curso_id !== params.id) {
    return NextResponse.json({
      success: false,
      error: 'Aula não pertence a este curso'
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      aula: aula,
      acesso: resultado,
      aluno_id: aluno_id,
      curso_id: params.id,
      verificado_em: new Date().toISOString()
    }
  });
}

export const POST = withErrorHandler(handlePost);
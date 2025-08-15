import { NextRequest, NextResponse } from 'next/server';
import { aulaPermissoesService } from '@/lib/aula-permissoes-service';
import { RemoverPermissaoSchema } from '@/lib/schemas/convites';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * DELETE /api/aulas/[id]/permissoes/[aluno_id]
 * Remove permissão específica de um aluno para uma aula
 */
async function handleDelete(
  request: NextRequest,
  { params }: { params: { id: string; aluno_id: string } }
): Promise<NextResponse> {
  // Validar dados da requisição
  const body = await request.json();
  const dadosValidados = RemoverPermissaoSchema.parse(body);

  // Remover permissão
  const resultado = await aulaPermissoesService.removerPermissao(
    params.id,
    params.aluno_id,
    dadosValidados.instrutor_id
  );

  if (!resultado.success) {
    throw resultado;
  }

  // Buscar dados enriquecidos para resposta
  const supabase = (aulaPermissoesService as any).supabase;
  
  // Dados da aula
  const { data: aula } = await supabase
    .from('aulas')
    .select(`
      id,
      titulo,
      modulos:modulo_id (
        titulo
      )
    `)
    .eq('id', params.id)
    .single();

  // Dados do aluno
  const { data: aluno } = await supabase
    .from('users')
    .select('uid, nome, email')
    .eq('uid', params.aluno_id)
    .single();

  return NextResponse.json({
    success: true,
    message: 'Permissão removida com sucesso',
    data: {
      aula: aula,
      aluno: aluno,
      permissao_removida: resultado.data?.permissao_removida,
      removido_por: dadosValidados.instrutor_id,
      removido_em: new Date().toISOString()
    }
  });
}

export const DELETE = withErrorHandler(handleDelete);

/**
 * GET /api/aulas/[id]/permissoes/[aluno_id]?instrutor_id=uuid
 * Verifica se um aluno específico tem permissão para uma aula
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

  // Verificar se é instrutor
  const supabase = (aulaPermissoesService as any).supabase;
  
  // Buscar dados da aula
  const { data: aula } = await supabase
    .from('aulas')
    .select('id, titulo, privada, curso_id')
    .eq('id', params.id)
    .single();

  if (!aula) {
    return NextResponse.json({
      success: false,
      error: 'Aula não encontrada'
    }, { status: 404 });
  }

  // Verificar se é instrutor
  const { data: curso } = await supabase
    .from('cursos')
    .select('instrutor_id')
    .eq('id', aula.curso_id)
    .single();

  if (!curso || curso.instrutor_id !== instrutorId) {
    return NextResponse.json({
      success: false,
      error: 'Usuário não é instrutor deste curso'
    }, { status: 403 });
  }

  // Buscar dados do aluno
  const { data: aluno } = await supabase
    .from('users')
    .select('uid, nome, email')
    .eq('uid', params.aluno_id)
    .single();

  if (!aluno) {
    return NextResponse.json({
      success: false,
      error: 'Aluno não encontrado'
    }, { status: 404 });
  }

  // Verificar matrícula
  const { data: matricula } = await supabase
    .from('matriculas')
    .select('id, tipo_acesso, data_matricula')
    .eq('curso_id', aula.curso_id)
    .eq('aluno_id', params.aluno_id)
    .eq('status', 'ativa')
    .single();

  if (!matricula) {
    return NextResponse.json({
      success: true,
      data: {
        aula: aula,
        aluno: aluno,
        matriculado: false,
        tem_acesso: false,
        motivo: 'Aluno não está matriculado no curso'
      }
    });
  }

  // Verificar tipo de acesso
  let temAcesso = false;
  let tipoAcesso = '';
  let motivo = '';

  if (!aula.privada) {
    temAcesso = true;
    tipoAcesso = 'aula_publica';
    motivo = 'Aula é pública';
  } else if (matricula.tipo_acesso === 'convidado_curso') {
    temAcesso = true;
    tipoAcesso = 'convidado_curso';
    motivo = 'Aluno tem acesso total ao curso';
  } else {
    // Verificar permissão específica
    const { data: permissao } = await supabase
      .from('aula_permissoes')
      .select(`
        id,
        tipo_permissao,
        criado_em,
        concedida_por,
        instrutor:concedida_por (
          nome
        )
      `)
      .eq('aula_id', params.id)
      .eq('aluno_id', params.aluno_id)
      .single();

    if (permissao) {
      temAcesso = true;
      tipoAcesso = 'convite_especifico';
      motivo = `Permissão específica concedida por ${permissao.instrutor?.nome || 'instrutor'}`;
    } else {
      temAcesso = false;
      motivo = 'Aula privada sem permissão específica';
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      aula: aula,
      aluno: aluno,
      matricula: matricula,
      matriculado: true,
      tem_acesso: temAcesso,
      tipo_acesso: tipoAcesso,
      motivo: motivo,
      verificado_em: new Date().toISOString()
    }
  });
}

export const GET = withErrorHandler(handleGet);
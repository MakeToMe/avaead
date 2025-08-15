import { NextRequest, NextResponse } from 'next/server';
import { aulaPermissoesService } from '@/lib/aula-permissoes-service';
import { ConcederPermissaoSchema, ListarPermissoesSchema } from '@/lib/schemas/convites';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * POST /api/aulas/[id]/permissoes
 * Concede permissão específica para um aluno assistir uma aula privada
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Validar dados da requisição
  const body = await request.json();
  const dadosValidados = ConcederPermissaoSchema.parse(body);

  // Conceder permissão
  const resultado = await aulaPermissoesService.concederPermissao(
    params.id,
    dadosValidados.aluno_id,
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
      descricao,
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
    .eq('uid', dadosValidados.aluno_id)
    .single();

  return NextResponse.json({
    success: true,
    message: 'Permissão concedida com sucesso',
    data: {
      permissao: resultado.data,
      aula: aula,
      aluno: aluno,
      concedida_por: dadosValidados.instrutor_id,
      concedida_em: new Date().toISOString()
    }
  }, { status: 201 });
}

export const POST = withErrorHandler(handlePost);

/**
 * GET /api/aulas/[id]/permissoes?instrutor_id=uuid
 * Lista todas as permissões de uma aula específica
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
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

  // Listar permissões da aula
  const resultado = await aulaPermissoesService.listarPermissoesAula(
    params.id,
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
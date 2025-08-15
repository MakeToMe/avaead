import { NextRequest, NextResponse } from 'next/server';
import { conviteService } from '@/lib/convite-service';
import { ConviteAulasEspecificasSchema } from '@/lib/schemas/convites';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * POST /api/cursos/[id]/convites/aulas-especificas
 * Envia convite para aulas específicas
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Validar dados da requisição
  const body = await request.json();
  const dadosValidados = ConviteAulasEspecificasSchema.parse({
    ...body,
    curso_id: params.id
  });

  // Enviar convite
  const resultado = await conviteService.enviarConviteAulasEspecificas(dadosValidados);

  if (!resultado.success) {
    // O middleware de erro vai tratar automaticamente
    throw resultado;
  }

  // Buscar detalhes das aulas para retorno
  const supabase = (conviteService as any).supabase;
  const { data: aulas } = await supabase
    .from('aulas')
    .select(`
      id,
      titulo,
      descricao,
      modulos:modulo_id (
        titulo
      )
    `)
    .in('id', dadosValidados.aula_ids);

  return NextResponse.json({
    success: true,
    message: 'Convite enviado com sucesso',
    data: {
      token: resultado.token,
      tipo_convite: 'aulas_especificas',
      email: dadosValidados.email,
      curso_id: dadosValidados.curso_id,
      aulas_incluidas: aulas || [],
      total_aulas: dadosValidados.aula_ids.length
    }
  }, { status: 201 });
}

export const POST = withErrorHandler(handlePost);

/**
 * GET /api/cursos/[id]/convites/aulas-especificas
 * Lista convites pendentes para aulas específicas
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

  // Verificar se é instrutor do curso
  const isInstrutor = await (conviteService as any).verificarInstrutor(params.id, instrutorId);
  if (!isInstrutor) {
    return NextResponse.json({
      success: false,
      error: 'Usuário não é instrutor deste curso'
    }, { status: 403 });
  }

  // Buscar convites pendentes com detalhes das aulas
  const supabase = (conviteService as any).supabase;
  const { data: convites, error } = await supabase
    .from('convites_pendentes')
    .select(`
      id,
      email,
      mensagem,
      token,
      aceito,
      aula_ids,
      criado_em,
      expira_em
    `)
    .eq('curso_id', params.id)
    .eq('tipo_convite', 'aulas_especificas')
    .order('criado_em', { ascending: false });

  if (error) {
    throw new Error('Erro ao buscar convites');
  }

  // Enriquecer com detalhes das aulas
  const convitesEnriquecidos = await Promise.all(
    (convites || []).map(async (convite) => {
      if (convite.aula_ids && convite.aula_ids.length > 0) {
        const { data: aulas } = await supabase
          .from('aulas')
          .select(`
            id,
            titulo,
            modulos:modulo_id (
              titulo
            )
          `)
          .in('id', convite.aula_ids);

        return {
          ...convite,
          aulas_incluidas: aulas || [],
          total_aulas: convite.aula_ids.length
        };
      }
      return {
        ...convite,
        aulas_incluidas: [],
        total_aulas: 0
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: convitesEnriquecidos
  });
}

export const GET = withErrorHandler(handleGet);
import { NextRequest, NextResponse } from 'next/server';
import { conviteService } from '@/lib/convite-service';
import { ConviteCursoCompletoSchema } from '@/lib/schemas/convites';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * POST /api/cursos/[id]/convites/curso-completo
 * Envia convite para curso completo (acesso a todas as aulas)
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Validar dados da requisição
  const body = await request.json();
  const dadosValidados = ConviteCursoCompletoSchema.parse({
    ...body,
    curso_id: params.id
  });

  // Enviar convite
  const resultado = await conviteService.enviarConviteCursoCompleto(dadosValidados);

  if (!resultado.success) {
    // O middleware de erro vai tratar automaticamente
    throw resultado;
  }

  return NextResponse.json({
    success: true,
    message: 'Convite enviado com sucesso',
    data: {
      token: resultado.token,
      tipo_convite: 'curso_completo',
      email: dadosValidados.email,
      curso_id: dadosValidados.curso_id
    }
  }, { status: 201 });
}

// Exportar com tratamento de erro
export const POST = withErrorHandler(handlePost);

/**
 * GET /api/cursos/[id]/convites/curso-completo
 * Lista convites pendentes para curso completo
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

  // Buscar convites pendentes
  const supabase = (conviteService as any).supabase;
  const { data: convites, error } = await supabase
    .from('convites_pendentes')
    .select(`
      id,
      email,
      mensagem,
      token,
      aceito,
      criado_em,
      expira_em
    `)
    .eq('curso_id', params.id)
    .eq('tipo_convite', 'curso_completo')
    .order('criado_em', { ascending: false });

  if (error) {
    throw new Error('Erro ao buscar convites');
  }

  return NextResponse.json({
    success: true,
    data: convites || []
  });
}

export const GET = withErrorHandler(handleGet);
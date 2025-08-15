import { NextRequest, NextResponse } from 'next/server';
import { conviteService } from '@/lib/convite-service';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { redirect } from 'next/navigation';

/**
 * GET /api/convites/aceitar/[token]
 * Aceita um convite via link (redirecionamento)
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  // Aceitar o convite
  const resultado = await conviteService.aceitarConvite(params.token);

  if (!resultado.success) {
    // Redirecionar para página de erro com parâmetros
    const errorUrl = new URL('/convites/erro', request.url);
    errorUrl.searchParams.set('motivo', resultado.error || 'Erro desconhecido');
    return NextResponse.redirect(errorUrl);
  }

  // Buscar detalhes do convite aceito para redirecionamento
  const supabase = (conviteService as any).supabase;
  const { data: convite } = await supabase
    .from('convites_pendentes')
    .select(`
      curso_id,
      tipo_convite,
      cursos:curso_id (
        id,
        titulo
      )
    `)
    .eq('token', params.token)
    .single();

  // Redirecionar para página de sucesso
  const successUrl = new URL('/convites/sucesso', request.url);
  successUrl.searchParams.set('curso_id', convite?.curso_id || '');
  successUrl.searchParams.set('tipo', convite?.tipo_convite || '');
  successUrl.searchParams.set('curso_titulo', convite?.cursos?.titulo || '');

  return NextResponse.redirect(successUrl);
}

export const GET = withErrorHandler(handleGet);

/**
 * POST /api/convites/aceitar/[token]
 * Aceita um convite via API (para uso programático)
 */
async function handlePost(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  // Aceitar o convite
  const resultado = await conviteService.aceitarConvite(params.token);

  if (!resultado.success) {
    throw resultado;
  }

  // Buscar detalhes do convite aceito
  const supabase = (conviteService as any).supabase;
  const { data: convite } = await supabase
    .from('convites_pendentes')
    .select(`
      id,
      email,
      curso_id,
      tipo_convite,
      aula_ids,
      aceito,
      criado_em,
      cursos:curso_id (
        id,
        titulo,
        descricao
      )
    `)
    .eq('token', params.token)
    .single();

  // Buscar dados da matrícula criada
  const { data: matricula } = await supabase
    .from('matriculas')
    .select(`
      id,
      tipo_acesso,
      data_matricula,
      users:aluno_id (
        uid,
        nome,
        email
      )
    `)
    .eq('curso_id', convite?.curso_id)
    .eq('aluno_id', (await supabase.from('users').select('uid').eq('email', convite?.email).single()).data?.uid)
    .single();

  // Se foi convite para aulas específicas, buscar as permissões criadas
  let permissoes = [];
  if (convite?.tipo_convite === 'aulas_especificas' && convite?.aula_ids) {
    const { data: permissoesData } = await supabase
      .from('aula_permissoes')
      .select(`
        id,
        aula_id,
        tipo_permissao,
        criado_em,
        aulas:aula_id (
          id,
          titulo,
          modulos:modulo_id (
            titulo
          )
        )
      `)
      .eq('aluno_id', matricula?.users?.uid)
      .in('aula_id', convite.aula_ids);

    permissoes = permissoesData || [];
  }

  return NextResponse.json({
    success: true,
    message: 'Convite aceito com sucesso',
    data: {
      convite: convite,
      matricula: matricula,
      permissoes_criadas: permissoes,
      total_permissoes: permissoes.length,
      aceito_em: new Date().toISOString()
    }
  });
}

export const POST = withErrorHandler(handlePost);
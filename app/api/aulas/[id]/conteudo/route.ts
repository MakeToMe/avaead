import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MiddlewareVerificacaoAcesso } from '@/lib/middleware/verificacao-acesso';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const aulaId = params.id;
    
    // TODO: Extrair usuário ID do token/sessão de autenticação
    const usuarioId = 'current_user_id'; // Placeholder

    // Verificar acesso usando o middleware
    const verificacaoResult = await MiddlewareVerificacaoAcesso.middlewareAPI(
      request,
      aulaId,
      usuarioId
    );

    // Se o middleware retornou uma resposta, significa que o acesso foi negado
    if (verificacaoResult) {
      return verificacaoResult;
    }

    // Buscar conteúdo completo da aula (incluindo dados sensíveis)
    const { data: aula, error } = await supabase
      .from('aulas')
      .select(`
        id,
        titulo,
        descricao,
        conteudo,
        media_url,
        duracao,
        privada,
        ativo,
        curso_id,
        cursos!aulas_curso_id_fkey (
          titulo,
          instrutor_id,
          users!cursos_instrutor_id_fkey (
            nome,
            email
          )
        )
      `)
      .eq('id', aulaId)
      .eq('ativo', true)
      .single();

    if (error || !aula) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      );
    }

    // Registrar acesso para analytics (opcional)
    await registrarAcessoAula(aulaId, usuarioId);

    const curso = aula.cursos as any;
    const instrutor = curso?.users as any;

    return NextResponse.json({
      id: aula.id,
      titulo: aula.titulo,
      descricao: aula.descricao,
      conteudo: aula.conteudo,
      media_url: aula.media_url,
      duracao: aula.duracao,
      privada: aula.privada,
      curso: {
        id: aula.curso_id,
        titulo: curso?.titulo,
        instrutor: {
          id: curso?.instrutor_id,
          nome: instrutor?.nome,
          email: instrutor?.email
        }
      },
      acesso_concedido_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na API de conteúdo da aula:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Registra acesso à aula para analytics e auditoria
 */
async function registrarAcessoAula(aulaId: string, usuarioId: string) {
  try {
    // TODO: Implementar tabela de analytics de acesso
    // await supabase.from('acessos_aula').insert({
    //   aula_id: aulaId,
    //   usuario_id: usuarioId,
    //   timestamp: new Date().toISOString(),
    //   ip: request.ip,
    //   user_agent: request.headers.get('user-agent')
    // });

    console.log(`📊 Acesso registrado: Aula ${aulaId} por usuário ${usuarioId}`);
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
  }
}
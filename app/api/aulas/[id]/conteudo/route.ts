import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { VerificacaoAcessoMiddleware } from '@/lib/middleware/verificacao-acesso';

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id: aulaId } = await params;
    
    console.log(`🔍 Buscando conteúdo da aula: ${aulaId}`);

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
    const aulaQuery = `
      SELECT 
        a.id,
        a.titulo,
        a.descricao,
        a.conteudo,
        a.media_url,
        a.duracao,
        a.privada,
        a.ativo,
        a.curso_id,
        c.titulo as curso_titulo,
        c.instrutor_id,
        u.nome as instrutor_nome,
        u.email as instrutor_email
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
      JOIN rarcursos.cursos c ON m.curso_id = c.id
      JOIN rarcursos.users u ON c.instrutor_id = u.uid
      WHERE a.id = $1 AND a.ativo = true
    `;

    const aulaResult = await client.query(aulaQuery, [aulaId]);

    if (aulaResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      );
    }

    const aula = aulaResult.rows[0];

    // Registrar acesso para analytics (opcional)
    await registrarAcessoAula(aulaId, usuarioId);

    console.log(`✅ Conteúdo da aula carregado: ${aula.titulo}`);

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
        titulo: aula.curso_titulo,
        instrutor: {
          id: aula.instrutor_id,
          nome: aula.instrutor_nome,
          email: aula.instrutor_email
        }
      },
      acesso_concedido_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na API de conteúdo da aula:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
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
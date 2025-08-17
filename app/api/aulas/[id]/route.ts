import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

    // Buscar dados da aula com informações do curso
    const aulaQuery = `
      SELECT 
        a.id,
        a.titulo,
        a.descricao,
        a.privada,
        a.ativo,
        m.curso_id,
        c.titulo as curso_titulo
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
      JOIN rarcursos.cursos c ON m.curso_id = c.id
      WHERE a.id = $1
    `;

    const aulaResult = await client.query(aulaQuery, [aulaId]);

    if (aulaResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      );
    }

    const aula = aulaResult.rows[0];

    // TODO: Verificar se o usuário atual tem permissão para acessar esta aula
    // const userId = await getCurrentUserId(request);
    // const temPermissao = await verificarPermissaoAula(aulaId, userId);
    // if (!temPermissao) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    // }

    return NextResponse.json({
      id: aula.id,
      titulo: aula.titulo,
      descricao: aula.descricao,
      privada: aula.privada,
      ativo: aula.ativo,
      curso_id: aula.curso_id,
      curso_titulo: aula.curso_titulo
    });

  } catch (error) {
    console.error('Erro na API de aula:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
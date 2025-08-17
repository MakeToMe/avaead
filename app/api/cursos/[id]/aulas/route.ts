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
    const { id: cursoId } = await params;
    const { searchParams } = new URL(request.url);
    const apenasPrivadas = searchParams.get('apenas_privadas') === 'true';

    // Construir query baseada nos filtros
    let aulasQuery = `
      SELECT 
        a.id, 
        a.titulo, 
        a.descricao, 
        a.duracao, 
        a.privada, 
        a.ativo
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
      WHERE m.curso_id = $1 AND a.ativo = true
    `;

    const queryParams = [cursoId];

    // Filtrar apenas aulas privadas se solicitado
    if (apenasPrivadas) {
      aulasQuery += ' AND a.privada = true';
    }

    aulasQuery += ' ORDER BY a.titulo';

    const result = await client.query(aulasQuery, queryParams);
    const aulas = result.rows;

    return NextResponse.json({
      aulas: aulas || [],
      total: aulas?.length || 0,
      filtros: {
        apenas_privadas: apenasPrivadas
      }
    });

  } catch (error) {
    console.error('Erro na API de aulas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
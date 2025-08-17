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

    // Buscar informações do curso com dados do instrutor
    const cursoQuery = `
      SELECT 
        c.id,
        c.titulo,
        c.descricao,
        c.ativo,
        c.criado_em,
        c.instrutor_id,
        u.nome as instrutor_nome,
        u.email as instrutor_email
      FROM rarcursos.cursos c
      LEFT JOIN rarcursos.users u ON c.instrutor_id = u.uid
      WHERE c.id = $1 AND c.ativo = true
    `;

    const cursoResult = await client.query(cursoQuery, [cursoId]);

    if (cursoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    const curso = cursoResult.rows[0];

    // Buscar estatísticas básicas do curso
    const estatisticasQuery = `
      SELECT 
        a.id, 
        a.privada, 
        a.ativo
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
      WHERE m.curso_id = $1 AND a.ativo = true
    `;

    const estatisticasResult = await client.query(estatisticasQuery, [cursoId]);
    const estatisticas = estatisticasResult.rows;

    const totalAulas = estatisticas.length;
    const aulasPublicas = estatisticas.filter(a => !a.privada).length;
    const aulasPrivadas = estatisticas.filter(a => a.privada).length;

    // Buscar total de alunos matriculados
    const matriculasQuery = `
      SELECT COUNT(*) as total
      FROM rarcursos.matriculas 
      WHERE curso_id = $1 AND status = 'ativa'
    `;

    const matriculasResult = await client.query(matriculasQuery, [cursoId]);
    const totalAlunos = parseInt(matriculasResult.rows[0].total) || 0;

    return NextResponse.json({
      id: curso.id,
      titulo: curso.titulo,
      descricao: curso.descricao,
      ativo: curso.ativo,
      criado_em: curso.criado_em,
      instrutor_id: curso.instrutor_id,
      instrutor_nome: curso.instrutor_nome,
      instrutor_email: curso.instrutor_email,
      estatisticas: {
        total_aulas: totalAulas,
        aulas_publicas: aulasPublicas,
        aulas_privadas: aulasPrivadas,
        total_alunos: totalAlunos
      }
    });

  } catch (error) {
    console.error('Erro na API de curso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
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

    // Buscar alunos matriculados no curso com informações detalhadas
    const matriculasQuery = `
      SELECT 
        m.id,
        m.aluno_id,
        m.tipo_acesso,
        m.data_matricula,
        m.progresso_percentual,
        u.nome,
        u.email
      FROM rarcursos.matriculas m
      JOIN rarcursos.users u ON m.aluno_id = u.uid
      WHERE m.curso_id = $1 AND m.status = 'ativa'
      ORDER BY m.data_matricula DESC
    `;

    const matriculasResult = await client.query(matriculasQuery, [cursoId]);
    const matriculas = matriculasResult.rows;

    if (matriculas.length === 0) {
      return NextResponse.json({
        alunos: [],
        total: 0,
        matriculados: 0,
        convidados: 0
      });
    }

    // Buscar quantidade de aulas específicas para cada aluno
    const alunosIds = matriculas.map(m => m.aluno_id);
    
    let aulasEspecificas: any[] = [];
    if (alunosIds.length > 0) {
      const permissoesQuery = `
        SELECT 
          ap.aluno_id,
          COUNT(*) as total_aulas_especificas
        FROM rarcursos.aula_permissoes ap
        JOIN rarcursos.aulas a ON ap.aula_id = a.id
        WHERE ap.aluno_id = ANY($1::uuid[]) AND a.curso_id = $2
        GROUP BY ap.aluno_id
      `;

      const permissoesResult = await client.query(permissoesQuery, [alunosIds, cursoId]);
      aulasEspecificas = permissoesResult.rows;
    }

    // Processar dados dos alunos
    const alunos = matriculas.map(matricula => {
      const aulasEspecificasCount = aulasEspecificas.find(
        ae => ae.aluno_id === matricula.aluno_id
      )?.total_aulas_especificas || 0;

      return {
        id: matricula.id,
        aluno_id: matricula.aluno_id,
        nome: matricula.nome || 'Nome não informado',
        email: matricula.email || 'Email não informado',
        tipo_acesso: matricula.tipo_acesso,
        data_matricula: matricula.data_matricula,
        progresso_percentual: matricula.progresso_percentual || 0,
        aulas_especificas: parseInt(aulasEspecificasCount)
      };
    });

    const matriculados = alunos.filter(a => a.tipo_acesso === 'matriculado').length;
    const convidados = alunos.filter(a => a.tipo_acesso === 'convidado_curso').length;

    return NextResponse.json({
      alunos,
      total: alunos.length,
      matriculados,
      convidados
    });

  } catch (error) {
    console.error('Erro na API de alunos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
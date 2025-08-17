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
    const { id: alunoId } = await params;
    const { searchParams } = new URL(request.url);
    const cursoId = searchParams.get('curso_id');

    console.log(`🔍 Buscando permissões do aluno: ${alunoId} no curso: ${cursoId}`);

    if (!cursoId) {
      return NextResponse.json(
        { error: 'curso_id é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar permissões específicas do aluno para aulas do curso
    const permissoesQuery = `
      SELECT 
        ap.aula_id,
        ap.tipo_permissao,
        ap.criado_em,
        a.titulo as aula_titulo,
        a.privada,
        a.ao_vivo,
        m.titulo as modulo_titulo
      FROM rarcursos.aula_permissoes ap
      JOIN rarcursos.aulas a ON ap.aula_id = a.id
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
      WHERE ap.aluno_id = $1 AND m.curso_id = $2
      ORDER BY m.titulo, a.titulo
    `;

    const permissoesResult = await client.query(permissoesQuery, [alunoId, cursoId]);

    // Verificar tipo de matrícula no curso
    const matriculaQuery = `
      SELECT tipo_acesso, status
      FROM rarcursos.matriculas
      WHERE aluno_id = $1 AND curso_id = $2
    `;

    const matriculaResult = await client.query(matriculaQuery, [alunoId, cursoId]);

    const matricula = matriculaResult.rows[0];
    const temAcessoTotal = matricula?.tipo_acesso === 'convidado_curso';

    // Organizar permissões por aula
    const permissoesPorAula = {};
    permissoesResult.rows.forEach(row => {
      permissoesPorAula[row.aula_id] = {
        aula_id: row.aula_id,
        aula_titulo: row.aula_titulo,
        modulo_titulo: row.modulo_titulo,
        tipo_permissao: row.tipo_permissao,
        privada: row.privada,
        ao_vivo: row.ao_vivo,
        criado_em: row.criado_em
      };
    });

    return NextResponse.json({
      aluno_id: alunoId,
      curso_id: cursoId,
      tem_acesso_total: temAcessoTotal,
      tipo_matricula: matricula?.tipo_acesso || null,
      status_matricula: matricula?.status || null,
      permissoes_especificas: Object.values(permissoesPorAula),
      resumo: {
        total_permissoes: permissoesResult.rows.length,
        acesso_privada: permissoesResult.rows.filter(p => 
          p.tipo_permissao === 'acesso_privada' || p.tipo_permissao === 'acesso_completo'
        ).length,
        acesso_ao_vivo: permissoesResult.rows.filter(p => 
          p.tipo_permissao === 'acesso_ao_vivo' || p.tipo_permissao === 'acesso_completo'
        ).length,
        acesso_completo: permissoesResult.rows.filter(p => 
          p.tipo_permissao === 'acesso_completo'
        ).length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar permissões do aluno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
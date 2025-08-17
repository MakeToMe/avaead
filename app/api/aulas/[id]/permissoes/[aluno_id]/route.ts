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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; aluno_id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id: aulaId, aluno_id: alunoId } = await params;

    console.log(`🗑️ Removendo permissão - Aula: ${aulaId}, Aluno: ${alunoId}`);

    // Verificar se a permissão existe
    const permissaoQuery = `
      SELECT 
        ap.id,
        ap.tipo_permissao,
        m.tipo_acesso
      FROM rarcursos.aula_permissoes ap
      JOIN rarcursos.matriculas m ON ap.aluno_id = m.aluno_id
      JOIN rarcursos.aulas a ON ap.aula_id = a.id
      JOIN rarcursos.modulos mod ON a.modulo_id = mod.id
      WHERE ap.aula_id = $1 AND ap.aluno_id = $2 AND m.curso_id = mod.curso_id
    `;

    const permissaoResult = await client.query(permissaoQuery, [aulaId, alunoId]);

    if (permissaoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permissão não encontrada' },
        { status: 404 }
      );
    }

    const permissao = permissaoResult.rows[0];

    // Verificar se é uma permissão específica (não pode remover acesso total do curso)
    if (permissao.tipo_acesso === 'convidado_curso') {
      return NextResponse.json(
        { error: 'Não é possível remover acesso total através desta função. Use o gerenciamento de alunos do curso.' },
        { status: 400 }
      );
    }

    // Remover permissão específica
    const deleteQuery = `
      DELETE FROM rarcursos.aula_permissoes
      WHERE aula_id = $1 AND aluno_id = $2
    `;

    const deleteResult = await client.query(deleteQuery, [aulaId, alunoId]);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Nenhuma permissão foi removida' },
        { status: 404 }
      );
    }

    console.log(`✅ Permissão removida com sucesso - Aula: ${aulaId}, Aluno: ${alunoId}`);

    return NextResponse.json({
      success: true,
      message: 'Permissão removida com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro na API de remover permissão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

const ConcederPermissaoSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  tipo_permissao: z.enum(['acesso_privada', 'acesso_ao_vivo', 'acesso_completo']),
  concedida_por: z.string().uuid('ID do usuário que concede inválido').optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id: aulaId } = await params;

    console.log(`🔍 Buscando permissões para aula: ${aulaId}`);

    // Verificar se a aula existe e requer permissões (privada ou ao vivo)
    const aulaQuery = `
      SELECT 
        a.id,
        a.titulo,
        a.privada,
        a.ao_vivo,
        m.curso_id
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
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
    console.log(`📚 Aula encontrada: ${aula.titulo} (Privada: ${aula.privada}, Ao Vivo: ${aula.ao_vivo})`);

    if (!aula.privada && !aula.ao_vivo) {
      return NextResponse.json(
        { error: 'Esta aula é pública e não é ao vivo, não requer gerenciamento de permissões' },
        { status: 400 }
      );
    }

    // Buscar alunos com acesso total (convidados do curso) - ajustado para a estrutura real
    const alunosComAcessoTotalQuery = `
      SELECT 
        m.id as matricula_id,
        m.aluno_id,
        m.tipo_acesso,
        m.data_matricula,
        u.nome,
        u.email
      FROM rarcursos.matriculas m
      JOIN rarcursos.users u ON m.aluno_id = u.uid
      WHERE m.curso_id = $1 AND m.status = 'ativa' AND m.tipo_acesso = 'convidado_curso'
    `;

    const alunosComAcessoTotalResult = await client.query(alunosComAcessoTotalQuery, [aula.curso_id]);

    // Buscar alunos com permissões específicas para esta aula
    const alunosComPermissaoEspecificaQuery = `
      SELECT 
        m.id as matricula_id,
        m.aluno_id,
        m.tipo_acesso,
        m.data_matricula,
        u.nome,
        u.email,
        ap.tipo_permissao,
        ap.criado_em as data_permissao,
        ap.concedida_por,
        uc.nome as concedida_por_nome
      FROM rarcursos.matriculas m
      JOIN rarcursos.users u ON m.aluno_id = u.uid
      JOIN rarcursos.aula_permissoes ap ON m.aluno_id = ap.aluno_id
      LEFT JOIN rarcursos.users uc ON ap.concedida_por = uc.uid
      WHERE m.curso_id = $1 AND m.status = 'ativa' AND ap.aula_id = $2
    `;

    const alunosComPermissaoEspecificaResult = await client.query(alunosComPermissaoEspecificaQuery, [aula.curso_id, aulaId]);

    // Buscar todos os alunos matriculados
    const todosAlunosQuery = `
      SELECT 
        m.id as matricula_id,
        m.aluno_id,
        m.tipo_acesso,
        m.data_matricula,
        m.progresso_percentual,
        u.nome,
        u.email
      FROM rarcursos.matriculas m
      JOIN rarcursos.users u ON m.aluno_id = u.uid
      WHERE m.curso_id = $1 AND m.status = 'ativa'
    `;

    const todosAlunosResult = await client.query(todosAlunosQuery, [aula.curso_id]);

    // Processar alunos com acesso
    const alunosComAcesso = [
      // Alunos com acesso total
      ...alunosComAcessoTotalResult.rows.map(row => ({
        id: row.matricula_id,
        aluno_id: row.aluno_id,
        nome: row.nome || 'Nome não informado',
        email: row.email || 'Email não informado',
        tipo_acesso: 'convidado_curso',
        data_permissao: row.data_matricula,
        concedida_por: null,
        concedida_por_nome: null
      })),
      // Alunos com permissões específicas
      ...alunosComPermissaoEspecificaResult.rows.map(row => ({
        id: row.matricula_id,
        aluno_id: row.aluno_id,
        nome: row.nome || 'Nome não informado',
        email: row.email || 'Email não informado',
        tipo_acesso: 'convite_especifico',
        data_permissao: row.data_permissao,
        concedida_por: row.concedida_por,
        concedida_por_nome: row.concedida_por_nome
      }))
    ];

    // IDs dos alunos que já têm acesso
    const idsComAcesso = new Set(alunosComAcesso.map(a => a.aluno_id));

    // Filtrar alunos sem acesso
    const alunosSemAcesso = todosAlunosResult.rows
      .filter(row => !idsComAcesso.has(row.aluno_id))
      .map(row => ({
        id: row.matricula_id,
        aluno_id: row.aluno_id,
        nome: row.nome || 'Nome não informado',
        email: row.email || 'Email não informado',
        data_matricula: row.data_matricula,
        progresso_percentual: row.progresso_percentual || 0
      }));

    console.log(`✅ Permissões carregadas - Com acesso: ${alunosComAcesso.length}, Sem acesso: ${alunosSemAcesso.length}`);

    return NextResponse.json({
      aula: {
        id: aula.id,
        titulo: aula.titulo,
        privada: aula.privada,
        ao_vivo: aula.ao_vivo
      },
      alunos_com_acesso: alunosComAcesso,
      alunos_sem_acesso: alunosSemAcesso,
      estatisticas: {
        total_com_acesso: alunosComAcesso.length,
        total_sem_acesso: alunosSemAcesso.length,
        convidados_curso: alunosComAcesso.filter(a => a.tipo_acesso === 'convidado_curso').length,
        convites_especificos: alunosComAcesso.filter(a => a.tipo_acesso === 'convite_especifico').length
      }
    });

  } catch (error) {
    console.error('❌ Erro na API de permissões:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id: aulaId } = await params;
    const body = await request.json();

    console.log(`🔐 Concedendo permissão para aula: ${aulaId}`);

    // Validar dados de entrada
    const { aluno_id, tipo_permissao, concedida_por } = ConcederPermissaoSchema.parse(body);

    // Verificar se a aula existe e requer permissões
    const aulaQuery = `
      SELECT 
        a.id,
        a.privada,
        a.ao_vivo,
        m.curso_id
      FROM rarcursos.aulas a
      JOIN rarcursos.modulos m ON a.modulo_id = m.id
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

    if (!aula.privada && !aula.ao_vivo) {
      return NextResponse.json(
        { error: 'Não é possível conceder permissões para aulas que não são privadas nem ao vivo' },
        { status: 400 }
      );
    }

    // Verificar se o aluno está matriculado no curso
    const matriculaQuery = `
      SELECT id, tipo_acesso
      FROM rarcursos.matriculas
      WHERE curso_id = $1 AND aluno_id = $2 AND status = 'ativa'
    `;

    const matriculaResult = await client.query(matriculaQuery, [aula.curso_id, aluno_id]);

    if (matriculaResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Aluno não está matriculado neste curso' },
        { status: 400 }
      );
    }

    const matricula = matriculaResult.rows[0];

    // Verificar se já tem acesso total
    if (matricula.tipo_acesso === 'convidado_curso') {
      return NextResponse.json(
        { error: 'Este aluno já tem acesso total ao curso (incluindo esta aula)' },
        { status: 400 }
      );
    }

    // Verificar se já tem permissão específica
    const permissaoExistenteQuery = `
      SELECT id FROM rarcursos.aula_permissoes
      WHERE aula_id = $1 AND aluno_id = $2
    `;

    const permissaoExistenteResult = await client.query(permissaoExistenteQuery, [aulaId, aluno_id]);

    if (permissaoExistenteResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Aluno já tem permissão para esta aula' },
        { status: 400 }
      );
    }

    // Conceder permissão (usar o usuário fornecido ou system como fallback)
    const usuarioQueConcede = concedida_por || '00000000-0000-0000-0000-000000000000';
    const insertPermissaoQuery = `
      INSERT INTO rarcursos.aula_permissoes (aula_id, aluno_id, concedida_por, tipo_permissao)
      VALUES ($1, $2, $3, $4)
    `;

    await client.query(insertPermissaoQuery, [aulaId, aluno_id, usuarioQueConcede, tipo_permissao]);

    console.log(`✅ Permissão concedida: ${tipo_permissao} para aluno ${aluno_id}`);

    return NextResponse.json({
      success: true,
      message: 'Permissão concedida com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro na API de conceder permissão:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados inválidos',
        detalhes: error.errors
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
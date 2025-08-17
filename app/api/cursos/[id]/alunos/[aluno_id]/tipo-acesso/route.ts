import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';
import { SistemaAuditoria } from '@/lib/auditoria/sistema-auditoria';

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

const AlterarTipoAcessoSchema = z.object({
  tipo_acesso: z.enum(['matriculado', 'convidado_curso'])
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; aluno_id: string }> }
) {
  const client = await pool.connect();
  
  try {
    const { id: cursoId, aluno_id: alunoId } = await params;
    const body = await request.json();

    // Validar dados de entrada
    const { tipo_acesso } = AlterarTipoAcessoSchema.parse(body);

    await client.query('BEGIN');

    // Verificar se o curso existe e buscar dados para auditoria
    const cursoQuery = `
      SELECT c.id, c.titulo, c.instrutor_id, u.nome as aluno_nome, u.email as aluno_email
      FROM rarcursos.cursos c
      CROSS JOIN rarcursos.users u
      WHERE c.id = $1 AND u.uid = $2
    `;
    const cursoResult = await client.query(cursoQuery, [cursoId, alunoId]);
    
    if (cursoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Curso ou aluno não encontrado' },
        { status: 404 }
      );
    }

    const cursoData = cursoResult.rows[0];

    // Verificar se a matrícula existe
    const matriculaQuery = `
      SELECT id, tipo_acesso, aluno_id, curso_id
      FROM rarcursos.matriculas
      WHERE curso_id = $1 AND aluno_id = $2
    `;
    const matriculaResult = await client.query(matriculaQuery, [cursoId, alunoId]);

    if (matriculaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Matrícula não encontrada' },
        { status: 404 }
      );
    }

    const matricula = matriculaResult.rows[0];

    // Verificar se já tem o tipo de acesso solicitado
    if (matricula.tipo_acesso === tipo_acesso) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: true,
        message: 'Tipo de acesso já está configurado'
      });
    }

    // Atualizar tipo de acesso
    const updateQuery = `
      UPDATE rarcursos.matriculas 
      SET tipo_acesso = $1, atualizado_em = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [tipo_acesso, matricula.id]);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Erro ao atualizar tipo de acesso' },
        { status: 500 }
      );
    }

    await client.query('COMMIT');

    // Log de auditoria (fora da transação para não bloquear)
    try {
      const acao = tipo_acesso === 'convidado_curso' ? 'promovido' : 'rebaixado';
      const tipoEvento = `aluno_${acao}`;
      
      await SistemaAuditoria.registrarEvento({
        tipoEvento,
        severidade: 'info',
        usuarioId: cursoData.instrutor_id, // Quem fez a ação
        usuarioAfetadoId: alunoId, // Quem foi afetado
        recursoTipo: 'matricula',
        recursoId: matricula.id,
        detalhes: {
          curso_id: cursoId,
          curso_titulo: cursoData.titulo,
          aluno_nome: cursoData.aluno_nome,
          aluno_email: cursoData.aluno_email,
          tipo_acesso_anterior: matricula.tipo_acesso,
          tipo_acesso_novo: tipo_acesso,
          acao: acao
        },
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent')
      });
    } catch (auditError) {
      console.error('Erro ao registrar auditoria:', auditError);
      // Não falhar a operação por causa do log
    }

    const mensagemSucesso = tipo_acesso === 'convidado_curso' 
      ? `${cursoData.aluno_nome} foi promovido para acesso total ao curso`
      : `${cursoData.aluno_nome} foi rebaixado para acesso básico`;

    return NextResponse.json({
      success: true,
      message: mensagemSucesso,
      tipo_acesso_anterior: matricula.tipo_acesso,
      tipo_acesso_novo: tipo_acesso,
      aluno: {
        nome: cursoData.aluno_nome,
        email: cursoData.aluno_email
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na API de alterar tipo de acesso:', error);

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
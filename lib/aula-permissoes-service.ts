import { Pool } from 'pg';
import type { AulaPermissao, Usuario } from './types/aulas-privadas';

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

/**
 * Serviço para gerenciamento de permissões específicas de aulas
 * Permite conceder/remover permissões granulares para aulas privadas
 */
export class AulaPermissoesService {
  constructor() {
    // Não precisa mais de inicialização do Supabase
  }

  /**
   * Concede permissão específica para um aluno assistir uma aula privada
   * @param aulaId ID da aula
   * @param alunoId ID do aluno
   * @param instrutorId ID do instrutor que está concedendo
   * @returns Resultado da operação
   */
  async concederPermissao(aulaId: string, alunoId: string, instrutorId: string) {
    const client = await pool.connect();
    
    try {
      // 1. Verificar se a aula existe e é privada
      const aulaQuery = `
        SELECT a.id, a.titulo, a.privada, m.curso_id
        FROM rarcursos.aulas a
        JOIN rarcursos.modulos m ON a.modulo_id = m.id
        WHERE a.id = $1
      `;
      
      const aulaResult = await client.query(aulaQuery, [aulaId]);

      if (aulaResult.rows.length === 0) {
        return {
          success: false,
          error: 'Aula não encontrada'
        };
      }

      const aula = aulaResult.rows[0];

      if (!aula.privada) {
        return {
          success: false,
          error: 'Não é possível conceder permissão para aula pública'
        };
      }

      // 2. Verificar se o usuário é instrutor do curso
      const isInstrutor = await this.verificarInstrutor(aula.curso_id, instrutorId);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 3. Verificar se o aluno está matriculado no curso
      const matriculaQuery = `
        SELECT id, tipo_acesso 
        FROM rarcursos.matriculas 
        WHERE curso_id = $1 AND aluno_id = $2 AND status = 'ativa'
      `;
      
      const matriculaResult = await client.query(matriculaQuery, [aula.curso_id, alunoId]);

      if (matriculaResult.rows.length === 0) {
        return {
          success: false,
          error: 'Aluno não está matriculado neste curso'
        };
      }

      const matricula = matriculaResult.rows[0];

      // 4. Verificar se já tem acesso total (convidado_curso)
      if (matricula.tipo_acesso === 'convidado_curso') {
        return {
          success: false,
          error: 'Aluno já tem acesso total ao curso (convidado do curso)'
        };
      }

      // 5. Verificar se já tem permissão específica
      const permissaoExistenteQuery = `
        SELECT id FROM rarcursos.aula_permissoes 
        WHERE aula_id = $1 AND aluno_id = $2
      `;
      
      const permissaoExistenteResult = await client.query(permissaoExistenteQuery, [aulaId, alunoId]);

      if (permissaoExistenteResult.rows.length > 0) {
        return {
          success: false,
          error: 'Aluno já tem permissão para esta aula'
        };
      }

      // 6. Conceder permissão
      const insertPermissaoQuery = `
        INSERT INTO rarcursos.aula_permissoes (
          aula_id, aluno_id, concedida_por, tipo_permissao, criado_em
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
      
      const novaPermissaoResult = await client.query(insertPermissaoQuery, [
        aulaId,
        alunoId,
        instrutorId,
        'convite_especifico'
      ]);

      return {
        success: true,
        data: novaPermissaoResult.rows[0]
      };

    } catch (error) {
      console.error('Erro ao conceder permissão:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Remove permissão específica de um aluno para uma aula
   * @param aulaId ID da aula
   * @param alunoId ID do aluno
   * @param instrutorId ID do instrutor que está removendo
   * @returns Resultado da operação
   */
  async removerPermissao(aulaId: string, alunoId: string, instrutorId: string) {
    const client = await pool.connect();
    
    try {
      // 1. Verificar se a aula existe
      const aulaQuery = `
        SELECT a.id, a.titulo, m.curso_id
        FROM rarcursos.aulas a
        JOIN rarcursos.modulos m ON a.modulo_id = m.id
        WHERE a.id = $1
      `;
      
      const aulaResult = await client.query(aulaQuery, [aulaId]);

      if (aulaResult.rows.length === 0) {
        return {
          success: false,
          error: 'Aula não encontrada'
        };
      }

      const aula = aulaResult.rows[0];

      // 2. Verificar se o usuário é instrutor do curso
      const isInstrutor = await this.verificarInstrutor(aula.curso_id, instrutorId);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 3. Verificar se existe permissão específica
      const permissaoQuery = `
        SELECT * FROM rarcursos.aula_permissoes 
        WHERE aula_id = $1 AND aluno_id = $2 AND tipo_permissao = 'convite_especifico'
      `;
      
      const permissaoResult = await client.query(permissaoQuery, [aulaId, alunoId]);

      if (permissaoResult.rows.length === 0) {
        return {
          success: false,
          error: 'Aluno não possui permissão específica para esta aula'
        };
      }

      const permissao = permissaoResult.rows[0];

      // 4. Remover permissão
      const deleteQuery = `
        DELETE FROM rarcursos.aula_permissoes 
        WHERE id = $1
      `;
      
      await client.query(deleteQuery, [permissao.id]);

      return {
        success: true,
        data: {
          permissao_removida: permissao,
          removido_por: instrutorId,
          removido_em: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Erro ao remover permissão:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Lista todas as permissões de uma aula específica
   * @param aulaId ID da aula
   * @param instrutorId ID do instrutor (para verificação)
   * @returns Lista de permissões
   */
  async listarPermissoesAula(aulaId: string, instrutorId: string) {
    const client = await pool.connect();
    
    try {
      // 1. Verificar se a aula existe
      const aulaQuery = `
        SELECT a.id, a.titulo, a.privada, m.curso_id
        FROM rarcursos.aulas a
        JOIN rarcursos.modulos m ON a.modulo_id = m.id
        WHERE a.id = $1
      `;
      
      const aulaResult = await client.query(aulaQuery, [aulaId]);

      if (aulaResult.rows.length === 0) {
        return {
          success: false,
          error: 'Aula não encontrada'
        };
      }

      const aula = aulaResult.rows[0];

      // 2. Verificar se o usuário é instrutor do curso
      const isInstrutor = await this.verificarInstrutor(aula.curso_id, instrutorId);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 3. Buscar alunos com acesso total (convidados do curso)
      const convidadosQuery = `
        SELECT 
          m.id,
          m.aluno_id,
          m.tipo_acesso,
          m.data_matricula,
          u.uid,
          u.nome,
          u.email
        FROM rarcursos.matriculas m
        JOIN rarcursos.users u ON m.aluno_id = u.uid
        WHERE m.curso_id = $1 AND m.tipo_acesso = 'convidado_curso' AND m.status = 'ativa'
      `;
      
      const convidadosResult = await client.query(convidadosQuery, [aula.curso_id]);
      const convidadosCurso = convidadosResult.rows.map(row => ({
        id: row.id,
        aluno_id: row.aluno_id,
        tipo_acesso: row.tipo_acesso,
        data_matricula: row.data_matricula,
        users: {
          uid: row.uid,
          nome: row.nome,
          email: row.email
        }
      }));

      // 4. Buscar permissões específicas para esta aula
      const permissoesQuery = `
        SELECT 
          ap.id,
          ap.aluno_id,
          ap.tipo_permissao,
          ap.criado_em,
          ap.concedida_por,
          u.uid as aluno_uid,
          u.nome as aluno_nome,
          u.email as aluno_email,
          i.uid as instrutor_uid,
          i.nome as instrutor_nome
        FROM rarcursos.aula_permissoes ap
        JOIN rarcursos.users u ON ap.aluno_id = u.uid
        LEFT JOIN rarcursos.users i ON ap.concedida_por = i.uid
        WHERE ap.aula_id = $1
      `;
      
      const permissoesResult = await client.query(permissoesQuery, [aulaId]);
      const permissoesEspecificas = permissoesResult.rows.map(row => ({
        id: row.id,
        aluno_id: row.aluno_id,
        tipo_permissao: row.tipo_permissao,
        criado_em: row.criado_em,
        concedida_por: row.concedida_por,
        users: {
          uid: row.aluno_uid,
          nome: row.aluno_nome,
          email: row.aluno_email
        },
        instrutor: {
          uid: row.instrutor_uid,
          nome: row.instrutor_nome
        }
      }));

      // 5. Buscar alunos matriculados sem acesso
      const matriculadosQuery = `
        SELECT 
          m.id,
          m.aluno_id,
          m.tipo_acesso,
          m.data_matricula,
          u.uid,
          u.nome,
          u.email
        FROM rarcursos.matriculas m
        JOIN rarcursos.users u ON m.aluno_id = u.uid
        WHERE m.curso_id = $1 AND m.tipo_acesso = 'matriculado' AND m.status = 'ativa'
      `;
      
      const matriculadosResult = await client.query(matriculadosQuery, [aula.curso_id]);
      const matriculados = matriculadosResult.rows.map(row => ({
        id: row.id,
        aluno_id: row.aluno_id,
        tipo_acesso: row.tipo_acesso,
        data_matricula: row.data_matricula,
        users: {
          uid: row.uid,
          nome: row.nome,
          email: row.email
        }
      }));

      // Filtrar matriculados que não têm permissão específica
      const alunosComPermissaoEspecifica = new Set(
        permissoesEspecificas.map(p => p.aluno_id)
      );

      const matriculadosSemAcesso = matriculados.filter(
        m => !alunosComPermissaoEspecifica.has(m.aluno_id)
      );

      return {
        success: true,
        data: {
          aula: aula,
          resumo: {
            total_com_acesso: convidadosCurso.length + permissoesEspecificas.length,
            convidados_curso: convidadosCurso.length,
            permissoes_especificas: permissoesEspecificas.length,
            matriculados_sem_acesso: matriculadosSemAcesso.length
          },
          convidados_curso: convidadosCurso,
          permissoes_especificas: permissoesEspecificas,
          matriculados_sem_acesso: matriculadosSemAcesso
        }
      };

    } catch (error) {
      console.error('Erro ao listar permissões da aula:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Lista todas as permissões específicas de um aluno em um curso
   * @param cursoId ID do curso
   * @param alunoId ID do aluno
   * @param instrutorId ID do instrutor (para verificação)
   * @returns Lista de permissões do aluno
   */
  async listarPermissoesAluno(cursoId: string, alunoId: string, instrutorId: string) {
    const client = await pool.connect();
    
    try {
      // 1. Verificar se o usuário é instrutor do curso
      const isInstrutor = await this.verificarInstrutor(cursoId, instrutorId);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 2. Verificar se o aluno está matriculado
      const matriculaQuery = `
        SELECT 
          m.id,
          m.tipo_acesso,
          m.data_matricula,
          u.uid,
          u.nome,
          u.email
        FROM rarcursos.matriculas m
        JOIN rarcursos.users u ON m.aluno_id = u.uid
        WHERE m.curso_id = $1 AND m.aluno_id = $2 AND m.status = 'ativa'
      `;
      
      const matriculaResult = await client.query(matriculaQuery, [cursoId, alunoId]);

      if (matriculaResult.rows.length === 0) {
        return {
          success: false,
          error: 'Aluno não está matriculado neste curso'
        };
      }

      const matriculaRow = matriculaResult.rows[0];
      const matricula = {
        id: matriculaRow.id,
        tipo_acesso: matriculaRow.tipo_acesso,
        data_matricula: matriculaRow.data_matricula,
        users: {
          uid: matriculaRow.uid,
          nome: matriculaRow.nome,
          email: matriculaRow.email
        }
      };

      // 3. Buscar permissões específicas do aluno no curso
      const permissoesQuery = `
        SELECT 
          ap.id,
          ap.aula_id,
          ap.tipo_permissao,
          ap.criado_em,
          ap.concedida_por,
          a.id as aula_id_full,
          a.titulo as aula_titulo,
          a.descricao as aula_descricao,
          a.privada as aula_privada,
          mod.id as modulo_id,
          mod.titulo as modulo_titulo,
          i.uid as instrutor_uid,
          i.nome as instrutor_nome
        FROM rarcursos.aula_permissoes ap
        JOIN rarcursos.aulas a ON ap.aula_id = a.id
        JOIN rarcursos.modulos mod ON a.modulo_id = mod.id
        LEFT JOIN rarcursos.users i ON ap.concedida_por = i.uid
        WHERE ap.aluno_id = $1 AND ap.tipo_permissao = 'convite_especifico' AND mod.curso_id = $2
      `;
      
      const permissoesResult = await client.query(permissoesQuery, [alunoId, cursoId]);
      const permissoesDoCurso = permissoesResult.rows.map(row => ({
        id: row.id,
        aula_id: row.aula_id,
        tipo_permissao: row.tipo_permissao,
        criado_em: row.criado_em,
        concedida_por: row.concedida_por,
        aulas: {
          id: row.aula_id_full,
          titulo: row.aula_titulo,
          descricao: row.aula_descricao,
          privada: row.aula_privada,
          modulos: {
            id: row.modulo_id,
            titulo: row.modulo_titulo
          }
        },
        instrutor: {
          uid: row.instrutor_uid,
          nome: row.instrutor_nome
        }
      }));

      return {
        success: true,
        data: {
          aluno: matricula,
          tipo_acesso_geral: matricula.tipo_acesso,
          tem_acesso_total: matricula.tipo_acesso === 'convidado_curso',
          permissoes_especificas: permissoesDoCurso,
          total_permissoes_especificas: permissoesDoCurso.length
        }
      };

    } catch (error) {
      console.error('Erro ao listar permissões do aluno:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Verifica se um usuário é instrutor de um curso
   * @param cursoId ID do curso
   * @param usuarioId ID do usuário
   * @returns true se for instrutor
   */
  private async verificarInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT instrutor_id FROM rarcursos.cursos 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [cursoId]);
      
      if (result.rows.length === 0) return false;
      return result.rows[0].instrutor_id === usuarioId;
      
    } catch (error) {
      console.error('Erro ao verificar instrutor:', error);
      return false;
    } finally {
      client.release();
    }
  }
}

// Instância singleton do serviço
export const aulaPermissoesService = new AulaPermissoesService();
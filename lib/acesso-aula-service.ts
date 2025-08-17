import { Pool } from 'pg';
import type { 
  AcessoAulaResult, 
  Aula, 
  Matricula, 
  AulaPermissao 
} from './types/aulas-privadas';

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
 * Serviço para verificação de acesso a aulas privadas
 * Implementa a lógica híbrida de convites (curso completo vs aulas específicas)
 */
export class AcessoAulaService {
  constructor() {
    // Não precisa mais de inicialização do Supabase
  }

  /**
   * Verifica se um aluno pode assistir uma aula específica
   * @param aulaId ID da aula
   * @param alunoId ID do aluno (uid da tabela users)
   * @returns Resultado da verificação de acesso
   */
  async podeAssistirAula(aulaId: string, alunoId: string): Promise<AcessoAulaResult> {
    try {
      // 1. Buscar dados da aula
      const aula = await this.getAula(aulaId);
      if (!aula) {
        return { 
          pode_assistir: false, 
          motivo: "Aula não encontrada" 
        };
      }

      // 2. Verificar se está matriculado no curso
      const matricula = await this.getMatricula(aula.curso_id, alunoId);
      if (!matricula) {
        return { 
          pode_assistir: false, 
          motivo: "Não matriculado no curso" 
        };
      }

      // 3. Se aula é pública, pode assistir
      if (!aula.privada) {
        return { 
          pode_assistir: true, 
          tipo_acesso: "aula_publica" 
        };
      }

      // 4. Se aula é privada, verificar tipo de acesso
      
      // 4a. Se foi convidado para o curso completo
      if (matricula.tipo_acesso === 'convidado_curso') {
        return { 
          pode_assistir: true, 
          tipo_acesso: "convidado_curso",
          motivo: "Acesso total ao curso"
        };
      }

      // 4b. Verificar permissão específica para esta aula
      const permissaoEspecifica = await this.getAulaPermissao(aulaId, alunoId);
      if (permissaoEspecifica) {
        return { 
          pode_assistir: true, 
          tipo_acesso: "convite_especifico",
          motivo: "Convite específico para esta aula"
        };
      }

      // 4c. Sem permissão
      return { 
        pode_assistir: false, 
        motivo: "Esta aula requer convite específico do instrutor" 
      };

    } catch (error) {
      console.error('Erro ao verificar acesso à aula:', error);
      return { 
        pode_assistir: false, 
        motivo: "Erro interno ao verificar permissões" 
      };
    }
  }

  /**
   * Verifica acesso a múltiplas aulas de um curso
   * @param cursoId ID do curso
   * @param alunoId ID do aluno
   * @returns Array com resultado de acesso para cada aula
   */
  async verificarAcessoCurso(cursoId: string, alunoId: string): Promise<Array<Aula & AcessoAulaResult>> {
    try {
      // Buscar todas as aulas do curso
      const aulas = await this.getAulasCurso(cursoId);
      
      // Verificar acesso para cada aula
      const aulasComAcesso = await Promise.all(
        aulas.map(async (aula) => {
          const acesso = await this.podeAssistirAula(aula.id, alunoId);
          return {
            ...aula,
            ...acesso
          };
        })
      );

      return aulasComAcesso;

    } catch (error) {
      console.error('Erro ao verificar acesso ao curso:', error);
      return [];
    }
  }

  /**
   * Busca dados de uma aula
   * @param aulaId ID da aula
   * @returns Dados da aula ou null se não encontrada
   */
  private async getAula(aulaId: string): Promise<Aula | null> {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT * FROM rarcursos.aulas WHERE id = $1';
      const result = await client.query(query, [aulaId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar aula:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Busca matrícula de um aluno em um curso
   * @param cursoId ID do curso
   * @param alunoId ID do aluno
   * @returns Dados da matrícula ou null se não encontrada
   */
  private async getMatricula(cursoId: string, alunoId: string): Promise<Matricula | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM rarcursos.matriculas 
        WHERE curso_id = $1 AND aluno_id = $2 AND status = 'ativa'
      `;
      const result = await client.query(query, [cursoId, alunoId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar matrícula:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Busca permissão específica de um aluno para uma aula
   * @param aulaId ID da aula
   * @param alunoId ID do aluno
   * @returns Dados da permissão ou null se não encontrada
   */
  private async getAulaPermissao(aulaId: string, alunoId: string): Promise<AulaPermissao | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM rarcursos.aula_permissoes 
        WHERE aula_id = $1 AND aluno_id = $2
      `;
      const result = await client.query(query, [aulaId, alunoId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar permissão de aula:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Busca todas as aulas de um curso
   * @param cursoId ID do curso
   * @returns Array de aulas do curso
   */
  private async getAulasCurso(cursoId: string): Promise<Aula[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT a.* FROM rarcursos.aulas a
        JOIN rarcursos.modulos m ON a.modulo_id = m.id
        WHERE m.curso_id = $1 AND a.ativo = true
        ORDER BY a.criado_em ASC
      `;
      const result = await client.query(query, [cursoId]);
      
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar aulas do curso:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Verifica se um usuário é instrutor de um curso
   * @param cursoId ID do curso
   * @param usuarioId ID do usuário
   * @returns true se for instrutor, false caso contrário
   */
  async isInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT instrutor_id FROM rarcursos.cursos WHERE id = $1';
      const result = await client.query(query, [cursoId]);

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].instrutor_id === usuarioId;

    } catch (error) {
      console.error('Erro ao verificar instrutor:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Busca tipo de acesso de um aluno a um curso
   * @param cursoId ID do curso
   * @param alunoId ID do aluno
   * @returns Tipo de acesso ou null se não matriculado
   */
  async getTipoAcesso(cursoId: string, alunoId: string): Promise<'matriculado' | 'convidado_curso' | null> {
    const matricula = await this.getMatricula(cursoId, alunoId);
    return matricula?.tipo_acesso || null;
  }

  /**
   * Lista todos os alunos de um curso agrupados por tipo de acesso
   * @param cursoId ID do curso
   * @returns Objeto com alunos agrupados por tipo
   */
  async getAlunosPorTipoAcesso(cursoId: string) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          m.*,
          u.uid,
          u.nome,
          u.email
        FROM rarcursos.matriculas m
        JOIN rarcursos.users u ON m.aluno_id = u.uid
        WHERE m.curso_id = $1 AND m.status = 'ativa'
      `;
      
      const result = await client.query(query, [cursoId]);
      
      const data = result.rows.map(row => ({
        ...row,
        users: {
          uid: row.uid,
          nome: row.nome,
          email: row.email
        }
      }));

      const matriculados = data.filter(m => m.tipo_acesso === 'matriculado');
      const convidados_curso = data.filter(m => m.tipo_acesso === 'convidado_curso');

      return {
        matriculados,
        convidados_curso
      };

    } catch (error) {
      console.error('Erro ao buscar alunos por tipo de acesso:', error);
      return {
        matriculados: [],
        convidados_curso: []
      };
    } finally {
      client.release();
    }
  }
}

// Instância singleton do serviço
export const acessoAulaService = new AcessoAulaService();
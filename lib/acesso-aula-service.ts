import { createClient } from '@supabase/supabase-js';
import type { 
  AcessoAulaResult, 
  Aula, 
  Matricula, 
  AulaPermissao 
} from './types/aulas-privadas';

/**
 * Serviço para verificação de acesso a aulas privadas
 * Implementa a lógica híbrida de convites (curso completo vs aulas específicas)
 */
export class AcessoAulaService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: { schema: 'rarcursos' }
      }
    );
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
    const { data, error } = await this.supabase
      .from('aulas')
      .select('*')
      .eq('id', aulaId)
      .single();

    if (error) {
      console.error('Erro ao buscar aula:', error);
      return null;
    }

    return data;
  }

  /**
   * Busca matrícula de um aluno em um curso
   * @param cursoId ID do curso
   * @param alunoId ID do aluno
   * @returns Dados da matrícula ou null se não encontrada
   */
  private async getMatricula(cursoId: string, alunoId: string): Promise<Matricula | null> {
    const { data, error } = await this.supabase
      .from('matriculas')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('aluno_id', alunoId)
      .eq('status', 'ativa')
      .single();

    if (error) {
      // Não logar erro se for apenas "não encontrado"
      if (error.code !== 'PGRST116') {
        console.error('Erro ao buscar matrícula:', error);
      }
      return null;
    }

    return data;
  }

  /**
   * Busca permissão específica de um aluno para uma aula
   * @param aulaId ID da aula
   * @param alunoId ID do aluno
   * @returns Dados da permissão ou null se não encontrada
   */
  private async getAulaPermissao(aulaId: string, alunoId: string): Promise<AulaPermissao | null> {
    const { data, error } = await this.supabase
      .from('aula_permissoes')
      .select('*')
      .eq('aula_id', aulaId)
      .eq('aluno_id', alunoId)
      .single();

    if (error) {
      // Não logar erro se for apenas "não encontrado"
      if (error.code !== 'PGRST116') {
        console.error('Erro ao buscar permissão de aula:', error);
      }
      return null;
    }

    return data;
  }

  /**
   * Busca todas as aulas de um curso
   * @param cursoId ID do curso
   * @returns Array de aulas do curso
   */
  private async getAulasCurso(cursoId: string): Promise<Aula[]> {
    const { data, error } = await this.supabase
      .from('aulas')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('ativo', true)
      .order('criado_em', { ascending: true });

    if (error) {
      console.error('Erro ao buscar aulas do curso:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Verifica se um usuário é instrutor de um curso
   * @param cursoId ID do curso
   * @param usuarioId ID do usuário
   * @returns true se for instrutor, false caso contrário
   */
  async isInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('cursos')
        .select('instrutor_id')
        .eq('id', cursoId)
        .single();

      if (error) {
        console.error('Erro ao verificar instrutor:', error);
        return false;
      }

      return data?.instrutor_id === usuarioId;

    } catch (error) {
      console.error('Erro ao verificar instrutor:', error);
      return false;
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
    try {
      const { data, error } = await this.supabase
        .from('matriculas')
        .select(`
          *,
          users:aluno_id (
            uid,
            nome,
            email
          )
        `)
        .eq('curso_id', cursoId)
        .eq('status', 'ativa');

      if (error) {
        console.error('Erro ao buscar alunos do curso:', error);
        return {
          matriculados: [],
          convidados_curso: []
        };
      }

      const matriculados = data?.filter(m => m.tipo_acesso === 'matriculado') || [];
      const convidados_curso = data?.filter(m => m.tipo_acesso === 'convidado_curso') || [];

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
    }
  }
}

// Instância singleton do serviço
export const acessoAulaService = new AcessoAulaService();
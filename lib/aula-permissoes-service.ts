import { createClient } from '@supabase/supabase-js';
import type { AulaPermissao, Usuario } from './types/aulas-privadas';

/**
 * Serviço para gerenciamento de permissões específicas de aulas
 * Permite conceder/remover permissões granulares para aulas privadas
 */
export class AulaPermissoesService {
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
   * Concede permissão específica para um aluno assistir uma aula privada
   * @param aulaId ID da aula
   * @param alunoId ID do aluno
   * @param instrutorId ID do instrutor que está concedendo
   * @returns Resultado da operação
   */
  async concederPermissao(aulaId: string, alunoId: string, instrutorId: string) {
    try {
      // 1. Verificar se a aula existe e é privada
      const { data: aula, error: aulaError } = await this.supabase
        .from('aulas')
        .select('id, titulo, privada, curso_id')
        .eq('id', aulaId)
        .single();

      if (aulaError || !aula) {
        return {
          success: false,
          error: 'Aula não encontrada'
        };
      }

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
      const { data: matricula } = await this.supabase
        .from('matriculas')
        .select('id, tipo_acesso')
        .eq('curso_id', aula.curso_id)
        .eq('aluno_id', alunoId)
        .eq('status', 'ativa')
        .single();

      if (!matricula) {
        return {
          success: false,
          error: 'Aluno não está matriculado neste curso'
        };
      }

      // 4. Verificar se já tem acesso total (convidado_curso)
      if (matricula.tipo_acesso === 'convidado_curso') {
        return {
          success: false,
          error: 'Aluno já tem acesso total ao curso (convidado do curso)'
        };
      }

      // 5. Verificar se já tem permissão específica
      const { data: permissaoExistente } = await this.supabase
        .from('aula_permissoes')
        .select('id')
        .eq('aula_id', aulaId)
        .eq('aluno_id', alunoId)
        .single();

      if (permissaoExistente) {
        return {
          success: false,
          error: 'Aluno já tem permissão para esta aula'
        };
      }

      // 6. Conceder permissão
      const { data: novaPermissao, error: permissaoError } = await this.supabase
        .from('aula_permissoes')
        .insert({
          aula_id: aulaId,
          aluno_id: alunoId,
          concedida_por: instrutorId,
          tipo_permissao: 'convite_especifico'
        })
        .select()
        .single();

      if (permissaoError) {
        console.error('Erro ao conceder permissão:', permissaoError);
        return {
          success: false,
          error: 'Erro ao salvar permissão no banco de dados'
        };
      }

      return {
        success: true,
        data: novaPermissao
      };

    } catch (error) {
      console.error('Erro ao conceder permissão:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
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
    try {
      // 1. Verificar se a aula existe
      const { data: aula } = await this.supabase
        .from('aulas')
        .select('id, titulo, curso_id')
        .eq('id', aulaId)
        .single();

      if (!aula) {
        return {
          success: false,
          error: 'Aula não encontrada'
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

      // 3. Verificar se existe permissão específica
      const { data: permissao } = await this.supabase
        .from('aula_permissoes')
        .select('*')
        .eq('aula_id', aulaId)
        .eq('aluno_id', alunoId)
        .eq('tipo_permissao', 'convite_especifico')
        .single();

      if (!permissao) {
        return {
          success: false,
          error: 'Aluno não possui permissão específica para esta aula'
        };
      }

      // 4. Remover permissão
      const { error: deleteError } = await this.supabase
        .from('aula_permissoes')
        .delete()
        .eq('id', permissao.id);

      if (deleteError) {
        console.error('Erro ao remover permissão:', deleteError);
        return {
          success: false,
          error: 'Erro ao remover permissão do banco de dados'
        };
      }

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
    }
  }

  /**
   * Lista todas as permissões de uma aula específica
   * @param aulaId ID da aula
   * @param instrutorId ID do instrutor (para verificação)
   * @returns Lista de permissões
   */
  async listarPermissoesAula(aulaId: string, instrutorId: string) {
    try {
      // 1. Verificar se a aula existe
      const { data: aula } = await this.supabase
        .from('aulas')
        .select('id, titulo, privada, curso_id')
        .eq('id', aulaId)
        .single();

      if (!aula) {
        return {
          success: false,
          error: 'Aula não encontrada'
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

      // 3. Buscar alunos com acesso total (convidados do curso)
      const { data: convidadosCurso } = await this.supabase
        .from('matriculas')
        .select(`
          id,
          aluno_id,
          tipo_acesso,
          data_matricula,
          users:aluno_id (
            uid,
            nome,
            email
          )
        `)
        .eq('curso_id', aula.curso_id)
        .eq('tipo_acesso', 'convidado_curso')
        .eq('status', 'ativa');

      // 4. Buscar permissões específicas para esta aula
      const { data: permissoesEspecificas } = await this.supabase
        .from('aula_permissoes')
        .select(`
          id,
          aluno_id,
          tipo_permissao,
          criado_em,
          concedida_por,
          users:aluno_id (
            uid,
            nome,
            email
          ),
          instrutor:concedida_por (
            uid,
            nome
          )
        `)
        .eq('aula_id', aulaId);

      // 5. Buscar alunos matriculados sem acesso
      const { data: matriculados } = await this.supabase
        .from('matriculas')
        .select(`
          id,
          aluno_id,
          tipo_acesso,
          data_matricula,
          users:aluno_id (
            uid,
            nome,
            email
          )
        `)
        .eq('curso_id', aula.curso_id)
        .eq('tipo_acesso', 'matriculado')
        .eq('status', 'ativa');

      // Filtrar matriculados que não têm permissão específica
      const alunosComPermissaoEspecifica = new Set(
        (permissoesEspecificas || []).map(p => p.aluno_id)
      );

      const matriculadosSemAcesso = (matriculados || []).filter(
        m => !alunosComPermissaoEspecifica.has(m.aluno_id)
      );

      return {
        success: true,
        data: {
          aula: aula,
          resumo: {
            total_com_acesso: (convidadosCurso?.length || 0) + (permissoesEspecificas?.length || 0),
            convidados_curso: convidadosCurso?.length || 0,
            permissoes_especificas: permissoesEspecificas?.length || 0,
            matriculados_sem_acesso: matriculadosSemAcesso.length
          },
          convidados_curso: convidadosCurso || [],
          permissoes_especificas: permissoesEspecificas || [],
          matriculados_sem_acesso: matriculadosSemAcesso
        }
      };

    } catch (error) {
      console.error('Erro ao listar permissões da aula:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
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
      const { data: matricula } = await this.supabase
        .from('matriculas')
        .select(`
          id,
          tipo_acesso,
          data_matricula,
          users:aluno_id (
            uid,
            nome,
            email
          )
        `)
        .eq('curso_id', cursoId)
        .eq('aluno_id', alunoId)
        .eq('status', 'ativa')
        .single();

      if (!matricula) {
        return {
          success: false,
          error: 'Aluno não está matriculado neste curso'
        };
      }

      // 3. Buscar permissões específicas do aluno
      const { data: permissoes } = await this.supabase
        .from('aula_permissoes')
        .select(`
          id,
          aula_id,
          tipo_permissao,
          criado_em,
          concedida_por,
          aulas:aula_id (
            id,
            titulo,
            descricao,
            privada,
            modulos:modulo_id (
              id,
              titulo
            )
          ),
          instrutor:concedida_por (
            uid,
            nome
          )
        `)
        .eq('aluno_id', alunoId)
        .eq('tipo_permissao', 'convite_especifico');

      // Filtrar apenas aulas do curso específico
      const permissoesDoCurso = (permissoes || []).filter(
        p => p.aulas?.curso_id === cursoId
      );

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
    }
  }

  /**
   * Verifica se um usuário é instrutor de um curso
   * @param cursoId ID do curso
   * @param usuarioId ID do usuário
   * @returns true se for instrutor
   */
  private async verificarInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('cursos')
      .select('instrutor_id')
      .eq('id', cursoId)
      .single();

    if (error) return false;
    return data?.instrutor_id === usuarioId;
  }
}

// Instância singleton do serviço
export const aulaPermissoesService = new AulaPermissoesService();
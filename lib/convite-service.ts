import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { 
  ConviteCursoCompleto,
  ConviteAulasEspecificas,
  ConviteResult,
  ConvitePendente,
  AulaDetalhes,
  Usuario,
  Curso,
  Matricula
} from './types/aulas-privadas';

/**
 * Serviço para gerenciamento de convites do sistema híbrido
 * Implementa convites para curso completo e aulas específicas
 */
export class ConviteService {
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
   * Envia convite para curso completo (acesso a todas as aulas)
   * @param dados Dados do convite
   * @returns Resultado da operação com token gerado
   */
  async enviarConviteCursoCompleto(dados: ConviteCursoCompleto): Promise<ConviteResult> {
    try {
      // 1. Validar se usuário é instrutor do curso
      const isInstrutor = await this.verificarInstrutor(dados.curso_id, dados.instrutor_id);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 2. Verificar se já existe convite pendente para este email/curso
      const conviteExistente = await this.getConvitePendente(dados.email, dados.curso_id);
      if (conviteExistente && !conviteExistente.aceito) {
        return {
          success: false,
          error: 'Já existe um convite pendente para este email neste curso'
        };
      }

      // 3. Verificar se usuário já está matriculado
      const usuarioExistente = await this.getUserByEmail(dados.email);
      if (usuarioExistente) {
        const jaMatriculado = await this.verificarMatricula(dados.curso_id, usuarioExistente.uid);
        if (jaMatriculado) {
          return {
            success: false,
            error: 'Usuário já está matriculado neste curso'
          };
        }
      }

      // 4. Gerar token único
      const token = this.generateToken();

      // 5. Salvar convite pendente
      const { error: saveError } = await this.supabase
        .from('convites_pendentes')
        .insert({
          email: dados.email,
          curso_id: dados.curso_id,
          tipo_convite: 'curso_completo',
          enviado_por: dados.instrutor_id,
          mensagem: dados.mensagem,
          token: token,
          aceito: false
        });

      if (saveError) {
        console.error('Erro ao salvar convite:', saveError);
        return {
          success: false,
          error: 'Erro ao salvar convite no banco de dados'
        };
      }

      // 6. Enviar email (implementação futura)
      await this.enviarEmailConviteCursoCompleto({
        email: dados.email,
        curso_id: dados.curso_id,
        instrutor_id: dados.instrutor_id,
        mensagem: dados.mensagem,
        token
      });

      return {
        success: true,
        token
      };

    } catch (error) {
      console.error('Erro ao enviar convite para curso completo:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  /**
   * Envia convite para aulas específicas
   * @param dados Dados do convite
   * @returns Resultado da operação com token gerado
   */
  async enviarConviteAulasEspecificas(dados: ConviteAulasEspecificas): Promise<ConviteResult> {
    try {
      // 1. Validar se usuário é instrutor do curso
      const isInstrutor = await this.verificarInstrutor(dados.curso_id, dados.instrutor_id);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 2. Validar se todas as aulas pertencem ao curso
      const aulasValidas = await this.validarAulasDoCurso(dados.aula_ids, dados.curso_id);
      if (!aulasValidas) {
        return {
          success: false,
          error: 'Uma ou mais aulas não pertencem a este curso'
        };
      }

      // 3. Verificar se já existe convite pendente
      const conviteExistente = await this.getConvitePendente(dados.email, dados.curso_id);
      if (conviteExistente && !conviteExistente.aceito) {
        return {
          success: false,
          error: 'Já existe um convite pendente para este email neste curso'
        };
      }

      // 4. Gerar token único
      const token = this.generateToken();

      // 5. Salvar convite pendente
      const { error: saveError } = await this.supabase
        .from('convites_pendentes')
        .insert({
          email: dados.email,
          curso_id: dados.curso_id,
          tipo_convite: 'aulas_especificas',
          aula_ids: dados.aula_ids,
          enviado_por: dados.instrutor_id,
          mensagem: dados.mensagem,
          token: token,
          aceito: false
        });

      if (saveError) {
        console.error('Erro ao salvar convite:', saveError);
        return {
          success: false,
          error: 'Erro ao salvar convite no banco de dados'
        };
      }

      // 6. Enviar email (implementação futura)
      await this.enviarEmailConviteAulasEspecificas({
        email: dados.email,
        curso_id: dados.curso_id,
        aula_ids: dados.aula_ids,
        instrutor_id: dados.instrutor_id,
        mensagem: dados.mensagem,
        token
      });

      return {
        success: true,
        token
      };

    } catch (error) {
      console.error('Erro ao enviar convite para aulas específicas:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  /**
   * Aceita um convite usando o token
   * @param token Token do convite
   * @returns Resultado da operação
   */
  async aceitarConvite(token: string): Promise<ConviteResult> {
    try {
      // 1. Buscar convite pendente
      const convite = await this.getConviteByToken(token);
      if (!convite) {
        return {
          success: false,
          error: 'Convite não encontrado'
        };
      }

      if (convite.aceito) {
        return {
          success: false,
          error: 'Convite já foi aceito'
        };
      }

      if (new Date() > new Date(convite.expira_em)) {
        return {
          success: false,
          error: 'Convite expirado'
        };
      }

      // 2. Verificar se usuário já existe
      let usuario = await this.getUserByEmail(convite.email);
      if (!usuario) {
        // Criar usuário se não existir (implementação futura)
        usuario = await this.criarUsuarioConvidado(convite.email);
        if (!usuario) {
          return {
            success: false,
            error: 'Erro ao criar usuário'
          };
        }
      }

      // 3. Processar convite baseado no tipo
      if (convite.tipo_convite === 'curso_completo') {
        await this.processarConviteCursoCompleto(convite, usuario.uid);
      } else {
        await this.processarConviteAulasEspecificas(convite, usuario.uid);
      }

      // 4. Marcar convite como aceito
      await this.marcarConviteAceito(token);

      return {
        success: true,
        token
      };

    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  /**
   * Altera tipo de acesso de um aluno matriculado
   * @param cursoId ID do curso
   * @param alunoId ID do aluno
   * @param novoTipo Novo tipo de acesso
   * @param instrutorId ID do instrutor que está fazendo a alteração
   * @returns Resultado da operação
   */
  async alterarTipoAcesso(
    cursoId: string, 
    alunoId: string, 
    novoTipo: 'matriculado' | 'convidado_curso',
    instrutorId: string
  ): Promise<ConviteResult> {
    try {
      // 1. Verificar se usuário é instrutor
      const isInstrutor = await this.verificarInstrutor(cursoId, instrutorId);
      if (!isInstrutor) {
        return {
          success: false,
          error: 'Usuário não é instrutor deste curso'
        };
      }

      // 2. Verificar se aluno está matriculado
      const matricula = await this.getMatricula(cursoId, alunoId);
      if (!matricula) {
        return {
          success: false,
          error: 'Aluno não está matriculado neste curso'
        };
      }

      // 3. Atualizar tipo de acesso
      const { error } = await this.supabase
        .from('matriculas')
        .update({ 
          tipo_acesso: novoTipo,
          adicionado_por: instrutorId,
          atualizado_em: new Date().toISOString()
        })
        .eq('curso_id', cursoId)
        .eq('aluno_id', alunoId);

      if (error) {
        console.error('Erro ao alterar tipo de acesso:', error);
        return {
          success: false,
          error: 'Erro ao atualizar tipo de acesso'
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Erro ao alterar tipo de acesso:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Métodos privados auxiliares

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async verificarInstrutor(cursoId: string, usuarioId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('cursos')
      .select('instrutor_id')
      .eq('id', cursoId)
      .single();

    if (error) return false;
    return data?.instrutor_id === usuarioId;
  }

  private async getConvitePendente(email: string, cursoId: string): Promise<ConvitePendente | null> {
    const { data, error } = await this.supabase
      .from('convites_pendentes')
      .select('*')
      .eq('email', email)
      .eq('curso_id', cursoId)
      .eq('aceito', false)
      .single();

    if (error) return null;
    return data;
  }

  private async getConviteByToken(token: string): Promise<ConvitePendente | null> {
    const { data, error } = await this.supabase
      .from('convites_pendentes')
      .select('*')
      .eq('token', token)
      .single();

    if (error) return null;
    return data;
  }

  private async getUserByEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  }

  private async verificarMatricula(cursoId: string, alunoId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('matriculas')
      .select('id')
      .eq('curso_id', cursoId)
      .eq('aluno_id', alunoId)
      .eq('status', 'ativa')
      .single();

    return !error && !!data;
  }

  private async getMatricula(cursoId: string, alunoId: string): Promise<Matricula | null> {
    const { data, error } = await this.supabase
      .from('matriculas')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('aluno_id', alunoId)
      .eq('status', 'ativa')
      .single();

    if (error) return null;
    return data;
  }

  private async validarAulasDoCurso(aulaIds: string[], cursoId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('aulas')
      .select('id')
      .eq('curso_id', cursoId)
      .in('id', aulaIds);

    if (error) return false;
    return data?.length === aulaIds.length;
  }

  private async processarConviteCursoCompleto(convite: ConvitePendente, usuarioId: string): Promise<void> {
    // Criar matrícula com tipo_acesso = 'convidado_curso'
    await this.supabase
      .from('matriculas')
      .insert({
        aluno_id: usuarioId,
        curso_id: convite.curso_id,
        tipo_acesso: 'convidado_curso',
        adicionado_por: convite.enviado_por,
        status: 'ativa'
      });
  }

  private async processarConviteAulasEspecificas(convite: ConvitePendente, usuarioId: string): Promise<void> {
    // 1. Criar matrícula normal se não existir
    const matriculaExistente = await this.verificarMatricula(convite.curso_id, usuarioId);
    
    if (!matriculaExistente) {
      await this.supabase
        .from('matriculas')
        .insert({
          aluno_id: usuarioId,
          curso_id: convite.curso_id,
          tipo_acesso: 'matriculado',
          adicionado_por: convite.enviado_por,
          status: 'ativa'
        });
    }

    // 2. Criar permissões específicas para cada aula
    if (convite.aula_ids && convite.aula_ids.length > 0) {
      const permissoes = convite.aula_ids.map(aulaId => ({
        aula_id: aulaId,
        aluno_id: usuarioId,
        concedida_por: convite.enviado_por,
        tipo_permissao: 'convite_especifico' as const
      }));

      await this.supabase
        .from('aula_permissoes')
        .insert(permissoes);
    }
  }

  private async marcarConviteAceito(token: string): Promise<void> {
    await this.supabase
      .from('convites_pendentes')
      .update({ aceito: true })
      .eq('token', token);
  }

  private async criarUsuarioConvidado(email: string): Promise<Usuario | null> {
    // Implementação futura - criar usuário básico para convites
    // Por enquanto, retorna null para indicar que precisa ser implementado
    console.log('TODO: Implementar criação de usuário convidado para:', email);
    return null;
  }

  private async enviarEmailConviteCursoCompleto(dados: any): Promise<void> {
    // Implementação futura - envio de email
    console.log('TODO: Enviar email de convite para curso completo:', dados.email);
  }

  private async enviarEmailConviteAulasEspecificas(dados: any): Promise<void> {
    // Implementação futura - envio de email
    console.log('TODO: Enviar email de convite para aulas específicas:', dados.email);
  }
}

// Instância singleton do serviço
export const conviteService = new ConviteService();
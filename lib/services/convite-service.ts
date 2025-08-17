/**
 * Serviço para gerenciamento de convites do sistema híbrido de aulas privadas
 */

import { createClient } from '@supabase/supabase-js';
import { webhookService } from './webhook-service';
import { tokenService } from './token-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConviteCursoCompleto {
  email: string;
  curso_id: string;
  instrutor_id: string;
  mensagem?: string;
}

interface ConviteAulasEspecificas {
  email: string;
  curso_id: string;
  aula_ids: string[];
  instrutor_id: string;
  mensagem?: string;
}

interface ConvitePendente {
  id: string;
  email: string;
  curso_id: string;
  tipo_convite: 'curso_completo' | 'aulas_especificas';
  aula_ids?: string[];
  enviado_por: string;
  mensagem?: string;
  token: string;
  aceito: boolean;
  criado_em: Date;
  expira_em: Date;
}

export class ConviteService {
  /**
   * Envia convite para curso completo
   */
  async enviarConviteCursoCompleto(dados: ConviteCursoCompleto): Promise<string> {
    // 1. Gerar token único
    const token = tokenService.gerarToken();
    
    // 2. Buscar dados do curso e instrutor
    const { data: curso } = await supabase
      .from('cursos')
      .select('titulo')
      .eq('id', dados.curso_id)
      .single();

    const { data: instrutor } = await supabase
      .from('users')
      .select('nome, email')
      .eq('id', dados.instrutor_id)
      .single();

    if (!curso || !instrutor) {
      throw new Error('Curso ou instrutor não encontrado');
    }

    // 3. Salvar convite pendente
    const { error: saveError } = await supabase
      .from('convites_pendentes')
      .insert({
        email: dados.email,
        curso_id: dados.curso_id,
        tipo_convite: 'curso_completo',
        enviado_por: dados.instrutor_id,
        mensagem: dados.mensagem,
        token,
        aceito: false,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (saveError) {
      throw new Error(`Erro ao salvar convite: ${saveError.message}`);
    }

    // 4. Enviar dados para webhook n8n
    const sucesso = await webhookService.enviarConviteCursoCompleto({
      email: dados.email,
      curso_id: dados.curso_id,
      curso_titulo: curso.titulo,
      instrutor_nome: instrutor.nome,
      instrutor_email: instrutor.email,
      token,
      link_aceitar: `${process.env.NEXT_PUBLIC_URL_BASE}/convites/aceitar/${token}`,
      mensagem: dados.mensagem
    });

    if (!sucesso) {
      console.warn('⚠️ Falha ao enviar webhook, mas convite foi salvo no banco');
    }

    // 5. Registrar evento de auditoria
    const { sistemaAuditoria } = await import('../auditoria/sistema-auditoria');
    await sistemaAuditoria.registrarConviteEnviado(
      dados.instrutor_id,
      dados.email,
      dados.curso_id,
      'curso_completo',
      { curso_titulo: curso.titulo, webhook_sucesso: sucesso }
    );

    return token;
  }

  /**
   * Envia convite para aulas específicas
   */
  async enviarConviteAulasEspecificas(dados: ConviteAulasEspecificas): Promise<string> {
    // 1. Gerar token único
    const token = tokenService.gerarToken();
    
    // 2. Buscar dados do curso e instrutor
    const { data: curso } = await supabase
      .from('cursos')
      .select('titulo')
      .eq('id', dados.curso_id)
      .single();

    const { data: instrutor } = await supabase
      .from('users')
      .select('nome, email')
      .eq('id', dados.instrutor_id)
      .single();

    // 3. Buscar detalhes das aulas
    const { data: aulas } = await supabase
      .from('aulas')
      .select('id, titulo, descricao, duracao')
      .in('id', dados.aula_ids)
      .eq('curso_id', dados.curso_id);

    if (!curso || !instrutor || !aulas || aulas.length === 0) {
      throw new Error('Curso, instrutor ou aulas não encontrados');
    }

    // 4. Salvar convite pendente
    const { error: saveError } = await supabase
      .from('convites_pendentes')
      .insert({
        email: dados.email,
        curso_id: dados.curso_id,
        tipo_convite: 'aulas_especificas',
        aula_ids: dados.aula_ids,
        enviado_por: dados.instrutor_id,
        mensagem: dados.mensagem,
        token,
        aceito: false,
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (saveError) {
      throw new Error(`Erro ao salvar convite: ${saveError.message}`);
    }

    // 5. Enviar dados para webhook n8n
    const sucesso = await webhookService.enviarConviteAulasEspecificas({
      email: dados.email,
      curso_id: dados.curso_id,
      curso_titulo: curso.titulo,
      instrutor_nome: instrutor.nome,
      instrutor_email: instrutor.email,
      aulas: aulas.map(aula => ({
        id: aula.id,
        titulo: aula.titulo,
        descricao: aula.descricao,
        duracao: aula.duracao
      })),
      token,
      link_aceitar: `${process.env.NEXT_PUBLIC_URL_BASE}/convites/aceitar/${token}`,
      mensagem: dados.mensagem
    });

    if (!sucesso) {
      console.warn('⚠️ Falha ao enviar webhook, mas convite foi salvo no banco');
    }

    // 6. Registrar evento de auditoria
    const { sistemaAuditoria } = await import('../auditoria/sistema-auditoria');
    await sistemaAuditoria.registrarConviteEnviado(
      dados.instrutor_id,
      dados.email,
      dados.curso_id,
      'aulas_especificas',
      { 
        curso_titulo: curso.titulo, 
        aulas_ids: dados.aula_ids,
        total_aulas: aulas.length,
        webhook_sucesso: sucesso 
      }
    );

    return token;
  }

  /**
   * Processa aceitação de convite
   */
  async aceitarConvite(token: string): Promise<{ sucesso: boolean; curso_id?: string; erro?: string }> {
    // 1. Validar formato do token
    if (!tokenService.validarFormatoToken(token)) {
      return { sucesso: false, erro: 'Token inválido' };
    }

    // 2. Buscar convite pendente
    const { data: convite, error } = await supabase
      .from('convites_pendentes')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !convite) {
      return { sucesso: false, erro: 'Convite não encontrado' };
    }

    // 3. Verificar se já foi aceito
    if (convite.aceito) {
      return { sucesso: false, erro: 'Convite já foi aceito anteriormente' };
    }

    // 4. Verificar expiração
    if (new Date() > new Date(convite.expira_em)) {
      return { sucesso: false, erro: 'Convite expirado' };
    }

    // 5. Verificar se usuário já existe
    let { data: usuario } = await supabase
      .from('users')
      .select('id')
      .eq('email', convite.email)
      .single();

    // 6. Criar usuário se não existir
    if (!usuario) {
      const { data: novoUsuario, error: userError } = await supabase
        .from('users')
        .insert({
          email: convite.email,
          nome: convite.email.split('@')[0], // Nome temporário baseado no email
          senha: null, // Usuário precisará definir senha no primeiro login
          ativo: true
        })
        .select('id')
        .single();

      if (userError || !novoUsuario) {
        return { sucesso: false, erro: 'Erro ao criar usuário' };
      }

      usuario = novoUsuario;
    }

    // 7. Processar convite baseado no tipo
    if (convite.tipo_convite === 'curso_completo') {
      await this.processarConviteCursoCompleto(convite, usuario.id);
    } else {
      await this.processarConviteAulasEspecificas(convite, usuario.id);
    }

    // 8. Marcar convite como aceito
    await supabase
      .from('convites_pendentes')
      .update({ aceito: true })
      .eq('token', token);

    // 9. Registrar evento de auditoria
    const { sistemaAuditoria } = await import('../auditoria/sistema-auditoria');
    await sistemaAuditoria.registrarConviteAceito(
      usuario.id,
      token,
      convite.curso_id,
      convite.tipo_convite
    );

    return { sucesso: true, curso_id: convite.curso_id };
  }

  /**
   * Processa convite de curso completo
   */
  private async processarConviteCursoCompleto(convite: any, usuarioId: string): Promise<void> {
    // Verificar se já está matriculado
    const { data: matriculaExistente } = await supabase
      .from('matriculas')
      .select('id, tipo_acesso')
      .eq('aluno_id', usuarioId)
      .eq('curso_id', convite.curso_id)
      .single();

    if (matriculaExistente) {
      // Atualizar tipo de acesso para convidado_curso
      await supabase
        .from('matriculas')
        .update({ 
          tipo_acesso: 'convidado_curso',
          adicionado_por: convite.enviado_por
        })
        .eq('id', matriculaExistente.id);
    } else {
      // Criar nova matrícula como convidado do curso
      await supabase
        .from('matriculas')
        .insert({
          aluno_id: usuarioId,
          curso_id: convite.curso_id,
          tipo_acesso: 'convidado_curso',
          adicionado_por: convite.enviado_por,
          status: 'ativa'
        });
    }
  }

  /**
   * Processa convite de aulas específicas
   */
  private async processarConviteAulasEspecificas(convite: any, usuarioId: string): Promise<void> {
    // Verificar se já está matriculado
    const { data: matriculaExistente } = await supabase
      .from('matriculas')
      .select('id')
      .eq('aluno_id', usuarioId)
      .eq('curso_id', convite.curso_id)
      .single();

    if (!matriculaExistente) {
      // Criar matrícula básica se não existir
      await supabase
        .from('matriculas')
        .insert({
          aluno_id: usuarioId,
          curso_id: convite.curso_id,
          tipo_acesso: 'matriculado',
          adicionado_por: convite.enviado_por,
          status: 'ativa'
        });
    }

    // Criar permissões específicas para cada aula
    if (convite.aula_ids && convite.aula_ids.length > 0) {
      const permissoes = convite.aula_ids.map((aulaId: string) => ({
        aula_id: aulaId,
        aluno_id: usuarioId,
        concedida_por: convite.enviado_por,
        tipo_permissao: 'convite_especifico'
      }));

      await supabase
        .from('aula_permissoes')
        .upsert(permissoes, { 
          onConflict: 'aula_id,aluno_id',
          ignoreDuplicates: false 
        });
    }
  }

  /**
   * Lista convites pendentes de um instrutor
   */
  async listarConvitesPendentes(instrutorId: string): Promise<ConvitePendente[]> {
    const { data, error } = await supabase
      .from('convites_pendentes')
      .select(`
        *,
        cursos(titulo)
      `)
      .eq('enviado_por', instrutorId)
      .eq('aceito', false)
      .gte('expira_em', new Date().toISOString())
      .order('criado_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar convites: ${error.message}`);
    }

    return data || [];
  }
}

// Instância singleton
export const conviteService = new ConviteService();
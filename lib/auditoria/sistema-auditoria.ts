/**
 * Sistema de Auditoria para o Sistema Híbrido de Aulas Privadas
 * 
 * Registra todas as operações importantes para rastreabilidade e compliance
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export enum TipoEventoAuditoria {
  // Convites
  CONVITE_ENVIADO = 'convite_enviado',
  CONVITE_ACEITO = 'convite_aceito',
  CONVITE_EXPIRADO = 'convite_expirado',
  
  // Permissões
  PERMISSAO_CONCEDIDA = 'permissao_concedida',
  PERMISSAO_REMOVIDA = 'permissao_removida',
  TIPO_ACESSO_ALTERADO = 'tipo_acesso_alterado',
  
  // Acesso a aulas
  ACESSO_AULA_PERMITIDO = 'acesso_aula_permitido',
  ACESSO_AULA_NEGADO = 'acesso_aula_negado',
  CONTEUDO_AULA_ACESSADO = 'conteudo_aula_acessado',
  
  // Administração
  USUARIO_PROMOVIDO = 'usuario_promovido',
  USUARIO_REBAIXADO = 'usuario_rebaixado',
  CONFIGURACAO_ALTERADA = 'configuracao_alterada'
}

export enum NivelSeveridade {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface EventoAuditoria {
  id?: string;
  tipo_evento: TipoEventoAuditoria;
  severidade: NivelSeveridade;
  usuario_id?: string;
  usuario_afetado_id?: string;
  recurso_tipo: 'aula' | 'curso' | 'convite' | 'permissao' | 'sistema';
  recurso_id?: string;
  detalhes: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  sessao_id?: string;
}

export class SistemaAuditoria {
  private static instance: SistemaAuditoria;
  private filaEventos: EventoAuditoria[] = [];
  private processandoFila = false;

  private constructor() {
    // Processar fila a cada 5 segundos
    setInterval(() => this.processarFilaEventos(), 5000);
  }

  static getInstance(): SistemaAuditoria {
    if (!SistemaAuditoria.instance) {
      SistemaAuditoria.instance = new SistemaAuditoria();
    }
    return SistemaAuditoria.instance;
  }

  /**
   * Registra um evento de auditoria
   */
  async registrarEvento(evento: Omit<EventoAuditoria, 'id' | 'timestamp'>): Promise<void> {
    const eventoCompleto: EventoAuditoria = {
      ...evento,
      timestamp: new Date().toISOString()
    };

    // Adicionar à fila para processamento assíncrono
    this.filaEventos.push(eventoCompleto);

    // Em desenvolvimento, também logar no console
    if (process.env.NODE_ENV === 'development') {
      this.logConsole(eventoCompleto);
    }
  }

  /**
   * Métodos específicos para diferentes tipos de eventos
   */

  // Eventos de Convites
  async registrarConviteEnviado(
    instrutorId: string,
    email: string,
    cursoId: string,
    tipoConvite: 'curso_completo' | 'aulas_especificas',
    detalhesAdicionais: Record<string, any> = {}
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: TipoEventoAuditoria.CONVITE_ENVIADO,
      severidade: NivelSeveridade.INFO,
      usuario_id: instrutorId,
      recurso_tipo: 'convite',
      recurso_id: cursoId,
      detalhes: {
        email_destinatario: email,
        tipo_convite: tipoConvite,
        ...detalhesAdicionais
      }
    });
  }

  async registrarConviteAceito(
    alunoId: string,
    token: string,
    cursoId: string,
    tipoConvite: string
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: TipoEventoAuditoria.CONVITE_ACEITO,
      severidade: NivelSeveridade.INFO,
      usuario_id: alunoId,
      recurso_tipo: 'convite',
      recurso_id: cursoId,
      detalhes: {
        token_convite: token,
        tipo_convite: tipoConvite
      }
    });
  }

  // Eventos de Permissões
  async registrarPermissaoConcedida(
    instrutorId: string,
    alunoId: string,
    aulaId: string,
    tipoPermissao: string
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: TipoEventoAuditoria.PERMISSAO_CONCEDIDA,
      severidade: NivelSeveridade.INFO,
      usuario_id: instrutorId,
      usuario_afetado_id: alunoId,
      recurso_tipo: 'permissao',
      recurso_id: aulaId,
      detalhes: {
        tipo_permissao: tipoPermissao,
        aula_id: aulaId
      }
    });
  }

  async registrarPermissaoRemovida(
    instrutorId: string,
    alunoId: string,
    aulaId: string
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: TipoEventoAuditoria.PERMISSAO_REMOVIDA,
      severidade: NivelSeveridade.WARNING,
      usuario_id: instrutorId,
      usuario_afetado_id: alunoId,
      recurso_tipo: 'permissao',
      recurso_id: aulaId,
      detalhes: {
        aula_id: aulaId
      }
    });
  }

  async registrarAlteracaoTipoAcesso(
    instrutorId: string,
    alunoId: string,
    cursoId: string,
    tipoAnterior: string,
    tipoNovo: string
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: TipoEventoAuditoria.TIPO_ACESSO_ALTERADO,
      severidade: NivelSeveridade.INFO,
      usuario_id: instrutorId,
      usuario_afetado_id: alunoId,
      recurso_tipo: 'curso',
      recurso_id: cursoId,
      detalhes: {
        tipo_acesso_anterior: tipoAnterior,
        tipo_acesso_novo: tipoNovo
      }
    });
  }

  // Eventos de Acesso
  async registrarAcessoAula(
    alunoId: string,
    aulaId: string,
    permitido: boolean,
    tipoAcesso?: string,
    motivo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: permitido ? TipoEventoAuditoria.ACESSO_AULA_PERMITIDO : TipoEventoAuditoria.ACESSO_AULA_NEGADO,
      severidade: permitido ? NivelSeveridade.INFO : NivelSeveridade.WARNING,
      usuario_id: alunoId,
      recurso_tipo: 'aula',
      recurso_id: aulaId,
      ip_address: ipAddress,
      user_agent: userAgent,
      detalhes: {
        permitido,
        tipo_acesso: tipoAcesso,
        motivo: motivo
      }
    });
  }

  async registrarAcessoConteudo(
    alunoId: string,
    aulaId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.registrarEvento({
      tipo_evento: TipoEventoAuditoria.CONTEUDO_AULA_ACESSADO,
      severidade: NivelSeveridade.INFO,
      usuario_id: alunoId,
      recurso_tipo: 'aula',
      recurso_id: aulaId,
      ip_address: ipAddress,
      user_agent: userAgent,
      detalhes: {
        timestamp_acesso: new Date().toISOString()
      }
    });
  }

  /**
   * Processa a fila de eventos de forma assíncrona
   */
  private async processarFilaEventos(): Promise<void> {
    if (this.processandoFila || this.filaEventos.length === 0) {
      return;
    }

    this.processandoFila = true;

    try {
      const eventosParaProcessar = [...this.filaEventos];
      this.filaEventos = [];

      // TODO: Implementar salvamento em tabela de auditoria
      // await this.salvarEventosNoBanco(eventosParaProcessar);

      // Por enquanto, salvar em arquivo de log
      await this.salvarEventosEmArquivo(eventosParaProcessar);

    } catch (error) {
      console.error('Erro ao processar fila de auditoria:', error);
      // Recolocar eventos na fila em caso de erro
      this.filaEventos.unshift(...this.filaEventos);
    } finally {
      this.processandoFila = false;
    }
  }

  /**
   * Salva eventos em arquivo de log (implementação temporária)
   */
  private async salvarEventosEmArquivo(eventos: EventoAuditoria[]): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const logDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logDir, `auditoria-${new Date().toISOString().split('T')[0]}.log`);

    try {
      // Criar diretório se não existir
      await fs.mkdir(logDir, { recursive: true });

      // Preparar linhas de log
      const linhasLog = eventos.map(evento => JSON.stringify(evento)).join('\n') + '\n';

      // Anexar ao arquivo
      await fs.appendFile(logFile, linhasLog);

    } catch (error) {
      console.error('Erro ao salvar logs em arquivo:', error);
    }
  }

  /**
   * Salva eventos no banco de dados (implementação futura)
   */
  private async salvarEventosNoBanco(eventos: EventoAuditoria[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('logs_auditoria')
        .insert(eventos);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar eventos de auditoria no banco:', error);
      throw error;
    }
  }

  /**
   * Log no console para desenvolvimento
   */
  private logConsole(evento: EventoAuditoria): void {
    const emoji = this.getEmojiPorTipo(evento.tipo_evento);
    const cor = this.getCorPorSeveridade(evento.severidade);
    
    console.log(
      `${emoji} [AUDITORIA] ${evento.timestamp} - ${evento.tipo_evento}`,
      `\n  Usuário: ${evento.usuario_id || 'N/A'}`,
      `\n  Recurso: ${evento.recurso_tipo}:${evento.recurso_id || 'N/A'}`,
      `\n  Detalhes:`, evento.detalhes
    );
  }

  private getEmojiPorTipo(tipo: TipoEventoAuditoria): string {
    const emojis = {
      [TipoEventoAuditoria.CONVITE_ENVIADO]: '📧',
      [TipoEventoAuditoria.CONVITE_ACEITO]: '✅',
      [TipoEventoAuditoria.CONVITE_EXPIRADO]: '⏰',
      [TipoEventoAuditoria.PERMISSAO_CONCEDIDA]: '🔓',
      [TipoEventoAuditoria.PERMISSAO_REMOVIDA]: '🔒',
      [TipoEventoAuditoria.TIPO_ACESSO_ALTERADO]: '🔄',
      [TipoEventoAuditoria.ACESSO_AULA_PERMITIDO]: '👁️',
      [TipoEventoAuditoria.ACESSO_AULA_NEGADO]: '🚫',
      [TipoEventoAuditoria.CONTEUDO_AULA_ACESSADO]: '📖',
      [TipoEventoAuditoria.USUARIO_PROMOVIDO]: '⬆️',
      [TipoEventoAuditoria.USUARIO_REBAIXADO]: '⬇️',
      [TipoEventoAuditoria.CONFIGURACAO_ALTERADA]: '⚙️'
    };
    return emojis[tipo] || '📝';
  }

  private getCorPorSeveridade(severidade: NivelSeveridade): string {
    const cores = {
      [NivelSeveridade.INFO]: '\x1b[36m',      // Cyan
      [NivelSeveridade.WARNING]: '\x1b[33m',   // Yellow
      [NivelSeveridade.ERROR]: '\x1b[31m',     // Red
      [NivelSeveridade.CRITICAL]: '\x1b[35m'   // Magenta
    };
    return cores[severidade] || '\x1b[0m';
  }

  /**
   * Buscar eventos de auditoria com filtros
   */
  async buscarEventos(filtros: {
    usuario_id?: string;
    tipo_evento?: TipoEventoAuditoria;
    recurso_tipo?: string;
    recurso_id?: string;
    data_inicio?: string;
    data_fim?: string;
    limite?: number;
  }): Promise<EventoAuditoria[]> {
    // TODO: Implementar busca no banco de dados
    // Por enquanto, retornar array vazio
    return [];
  }

  /**
   * Gerar relatório de auditoria
   */
  async gerarRelatorio(
    dataInicio: string,
    dataFim: string,
    filtros?: Record<string, any>
  ): Promise<{
    total_eventos: number;
    eventos_por_tipo: Record<string, number>;
    usuarios_mais_ativos: Array<{ usuario_id: string; total: number }>;
    recursos_mais_acessados: Array<{ recurso_id: string; total: number }>;
  }> {
    // TODO: Implementar geração de relatório
    return {
      total_eventos: 0,
      eventos_por_tipo: {},
      usuarios_mais_ativos: [],
      recursos_mais_acessados: []
    };
  }
}

// Instância singleton
export const sistemaAuditoria = SistemaAuditoria.getInstance();
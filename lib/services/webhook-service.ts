/**
 * Serviço para integração com webhooks n8n
 * Responsável por enviar dados estruturados para o n8n processar emails
 */

interface ConviteCursoCompletoPayload {
  tipo: 'convite_curso_completo';
  destinatario: {
    email: string;
    nome?: string;
  };
  curso: {
    id: string;
    titulo: string;
    instrutor: string;
    instrutor_email?: string;
  };
  convite: {
    token: string;
    link_aceitar: string;
    mensagem_personalizada?: string;
    data_envio: string;
    data_expiracao: string;
  };
}

interface ConviteAulasEspecificasPayload {
  tipo: 'convite_aulas_especificas';
  destinatario: {
    email: string;
    nome?: string;
  };
  curso: {
    id: string;
    titulo: string;
    instrutor: string;
    instrutor_email?: string;
  };
  aulas: Array<{
    id: string;
    titulo: string;
    descricao?: string;
    duracao?: number;
  }>;
  convite: {
    token: string;
    link_aceitar: string;
    mensagem_personalizada?: string;
    data_envio: string;
    data_expiracao: string;
  };
}

export class WebhookService {
  private readonly webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || '';
    
    if (!this.webhookUrl) {
      console.warn('⚠️ N8N_WEBHOOK_URL não configurada. Emails não serão enviados.');
    }
  }

  /**
   * Envia dados para webhook n8n para convite de curso completo
   */
  async enviarConviteCursoCompleto(dados: {
    email: string;
    curso_id: string;
    curso_titulo: string;
    instrutor_nome: string;
    instrutor_email?: string;
    token: string;
    link_aceitar: string;
    mensagem?: string;
  }): Promise<boolean> {
    if (!this.webhookUrl) {
      console.error('❌ Webhook URL não configurada');
      return false;
    }

    const payload: ConviteCursoCompletoPayload = {
      tipo: 'convite_curso_completo',
      destinatario: {
        email: dados.email,
        nome: dados.email.split('@')[0] // Fallback para nome baseado no email
      },
      curso: {
        id: dados.curso_id,
        titulo: dados.curso_titulo,
        instrutor: dados.instrutor_nome,
        instrutor_email: dados.instrutor_email
      },
      convite: {
        token: dados.token,
        link_aceitar: dados.link_aceitar,
        mensagem_personalizada: dados.mensagem,
        data_envio: new Date().toISOString(),
        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      }
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      console.log('✅ Convite de curso completo enviado para n8n:', dados.email);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar webhook para n8n:', error);
      return false;
    }
  }

  /**
   * Envia dados para webhook n8n para convite de aulas específicas
   */
  async enviarConviteAulasEspecificas(dados: {
    email: string;
    curso_id: string;
    curso_titulo: string;
    instrutor_nome: string;
    instrutor_email?: string;
    aulas: Array<{
      id: string;
      titulo: string;
      descricao?: string;
      duracao?: number;
    }>;
    token: string;
    link_aceitar: string;
    mensagem?: string;
  }): Promise<boolean> {
    if (!this.webhookUrl) {
      console.error('❌ Webhook URL não configurada');
      return false;
    }

    const payload: ConviteAulasEspecificasPayload = {
      tipo: 'convite_aulas_especificas',
      destinatario: {
        email: dados.email,
        nome: dados.email.split('@')[0] // Fallback para nome baseado no email
      },
      curso: {
        id: dados.curso_id,
        titulo: dados.curso_titulo,
        instrutor: dados.instrutor_nome,
        instrutor_email: dados.instrutor_email
      },
      aulas: dados.aulas,
      convite: {
        token: dados.token,
        link_aceitar: dados.link_aceitar,
        mensagem_personalizada: dados.mensagem,
        data_envio: new Date().toISOString(),
        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      }
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      console.log('✅ Convite de aulas específicas enviado para n8n:', dados.email);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar webhook para n8n:', error);
      return false;
    }
  }

  /**
   * Testa conectividade com o webhook n8n
   */
  async testarConexao(): Promise<boolean> {
    if (!this.webhookUrl) {
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'teste_conexao',
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao testar conexão com n8n:', error);
      return false;
    }
  }
}

// Instância singleton
export const webhookService = new WebhookService();
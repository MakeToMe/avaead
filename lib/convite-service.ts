import { Pool } from 'pg';
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
 * Serviço para gerenciamento de convites do sistema híbrido
 * Implementa convites para curso completo e aulas específicas
 */
export class ConviteService {
  constructor() {
    // Não precisa mais de inicialização do Supabase
  }

  // Métodos temporários para manter compatibilidade - TODO: Converter para PostgreSQL
  async enviarConviteCursoCompleto(dados: ConviteCursoCompleto): Promise<ConviteResult> {
    return { success: false, error: 'Método temporariamente desabilitado' };
  }

  async enviarConviteAulasEspecificas(dados: ConviteAulasEspecificas): Promise<ConviteResult> {
    return { success: false, error: 'Método temporariamente desabilitado' };
  }

  async aceitarConvite(token: string): Promise<ConviteResult> {
    return { success: false, error: 'Método temporariamente desabilitado' };
  }

  async alterarTipoAcesso(
    cursoId: string, 
    alunoId: string, 
    novoTipo: 'matriculado' | 'convidado_curso',
    instrutorId: string
  ): Promise<ConviteResult> {
    return { success: false, error: 'Método temporariamente desabilitado' };
  }
}

// Instância singleton do serviço
export const conviteService = new ConviteService();
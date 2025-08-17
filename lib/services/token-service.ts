/**
 * Serviço para geração e validação de tokens únicos para convites
 */

import crypto from 'crypto';

export class TokenService {
  /**
   * Gera um token único e seguro para convites
   */
  static gerarToken(): string {
    // Gera 32 bytes aleatórios e converte para hex
    const randomBytes = crypto.randomBytes(32);
    const timestamp = Date.now().toString(36);
    
    // Combina timestamp com bytes aleatórios para garantir unicidade
    return `${timestamp}_${randomBytes.toString('hex')}`;
  }

  /**
   * Valida se um token tem o formato correto
   */
  static validarFormatoToken(token: string): boolean {
    // Formato esperado: timestamp_hexstring
    const regex = /^[a-z0-9]+_[a-f0-9]{64}$/;
    return regex.test(token);
  }

  /**
   * Extrai timestamp de um token (para debug/auditoria)
   */
  static extrairTimestamp(token: string): Date | null {
    try {
      const [timestampHex] = token.split('_');
      const timestamp = parseInt(timestampHex, 36);
      return new Date(timestamp);
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica se um token expirou baseado no timestamp interno
   */
  static tokenExpirou(token: string, diasExpiracao: number = 7): boolean {
    const timestampToken = this.extrairTimestamp(token);
    if (!timestampToken) return true;

    const agora = new Date();
    const dataExpiracao = new Date(timestampToken.getTime() + (diasExpiracao * 24 * 60 * 60 * 1000));
    
    return agora > dataExpiracao;
  }
}

export const tokenService = TokenService;
/**
 * Testes unitários para o middleware de verificação de acesso
 */

const { MiddlewareVerificacaoAcesso } = require('../../lib/middleware/verificacao-acesso');

// Mock do Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          in: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        }))
      }))
    }))
  }))
}));

describe('MiddlewareVerificacaoAcesso', () => {
  let mockSupabase;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock Supabase
    const { createClient } = require('@supabase/supabase-js');
    mockSupabase = createClient();
  });

  describe('verificarAcessoAula', () => {
    test('deve permitir acesso a aula pública para aluno matriculado', async () => {
      // Mock: aula pública
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'aula-1',
          titulo: 'Aula Pública',
          privada: false,
          curso_id: 'curso-1',
          ativo: true
        },
        error: null
      });

      // Mock: matrícula ativa
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'matricula-1',
          tipo_acesso: 'matriculado',
          status: 'ativa'
        },
        error: null
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-1',
        'aluno-1',
        false
      );

      expect(resultado.permitido).toBe(true);
      expect(resultado.tipo_acesso).toBe('aula_publica');
    });

    test('deve permitir acesso a aula privada para convidado do curso', async () => {
      // Mock: aula privada
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'aula-2',
          titulo: 'Aula Privada',
          privada: true,
          curso_id: 'curso-1',
          ativo: true
        },
        error: null
      });

      // Mock: matrícula como convidado do curso
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'matricula-2',
          tipo_acesso: 'convidado_curso',
          status: 'ativa'
        },
        error: null
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-2',
        'aluno-2',
        false
      );

      expect(resultado.permitido).toBe(true);
      expect(resultado.tipo_acesso).toBe('convidado_curso');
    });

    test('deve permitir acesso a aula privada com permissão específica', async () => {
      // Mock: aula privada
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'aula-3',
          titulo: 'Aula Privada Específica',
          privada: true,
          curso_id: 'curso-1',
          ativo: true
        },
        error: null
      });

      // Mock: matrícula básica
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'matricula-3',
          tipo_acesso: 'matriculado',
          status: 'ativa'
        },
        error: null
      });

      // Mock: permissão específica
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'permissao-1',
          tipo_permissao: 'convite_especifico'
        },
        error: null
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-3',
        'aluno-3',
        false
      );

      expect(resultado.permitido).toBe(true);
      expect(resultado.tipo_acesso).toBe('convite_especifico');
    });

    test('deve negar acesso a aula privada sem permissão', async () => {
      // Mock: aula privada
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'aula-4',
          titulo: 'Aula Privada Restrita',
          privada: true,
          curso_id: 'curso-1',
          ativo: true
        },
        error: null
      });

      // Mock: matrícula básica
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'matricula-4',
          tipo_acesso: 'matriculado',
          status: 'ativa'
        },
        error: null
      });

      // Mock: sem permissão específica
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-4',
        'aluno-4',
        false
      );

      expect(resultado.permitido).toBe(false);
      expect(resultado.motivo).toContain('convite específico');
    });

    test('deve negar acesso para aluno não matriculado', async () => {
      // Mock: aula existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'aula-5',
          titulo: 'Qualquer Aula',
          privada: false,
          curso_id: 'curso-1',
          ativo: true
        },
        error: null
      });

      // Mock: sem matrícula
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-5',
        'aluno-nao-matriculado',
        false
      );

      expect(resultado.permitido).toBe(false);
      expect(resultado.motivo).toContain('não está matriculado');
    });

    test('deve negar acesso para aula inexistente', async () => {
      // Mock: aula não encontrada
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-inexistente',
        'aluno-1',
        false
      );

      expect(resultado.permitido).toBe(false);
      expect(resultado.motivo).toContain('não encontrada');
    });

    test('deve negar acesso para aula inativa', async () => {
      // Mock: aula inativa
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'aula-inativa',
          titulo: 'Aula Inativa',
          privada: false,
          curso_id: 'curso-1',
          ativo: false
        },
        error: null
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarAcessoAula(
        'aula-inativa',
        'aluno-1',
        false
      );

      expect(resultado.permitido).toBe(false);
      expect(resultado.motivo).toContain('não está disponível');
    });
  });

  describe('verificarInstrutor', () => {
    test('deve retornar true para instrutor válido', async () => {
      // Mock: curso com instrutor correto
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'curso-1',
          instrutor_id: 'instrutor-1'
        },
        error: null
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarInstrutor(
        'curso-1',
        'instrutor-1'
      );

      expect(resultado).toBe(true);
    });

    test('deve retornar false para instrutor inválido', async () => {
      // Mock: curso não encontrado para este instrutor
      mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      });

      const resultado = await MiddlewareVerificacaoAcesso.verificarInstrutor(
        'curso-1',
        'instrutor-invalido'
      );

      expect(resultado).toBe(false);
    });
  });
});

describe('Funções utilitárias', () => {
  const { verificarAcessoAula, verificarInstrutor } = require('../../lib/middleware/verificacao-acesso');

  test('verificarAcessoAula deve chamar o middleware sem log', async () => {
    const spy = jest.spyOn(MiddlewareVerificacaoAcesso, 'verificarAcessoAula');
    
    await verificarAcessoAula('aula-1', 'aluno-1');
    
    expect(spy).toHaveBeenCalledWith('aula-1', 'aluno-1', false);
  });

  test('verificarInstrutor deve chamar o método do middleware', async () => {
    const spy = jest.spyOn(MiddlewareVerificacaoAcesso, 'verificarInstrutor');
    
    await verificarInstrutor('curso-1', 'instrutor-1');
    
    expect(spy).toHaveBeenCalledWith('curso-1', 'instrutor-1');
  });
});
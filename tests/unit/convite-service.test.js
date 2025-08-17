/**
 * Testes unitários para o ConviteService
 */

const { ConviteService } = require('../../lib/services/convite-service');
const { webhookService } = require('../../lib/services/webhook-service');
const { tokenService } = require('../../lib/services/token-service');

// Mock das dependências
jest.mock('../../lib/services/webhook-service');
jest.mock('../../lib/services/token-service');
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
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn()
        })),
        upsert: jest.fn()
      }))
    }))
  }))
}));

describe('ConviteService', () => {
  let conviteService;
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    
    conviteService = new ConviteService();
    
    const { createClient } = require('@supabase/supabase-js');
    mockSupabase = createClient();

    // Mock padrão do tokenService
    tokenService.gerarToken.mockReturnValue('mock-token-123');
  });

  describe('enviarConviteCursoCompleto', () => {
    const dadosConvite = {
      email: 'aluno@teste.com',
      curso_id: 'curso-123',
      instrutor_id: 'instrutor-123',
      mensagem: 'Bem-vindo!'
    };

    test('deve enviar convite para curso completo com sucesso', async () => {
      // Mock: buscar curso
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { titulo: 'Curso de Teste' },
        error: null
      });

      // Mock: buscar instrutor
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { nome: 'Professor Teste', email: 'professor@teste.com' },
        error: null
      });

      // Mock: salvar convite
      mockSupabase.from().insert().mockResolvedValueOnce({
        error: null
      });

      // Mock: webhook sucesso
      webhookService.enviarConviteCursoCompleto.mockResolvedValueOnce(true);

      const token = await conviteService.enviarConviteCursoCompleto(dadosConvite);

      expect(token).toBe('mock-token-123');
      expect(tokenService.gerarToken).toHaveBeenCalled();
      expect(webhookService.enviarConviteCursoCompleto).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dadosConvite.email,
          curso_titulo: 'Curso de Teste',
          instrutor_nome: 'Professor Teste',
          token: 'mock-token-123'
        })
      );
    });

    test('deve falhar se curso não for encontrado', async () => {
      // Mock: curso não encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Curso não encontrado' }
      });

      await expect(conviteService.enviarConviteCursoCompleto(dadosConvite))
        .rejects.toThrow('Curso ou instrutor não encontrado');
    });

    test('deve continuar mesmo se webhook falhar', async () => {
      // Mock: dados válidos
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: { titulo: 'Curso' }, error: null })
        .mockResolvedValueOnce({ data: { nome: 'Instrutor', email: 'test@test.com' }, error: null });
      
      mockSupabase.from().insert().mockResolvedValueOnce({ error: null });

      // Mock: webhook falha
      webhookService.enviarConviteCursoCompleto.mockResolvedValueOnce(false);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const token = await conviteService.enviarConviteCursoCompleto(dadosConvite);

      expect(token).toBe('mock-token-123');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falha ao enviar webhook')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('enviarConviteAulasEspecificas', () => {
    const dadosConvite = {
      email: 'aluno@teste.com',
      curso_id: 'curso-123',
      aula_ids: ['aula-1', 'aula-2'],
      instrutor_id: 'instrutor-123',
      mensagem: 'Aulas específicas'
    };

    test('deve enviar convite para aulas específicas com sucesso', async () => {
      // Mock: buscar curso
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { titulo: 'Curso de Teste' },
        error: null
      });

      // Mock: buscar instrutor
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { nome: 'Professor Teste', email: 'professor@teste.com' },
        error: null
      });

      // Mock: buscar aulas
      mockSupabase.from().select().in().eq().mockResolvedValueOnce({
        data: [
          { id: 'aula-1', titulo: 'Aula 1', descricao: 'Desc 1', duracao: 1800 },
          { id: 'aula-2', titulo: 'Aula 2', descricao: 'Desc 2', duracao: 2400 }
        ],
        error: null
      });

      // Mock: salvar convite
      mockSupabase.from().insert().mockResolvedValueOnce({ error: null });

      // Mock: webhook sucesso
      webhookService.enviarConviteAulasEspecificas.mockResolvedValueOnce(true);

      const token = await conviteService.enviarConviteAulasEspecificas(dadosConvite);

      expect(token).toBe('mock-token-123');
      expect(webhookService.enviarConviteAulasEspecificas).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dadosConvite.email,
          aulas: expect.arrayContaining([
            expect.objectContaining({ id: 'aula-1', titulo: 'Aula 1' }),
            expect.objectContaining({ id: 'aula-2', titulo: 'Aula 2' })
          ])
        })
      );
    });

    test('deve falhar se nenhuma aula for encontrada', async () => {
      // Mock: curso e instrutor válidos
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({ data: { titulo: 'Curso' }, error: null })
        .mockResolvedValueOnce({ data: { nome: 'Instrutor', email: 'test@test.com' }, error: null });

      // Mock: nenhuma aula encontrada
      mockSupabase.from().select().in().eq().mockResolvedValueOnce({
        data: [],
        error: null
      });

      await expect(conviteService.enviarConviteAulasEspecificas(dadosConvite))
        .rejects.toThrow('Curso, instrutor ou aulas não encontrados');
    });
  });

  describe('aceitarConvite', () => {
    const tokenValido = 'token-valido-123';

    test('deve aceitar convite válido com sucesso', async () => {
      // Mock: token válido
      tokenService.validarFormatoToken.mockReturnValue(true);

      // Mock: convite encontrado
      const conviteMock = {
        id: 'convite-1',
        email: 'aluno@teste.com',
        curso_id: 'curso-123',
        tipo_convite: 'curso_completo',
        enviado_por: 'instrutor-123',
        aceito: false,
        expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: conviteMock,
        error: null
      });

      // Mock: usuário não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      });

      // Mock: criar usuário
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: 'novo-usuario-id' },
        error: null
      });

      // Mock: processar convite (será implementado nos métodos privados)
      const processarSpy = jest.spyOn(conviteService, 'processarConviteCursoCompleto')
        .mockResolvedValueOnce();

      // Mock: marcar como aceito
      mockSupabase.from().update().eq().mockResolvedValueOnce({ error: null });

      const resultado = await conviteService.aceitarConvite(tokenValido);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.curso_id).toBe('curso-123');
      expect(processarSpy).toHaveBeenCalled();
    });

    test('deve falhar para token inválido', async () => {
      tokenService.validarFormatoToken.mockReturnValue(false);

      const resultado = await conviteService.aceitarConvite('token-invalido');

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Token inválido');
    });

    test('deve falhar para convite já aceito', async () => {
      tokenService.validarFormatoToken.mockReturnValue(true);

      const conviteAceito = {
        aceito: true,
        expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: conviteAceito,
        error: null
      });

      const resultado = await conviteService.aceitarConvite(tokenValido);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Convite já foi aceito anteriormente');
    });

    test('deve falhar para convite expirado', async () => {
      tokenService.validarFormatoToken.mockReturnValue(true);

      const conviteExpirado = {
        aceito: false,
        expira_em: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 dia atrás
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: conviteExpirado,
        error: null
      });

      const resultado = await conviteService.aceitarConvite(tokenValido);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBe('Convite expirado');
    });
  });

  describe('listarConvitesPendentes', () => {
    test('deve listar convites pendentes do instrutor', async () => {
      const convitesMock = [
        {
          id: 'convite-1',
          email: 'aluno1@teste.com',
          tipo_convite: 'curso_completo',
          criado_em: new Date().toISOString(),
          cursos: { titulo: 'Curso 1' }
        },
        {
          id: 'convite-2',
          email: 'aluno2@teste.com',
          tipo_convite: 'aulas_especificas',
          criado_em: new Date().toISOString(),
          cursos: { titulo: 'Curso 2' }
        }
      ];

      mockSupabase.from().select().eq().eq().gte().order().mockResolvedValueOnce({
        data: convitesMock,
        error: null
      });

      const resultado = await conviteService.listarConvitesPendentes('instrutor-123');

      expect(resultado).toHaveLength(2);
      expect(resultado[0].email).toBe('aluno1@teste.com');
      expect(resultado[1].tipo_convite).toBe('aulas_especificas');
    });

    test('deve retornar array vazio se não houver convites', async () => {
      mockSupabase.from().select().eq().eq().gte().order().mockResolvedValueOnce({
        data: [],
        error: null
      });

      const resultado = await conviteService.listarConvitesPendentes('instrutor-sem-convites');

      expect(resultado).toEqual([]);
    });
  });
});
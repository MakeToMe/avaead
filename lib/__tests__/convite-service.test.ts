import { ConviteService } from '../convite-service';
import type { ConviteCursoCompleto, ConviteAulasEspecificas, ConvitePendente, Usuario } from '../types/aulas-privadas';

// Mock do Supabase
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

// Mock do createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock do crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-token-123')
  }))
}));

describe('ConviteService', () => {
  let service: ConviteService;

  beforeEach(() => {
    service = new ConviteService();
    jest.clearAllMocks();
  });

  describe('enviarConviteCursoCompleto', () => {
    const dadosConvite: ConviteCursoCompleto = {
      email: 'aluno@teste.com',
      curso_id: 'curso-123',
      instrutor_id: 'instrutor-456',
      mensagem: 'Bem-vindo ao curso!'
    };

    it('deve enviar convite com sucesso para instrutor válido', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'instrutor-456' }, error: null }) // verificarInstrutor
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // getConvitePendente (não existe)
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getUserByEmail (não existe)

      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      // Act
      const result = await service.enviarConviteCursoCompleto(dadosConvite);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token-123');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        email: dadosConvite.email,
        curso_id: dadosConvite.curso_id,
        tipo_convite: 'curso_completo',
        enviado_por: dadosConvite.instrutor_id,
        mensagem: dadosConvite.mensagem,
        token: 'mock-token-123',
        aceito: false
      });
    });

    it('deve rejeitar convite quando usuário não é instrutor', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'outro-instrutor' }, error: null }); // verificarInstrutor

      // Act
      const result = await service.enviarConviteCursoCompleto(dadosConvite);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário não é instrutor deste curso');
    });

    it('deve rejeitar quando já existe convite pendente', async () => {
      // Arrange
      const conviteExistente: ConvitePendente = {
        id: 'convite-1',
        email: dadosConvite.email,
        curso_id: dadosConvite.curso_id,
        tipo_convite: 'curso_completo',
        enviado_por: dadosConvite.instrutor_id,
        token: 'token-existente',
        aceito: false,
        criado_em: new Date(),
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'instrutor-456' }, error: null }) // verificarInstrutor
        .mockResolvedValueOnce({ data: conviteExistente, error: null }); // getConvitePendente

      // Act
      const result = await service.enviarConviteCursoCompleto(dadosConvite);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Já existe um convite pendente para este email neste curso');
    });

    it('deve rejeitar quando usuário já está matriculado', async () => {
      // Arrange
      const usuario: Usuario = {
        uid: 'usuario-123',
        perfis: 'aluno',
        nome: 'Aluno Teste',
        email: dadosConvite.email,
        criado_em: new Date()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'instrutor-456' }, error: null }) // verificarInstrutor
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // getConvitePendente (não existe)
        .mockResolvedValueOnce({ data: usuario, error: null }) // getUserByEmail
        .mockResolvedValueOnce({ data: { id: 'matricula-1' }, error: null }); // verificarMatricula

      // Act
      const result = await service.enviarConviteCursoCompleto(dadosConvite);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário já está matriculado neste curso');
    });
  });

  describe('enviarConviteAulasEspecificas', () => {
    const dadosConvite: ConviteAulasEspecificas = {
      email: 'aluno@teste.com',
      curso_id: 'curso-123',
      aula_ids: ['aula-1', 'aula-2'],
      instrutor_id: 'instrutor-456',
      mensagem: 'Convite para aulas específicas'
    };

    it('deve enviar convite com sucesso para aulas válidas', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'instrutor-456' }, error: null }) // verificarInstrutor
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getConvitePendente

      mockSupabase.select.mockResolvedValueOnce({ 
        data: [{ id: 'aula-1' }, { id: 'aula-2' }], 
        error: null 
      }); // validarAulasDoCurso

      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      // Act
      const result = await service.enviarConviteAulasEspecificas(dadosConvite);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token-123');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        email: dadosConvite.email,
        curso_id: dadosConvite.curso_id,
        tipo_convite: 'aulas_especificas',
        aula_ids: dadosConvite.aula_ids,
        enviado_por: dadosConvite.instrutor_id,
        mensagem: dadosConvite.mensagem,
        token: 'mock-token-123',
        aceito: false
      });
    });

    it('deve rejeitar quando aulas não pertencem ao curso', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'instrutor-456' }, error: null }); // verificarInstrutor

      mockSupabase.select.mockResolvedValueOnce({ 
        data: [{ id: 'aula-1' }], // Só retorna 1 aula, mas foram solicitadas 2
        error: null 
      }); // validarAulasDoCurso

      // Act
      const result = await service.enviarConviteAulasEspecificas(dadosConvite);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Uma ou mais aulas não pertencem a este curso');
    });
  });

  describe('aceitarConvite', () => {
    const token = 'token-valido-123';

    it('deve aceitar convite de curso completo com sucesso', async () => {
      // Arrange
      const convite: ConvitePendente = {
        id: 'convite-1',
        email: 'aluno@teste.com',
        curso_id: 'curso-123',
        tipo_convite: 'curso_completo',
        enviado_por: 'instrutor-456',
        token: token,
        aceito: false,
        criado_em: new Date(),
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias no futuro
      };

      const usuario: Usuario = {
        uid: 'usuario-123',
        perfis: 'aluno',
        nome: 'Aluno Teste',
        email: 'aluno@teste.com',
        criado_em: new Date()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: convite, error: null }) // getConviteByToken
        .mockResolvedValueOnce({ data: usuario, error: null }); // getUserByEmail

      mockSupabase.insert.mockResolvedValueOnce({ error: null }); // processarConviteCursoCompleto
      mockSupabase.update.mockResolvedValueOnce({ error: null }); // marcarConviteAceito

      // Act
      const result = await service.aceitarConvite(token);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBe(token);
    });

    it('deve rejeitar convite já aceito', async () => {
      // Arrange
      const conviteAceito: ConvitePendente = {
        id: 'convite-1',
        email: 'aluno@teste.com',
        curso_id: 'curso-123',
        tipo_convite: 'curso_completo',
        enviado_por: 'instrutor-456',
        token: token,
        aceito: true, // Já aceito
        criado_em: new Date(),
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: conviteAceito, error: null }); // getConviteByToken

      // Act
      const result = await service.aceitarConvite(token);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Convite já foi aceito');
    });

    it('deve rejeitar convite expirado', async () => {
      // Arrange
      const conviteExpirado: ConvitePendente = {
        id: 'convite-1',
        email: 'aluno@teste.com',
        curso_id: 'curso-123',
        tipo_convite: 'curso_completo',
        enviado_por: 'instrutor-456',
        token: token,
        aceito: false,
        criado_em: new Date(),
        expira_em: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 dia no passado
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: conviteExpirado, error: null }); // getConviteByToken

      // Act
      const result = await service.aceitarConvite(token);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Convite expirado');
    });

    it('deve rejeitar token inválido', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getConviteByToken

      // Act
      const result = await service.aceitarConvite('token-invalido');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Convite não encontrado');
    });
  });

  describe('alterarTipoAcesso', () => {
    const cursoId = 'curso-123';
    const alunoId = 'aluno-456';
    const instrutorId = 'instrutor-789';

    it('deve alterar tipo de acesso com sucesso', async () => {
      // Arrange
      const matricula = {
        id: 'matricula-1',
        aluno_id: alunoId,
        curso_id: cursoId,
        tipo_acesso: 'matriculado'
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: instrutorId }, error: null }) // verificarInstrutor
        .mockResolvedValueOnce({ data: matricula, error: null }); // getMatricula

      mockSupabase.update.mockResolvedValueOnce({ error: null });

      // Act
      const result = await service.alterarTipoAcesso(cursoId, alunoId, 'convidado_curso', instrutorId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        tipo_acesso: 'convidado_curso',
        adicionado_por: instrutorId,
        atualizado_em: expect.any(String)
      });
    });

    it('deve rejeitar quando usuário não é instrutor', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: 'outro-instrutor' }, error: null }); // verificarInstrutor

      // Act
      const result = await service.alterarTipoAcesso(cursoId, alunoId, 'convidado_curso', instrutorId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário não é instrutor deste curso');
    });

    it('deve rejeitar quando aluno não está matriculado', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: { instrutor_id: instrutorId }, error: null }) // verificarInstrutor
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getMatricula

      // Act
      const result = await service.alterarTipoAcesso(cursoId, alunoId, 'convidado_curso', instrutorId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Aluno não está matriculado neste curso');
    });
  });
});
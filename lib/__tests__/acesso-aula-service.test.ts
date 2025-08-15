import { AcessoAulaService } from '../acesso-aula-service';
import type { Aula, Matricula, AulaPermissao } from '../types/aulas-privadas';

// Mock do Supabase
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
  order: jest.fn(() => mockSupabase),
};

// Mock do createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('AcessoAulaService', () => {
  let service: AcessoAulaService;

  beforeEach(() => {
    service = new AcessoAulaService();
    jest.clearAllMocks();
  });

  describe('podeAssistirAula', () => {
    const aulaId = 'aula-123';
    const alunoId = 'aluno-456';
    const cursoId = 'curso-789';

    it('deve permitir acesso a aula pública para aluno matriculado', async () => {
      // Arrange
      const aulaPublica: Aula = {
        id: aulaId,
        curso_id: cursoId,
        modulo_id: 'modulo-1',
        titulo: 'Aula Pública',
        privada: false,
        ativo: true
      };

      const matricula: Matricula = {
        id: 'matricula-1',
        aluno_id: alunoId,
        curso_id: cursoId,
        data_matricula: new Date(),
        status: 'ativa',
        tipo_acesso: 'matriculado',
        progresso_percentual: 0,
        criado_em: new Date(),
        atualizado_em: new Date()
      };

      // Mock das chamadas do Supabase
      mockSupabase.single
        .mockResolvedValueOnce({ data: aulaPublica, error: null }) // getAula
        .mockResolvedValueOnce({ data: matricula, error: null }); // getMatricula

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(true);
      expect(result.tipo_acesso).toBe('aula_publica');
      expect(result.motivo).toBeUndefined();
    });

    it('deve permitir acesso a aula privada para convidado do curso', async () => {
      // Arrange
      const aulaPrivada: Aula = {
        id: aulaId,
        curso_id: cursoId,
        modulo_id: 'modulo-1',
        titulo: 'Aula Privada',
        privada: true,
        ativo: true
      };

      const matriculaConvidado: Matricula = {
        id: 'matricula-1',
        aluno_id: alunoId,
        curso_id: cursoId,
        data_matricula: new Date(),
        status: 'ativa',
        tipo_acesso: 'convidado_curso',
        progresso_percentual: 0,
        criado_em: new Date(),
        atualizado_em: new Date()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: aulaPrivada, error: null }) // getAula
        .mockResolvedValueOnce({ data: matriculaConvidado, error: null }); // getMatricula

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(true);
      expect(result.tipo_acesso).toBe('convidado_curso');
      expect(result.motivo).toBe('Acesso total ao curso');
    });

    it('deve permitir acesso a aula privada com convite específico', async () => {
      // Arrange
      const aulaPrivada: Aula = {
        id: aulaId,
        curso_id: cursoId,
        modulo_id: 'modulo-1',
        titulo: 'Aula Privada',
        privada: true,
        ativo: true
      };

      const matriculaRegular: Matricula = {
        id: 'matricula-1',
        aluno_id: alunoId,
        curso_id: cursoId,
        data_matricula: new Date(),
        status: 'ativa',
        tipo_acesso: 'matriculado',
        progresso_percentual: 0,
        criado_em: new Date(),
        atualizado_em: new Date()
      };

      const permissaoEspecifica: AulaPermissao = {
        id: 'permissao-1',
        aula_id: aulaId,
        aluno_id: alunoId,
        concedida_por: 'instrutor-1',
        tipo_permissao: 'convite_especifico',
        criado_em: new Date()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: aulaPrivada, error: null }) // getAula
        .mockResolvedValueOnce({ data: matriculaRegular, error: null }) // getMatricula
        .mockResolvedValueOnce({ data: permissaoEspecifica, error: null }); // getAulaPermissao

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(true);
      expect(result.tipo_acesso).toBe('convite_especifico');
      expect(result.motivo).toBe('Convite específico para esta aula');
    });

    it('deve bloquear acesso a aula privada para aluno matriculado sem permissão específica', async () => {
      // Arrange
      const aulaPrivada: Aula = {
        id: aulaId,
        curso_id: cursoId,
        modulo_id: 'modulo-1',
        titulo: 'Aula Privada',
        privada: true,
        ativo: true
      };

      const matriculaRegular: Matricula = {
        id: 'matricula-1',
        aluno_id: alunoId,
        curso_id: cursoId,
        data_matricula: new Date(),
        status: 'ativa',
        tipo_acesso: 'matriculado',
        progresso_percentual: 0,
        criado_em: new Date(),
        atualizado_em: new Date()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: aulaPrivada, error: null }) // getAula
        .mockResolvedValueOnce({ data: matriculaRegular, error: null }) // getMatricula
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getAulaPermissao (não encontrada)

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(false);
      expect(result.motivo).toBe('Esta aula requer convite específico do instrutor');
    });

    it('deve bloquear acesso quando aula não existe', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getAula (não encontrada)

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(false);
      expect(result.motivo).toBe('Aula não encontrada');
    });

    it('deve bloquear acesso quando aluno não está matriculado', async () => {
      // Arrange
      const aulaPublica: Aula = {
        id: aulaId,
        curso_id: cursoId,
        modulo_id: 'modulo-1',
        titulo: 'Aula Pública',
        privada: false,
        ativo: true
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: aulaPublica, error: null }) // getAula
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // getMatricula (não encontrada)

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(false);
      expect(result.motivo).toBe('Não matriculado no curso');
    });

    it('deve retornar erro quando há falha na consulta', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } }); // getAula com erro

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(false);
      expect(result.motivo).toBe('Erro interno ao verificar permissões');
    });
  });

  describe('isInstrutor', () => {
    it('deve retornar true quando usuário é instrutor do curso', async () => {
      // Arrange
      const cursoId = 'curso-123';
      const instrutorId = 'instrutor-456';

      mockSupabase.single
        .mockResolvedValueOnce({ 
          data: { instrutor_id: instrutorId }, 
          error: null 
        });

      // Act
      const result = await service.isInstrutor(cursoId, instrutorId);

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false quando usuário não é instrutor do curso', async () => {
      // Arrange
      const cursoId = 'curso-123';
      const usuarioId = 'usuario-456';
      const instrutorId = 'instrutor-789';

      mockSupabase.single
        .mockResolvedValueOnce({ 
          data: { instrutor_id: instrutorId }, 
          error: null 
        });

      // Act
      const result = await service.isInstrutor(cursoId, usuarioId);

      // Assert
      expect(result).toBe(false);
    });

    it('deve retornar false quando curso não existe', async () => {
      // Arrange
      const cursoId = 'curso-inexistente';
      const usuarioId = 'usuario-456';

      mockSupabase.single
        .mockResolvedValueOnce({ 
          data: null, 
          error: { code: 'PGRST116' } 
        });

      // Act
      const result = await service.isInstrutor(cursoId, usuarioId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getTipoAcesso', () => {
    it('deve retornar tipo de acesso do aluno matriculado', async () => {
      // Arrange
      const cursoId = 'curso-123';
      const alunoId = 'aluno-456';

      const matricula: Matricula = {
        id: 'matricula-1',
        aluno_id: alunoId,
        curso_id: cursoId,
        data_matricula: new Date(),
        status: 'ativa',
        tipo_acesso: 'convidado_curso',
        progresso_percentual: 50,
        criado_em: new Date(),
        atualizado_em: new Date()
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: matricula, error: null });

      // Act
      const result = await service.getTipoAcesso(cursoId, alunoId);

      // Assert
      expect(result).toBe('convidado_curso');
    });

    it('deve retornar null quando aluno não está matriculado', async () => {
      // Arrange
      const cursoId = 'curso-123';
      const alunoId = 'aluno-456';

      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Act
      const result = await service.getTipoAcesso(cursoId, alunoId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
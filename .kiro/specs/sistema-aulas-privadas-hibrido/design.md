# Design Document

## Overview

Este documento descreve o design técnico para implementar um sistema híbrido de aulas privadas que permite aos instrutores convidar alunos de duas formas distintas: convite para curso completo (acesso a todas as aulas) ou convite para aulas específicas (controle granular). O sistema será integrado à arquitetura existente do banco de dados PostgreSQL no schema `rarcursos`.

## Architecture

### Arquitetura Atual Identificada

Baseado na análise do banco de dados, a estrutura atual possui:

- **Schema**: `rarcursos` (PostgreSQL 15.6)
- **Tabelas principais**: `users`, `cursos`, `aulas`, `matriculas`, `modulos`
- **Tabela de matrículas**: `matriculas` (equivalente à `curso_alunos` do projeto original)
- **Coluna privada**: Já existe na tabela `aulas` (boolean)

### Arquitetura Proposta

O sistema híbrido será implementado através de:

1. **Extensão da tabela `matriculas`** - Adicionar coluna `tipo_acesso`
2. **Nova tabela `aula_permissoes`** - Controle granular de acessos
3. **Nova tabela `convites_pendentes`** - Gerenciamento de convites por email
4. **APIs RESTful** - Endpoints para gerenciamento de convites e permissões
5. **Sistema de emails** - Templates para diferentes tipos de convite

## Components and Interfaces

### 1. Database Layer

#### 1.1 Extensão da Tabela `matriculas`

```sql
-- Adicionar coluna tipo_acesso à tabela existente
ALTER TABLE rarcursos.matriculas 
ADD COLUMN tipo_acesso VARCHAR DEFAULT 'matriculado' 
CHECK (tipo_acesso IN ('matriculado', 'convidado_curso'));

-- Adicionar coluna para rastrear quem adicionou o aluno
ALTER TABLE rarcursos.matriculas 
ADD COLUMN adicionado_por UUID REFERENCES rarcursos.users(id);

-- Criar índice para performance
CREATE INDEX idx_matriculas_tipo_acesso ON rarcursos.matriculas(tipo_acesso);
```

#### 1.2 Nova Tabela `aula_permissoes`

```sql
CREATE TABLE rarcursos.aula_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES rarcursos.aulas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES rarcursos.users(id) ON DELETE CASCADE,
  concedida_por UUID NOT NULL REFERENCES rarcursos.users(id),
  tipo_permissao VARCHAR NOT NULL CHECK (tipo_permissao IN ('convite_especifico', 'acesso_curso')),
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aula_id, aluno_id)
);

-- Índices para performance
CREATE INDEX idx_aula_permissoes_aula_id ON rarcursos.aula_permissoes(aula_id);
CREATE INDEX idx_aula_permissoes_aluno_id ON rarcursos.aula_permissoes(aluno_id);
CREATE INDEX idx_aula_permissoes_tipo ON rarcursos.aula_permissoes(tipo_permissao);
```

#### 1.3 Nova Tabela `convites_pendentes`

```sql
CREATE TABLE rarcursos.convites_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  curso_id UUID NOT NULL REFERENCES rarcursos.cursos(id) ON DELETE CASCADE,
  tipo_convite VARCHAR NOT NULL CHECK (tipo_convite IN ('curso_completo', 'aulas_especificas')),
  aula_ids UUID[], -- Array de IDs para convites específicos
  enviado_por UUID NOT NULL REFERENCES rarcursos.users(id),
  mensagem TEXT,
  token VARCHAR UNIQUE NOT NULL,
  aceito BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT NOW(),
  expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

-- Índices
CREATE INDEX idx_convites_token ON rarcursos.convites_pendentes(token);
CREATE INDEX idx_convites_email ON rarcursos.convites_pendentes(email);
CREATE INDEX idx_convites_curso ON rarcursos.convites_pendentes(curso_id);
```

### 2. Business Logic Layer

#### 2.1 Serviço de Verificação de Acesso

```typescript
interface AcessoAulaResult {
  pode_assistir: boolean;
  motivo?: string;
  tipo_acesso?: 'aula_publica' | 'convidado_curso' | 'convite_especifico';
}

class AcessoAulaService {
  async podeAssistirAula(aulaId: string, alunoId: string): Promise<AcessoAulaResult> {
    // 1. Buscar dados da aula
    const aula = await this.getAula(aulaId);
    if (!aula) {
      return { pode_assistir: false, motivo: "Aula não encontrada" };
    }

    // 2. Verificar se está matriculado no curso
    const matricula = await this.getMatricula(aula.curso_id, alunoId);
    if (!matricula) {
      return { pode_assistir: false, motivo: "Não matriculado no curso" };
    }

    // 3. Se aula é pública, pode assistir
    if (!aula.privada) {
      return { pode_assistir: true, tipo_acesso: "aula_publica" };
    }

    // 4. Se aula é privada, verificar tipo de acesso
    if (matricula.tipo_acesso === 'convidado_curso') {
      return { 
        pode_assistir: true, 
        tipo_acesso: "convidado_curso",
        motivo: "Acesso total ao curso"
      };
    }

    // 5. Verificar permissão específica para esta aula
    const permissaoEspecifica = await this.getAulaPermissao(aulaId, alunoId);
    if (permissaoEspecifica) {
      return { 
        pode_assistir: true, 
        tipo_acesso: "convite_especifico",
        motivo: "Convite específico para esta aula"
      };
    }

    // 6. Sem permissão
    return { 
      pode_assistir: false, 
      motivo: "Esta aula requer convite específico do instrutor" 
    };
  }
}
```

#### 2.2 Serviço de Gerenciamento de Convites

```typescript
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

class ConviteService {
  async enviarConviteCursoCompleto(dados: ConviteCursoCompleto): Promise<string> {
    // 1. Gerar token único
    const token = this.generateToken();
    
    // 2. Salvar convite pendente
    await this.salvarConvitePendente({
      ...dados,
      tipo_convite: 'curso_completo',
      token
    });
    
    // 3. Enviar dados para webhook n8n
    await this.webhookService.enviarConviteCursoCompleto({
      ...dados,
      token,
      link_aceitar: `${process.env.URL_BASE}/convites/aceitar/${token}`
    });
    
    return token;
  }

  async enviarConviteAulasEspecificas(dados: ConviteAulasEspecificas): Promise<string> {
    // 1. Gerar token único
    const token = this.generateToken();
    
    // 2. Salvar convite pendente
    await this.salvarConvitePendente({
      ...dados,
      tipo_convite: 'aulas_especificas',
      token
    });
    
    // 3. Buscar detalhes das aulas
    const aulas = await this.getAulasDetalhes(dados.aula_ids);
    
    // 4. Enviar dados para webhook n8n
    await this.webhookService.enviarConviteAulasEspecificas({
      ...dados,
      aulas,
      token,
      link_aceitar: `${process.env.URL_BASE}/convites/aceitar/${token}`
    });
    
    return token;
  }

  async aceitarConvite(token: string): Promise<boolean> {
    // 1. Buscar convite pendente
    const convite = await this.getConvitePendente(token);
    if (!convite || convite.aceito || convite.expira_em < new Date()) {
      return false;
    }

    // 2. Verificar se usuário já existe
    let usuario = await this.getUserByEmail(convite.email);
    if (!usuario) {
      // Criar usuário se não existir
      usuario = await this.criarUsuarioConvidado(convite.email);
    }

    // 3. Processar convite baseado no tipo
    if (convite.tipo_convite === 'curso_completo') {
      await this.processarConviteCursoCompleto(convite, usuario.id);
    } else {
      await this.processarConviteAulasEspecificas(convite, usuario.id);
    }

    // 4. Marcar convite como aceito
    await this.marcarConviteAceito(token);

    return true;
  }
}
```

### 3. API Layer

#### 3.1 Endpoints de Gerenciamento de Convites

```typescript
// POST /api/cursos/[id]/convites/curso-completo
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { email, mensagem, instrutor_id } = await request.json();
  
  // Validar se usuário é instrutor do curso
  const isInstrutor = await verificarInstrutor(params.id, instrutor_id);
  if (!isInstrutor) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const token = await conviteService.enviarConviteCursoCompleto({
    email,
    curso_id: params.id,
    instrutor_id,
    mensagem
  });

  return NextResponse.json({ success: true, token });
}

// POST /api/cursos/[id]/convites/aulas-especificas
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { email, aula_ids, mensagem, instrutor_id } = await request.json();
  
  // Validar se usuário é instrutor do curso
  const isInstrutor = await verificarInstrutor(params.id, instrutor_id);
  if (!isInstrutor) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const token = await conviteService.enviarConviteAulasEspecificas({
    email,
    curso_id: params.id,
    aula_ids,
    instrutor_id,
    mensagem
  });

  return NextResponse.json({ success: true, token });
}
```

#### 3.2 Endpoints de Verificação de Acesso

```typescript
// GET /api/cursos/[id]/aulas/acesso?aluno_id=uuid
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const alunoId = searchParams.get('aluno_id');

  if (!alunoId) {
    return NextResponse.json({ error: 'aluno_id é obrigatório' }, { status: 400 });
  }

  const aulas = await getAulasCurso(params.id);
  const aulasComAcesso = await Promise.all(
    aulas.map(async (aula) => {
      const acesso = await acessoAulaService.podeAssistirAula(aula.id, alunoId);
      return {
        ...aula,
        ...acesso
      };
    })
  );

  return NextResponse.json({ aulas: aulasComAcesso });
}
```

### 4. Frontend Components

#### 4.1 Dashboard do Instrutor

```tsx
// components/dashboard-instrutor/GerenciarAlunos.tsx
interface AlunoMatricula {
  id: string;
  nome: string;
  email: string;
  tipo_acesso: 'matriculado' | 'convidado_curso';
  data_matricula: string;
}

export function GerenciarAlunos({ cursoId }: { cursoId: string }) {
  const [alunos, setAlunos] = useState<AlunoMatricula[]>([]);
  
  const promoverParaConvidado = async (alunoId: string) => {
    await fetch(`/api/cursos/${cursoId}/alunos/${alunoId}/tipo-acesso`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_acesso: 'convidado_curso' })
    });
    
    // Atualizar lista
    await carregarAlunos();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">🎓 Matriculados ({matriculados.length})</h3>
        {matriculados.map(aluno => (
          <div key={aluno.id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="font-medium">{aluno.nome}</p>
              <p className="text-sm text-gray-600">{aluno.email}</p>
            </div>
            <button 
              onClick={() => promoverParaConvidado(aluno.id)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Promover para Convidado
            </button>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">⭐ Convidados do Curso ({convidados.length})</h3>
        {convidados.map(aluno => (
          <div key={aluno.id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="font-medium">{aluno.nome}</p>
              <p className="text-sm text-gray-600">{aluno.email}</p>
              <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                Acesso Total
              </span>
            </div>
            <button 
              onClick={() => rebaixarParaMatriculado(aluno.id)}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Rebaixar para Matriculado
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4.2 Interface do Aluno

```tsx
// components/curso/ListaAulas.tsx
interface AulaComAcesso {
  id: string;
  titulo: string;
  privada: boolean;
  pode_assistir: boolean;
  tipo_acesso?: string;
  motivo?: string;
}

export function ListaAulas({ cursoId, alunoId }: { cursoId: string; alunoId: string }) {
  const [aulas, setAulas] = useState<AulaComAcesso[]>([]);
  const [tipoAcesso, setTipoAcesso] = useState<string>('');

  useEffect(() => {
    fetch(`/api/cursos/${cursoId}/aulas/acesso?aluno_id=${alunoId}`)
      .then(res => res.json())
      .then(data => {
        setAulas(data.aulas);
        // Determinar tipo de acesso geral
        const temConvidadoCurso = data.aulas.some(a => a.tipo_acesso === 'convidado_curso');
        if (temConvidadoCurso) {
          setTipoAcesso('Convidado do Curso (Acesso Total)');
        } else {
          setTipoAcesso('Matriculado');
        }
      });
  }, [cursoId, alunoId]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Seu acesso:</strong> {tipoAcesso}
        </p>
      </div>

      {aulas.map(aula => (
        <div key={aula.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {aula.pode_assistir ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-red-500" />
              )}
              <div>
                <h3 className="font-medium">{aula.titulo}</h3>
                {aula.privada && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      Privada
                    </span>
                    {aula.pode_assistir && aula.tipo_acesso && (
                      <span className="text-xs text-gray-600">
                        {aula.tipo_acesso === 'convidado_curso' ? 'Acesso total' : 'Convite específico'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {aula.pode_assistir ? (
              <button className="px-4 py-2 bg-blue-500 text-white rounded">
                Assistir
              </button>
            ) : (
              <div className="text-right">
                <p className="text-sm text-red-600">{aula.motivo}</p>
                <button className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed">
                  Bloqueado
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Data Models

### 1. Tipos TypeScript

```typescript
// types/convites.ts
export interface Matricula {
  id: string;
  aluno_id: string;
  curso_id: string;
  data_matricula: Date;
  status: 'ativa' | 'inativa' | 'concluida';
  tipo_acesso: 'matriculado' | 'convidado_curso';
  adicionado_por?: string;
  progresso_percentual: number;
  data_conclusao?: Date;
  criado_em: Date;
  atualizado_em: Date;
}

export interface AulaPermissao {
  id: string;
  aula_id: string;
  aluno_id: string;
  concedida_por: string;
  tipo_permissao: 'convite_especifico' | 'acesso_curso';
  criado_em: Date;
}

export interface ConvitePendente {
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

export interface Aula {
  id: string;
  curso_id: string;
  modulo_id: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  conteudo?: string;
  media_url?: string;
  duracao?: number;
  ativo?: boolean;
  privada?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}
```

### 2. Schemas de Validação

```typescript
// schemas/convites.ts
import { z } from 'zod';

export const ConviteCursoCompletoSchema = z.object({
  email: z.string().email('Email inválido'),
  curso_id: z.string().uuid('ID do curso inválido'),
  instrutor_id: z.string().uuid('ID do instrutor inválido'),
  mensagem: z.string().optional()
});

export const ConviteAulasEspecificasSchema = z.object({
  email: z.string().email('Email inválido'),
  curso_id: z.string().uuid('ID do curso inválido'),
  aula_ids: z.array(z.string().uuid()).min(1, 'Selecione pelo menos uma aula'),
  instrutor_id: z.string().uuid('ID do instrutor inválido'),
  mensagem: z.string().optional()
});

export const AlterarTipoAcessoSchema = z.object({
  tipo_acesso: z.enum(['matriculado', 'convidado_curso'])
});
```

## Error Handling

### 1. Códigos de Erro Padronizados

```typescript
export enum CodigosErro {
  // Convites
  CONVITE_NAO_ENCONTRADO = 'CONVITE_NAO_ENCONTRADO',
  CONVITE_EXPIRADO = 'CONVITE_EXPIRADO',
  CONVITE_JA_ACEITO = 'CONVITE_JA_ACEITO',
  
  // Permissões
  NAO_AUTORIZADO = 'NAO_AUTORIZADO',
  NAO_E_INSTRUTOR = 'NAO_E_INSTRUTOR',
  ALUNO_NAO_MATRICULADO = 'ALUNO_NAO_MATRICULADO',
  
  // Aulas
  AULA_NAO_ENCONTRADA = 'AULA_NAO_ENCONTRADA',
  AULA_PRIVADA_SEM_PERMISSAO = 'AULA_PRIVADA_SEM_PERMISSAO',
  
  // Validação
  DADOS_INVALIDOS = 'DADOS_INVALIDOS',
  EMAIL_INVALIDO = 'EMAIL_INVALIDO'
}

export class ConviteError extends Error {
  constructor(
    public codigo: CodigosErro,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ConviteError';
  }
}
```

### 2. Middleware de Tratamento de Erros

```typescript
// middleware/error-handler.ts
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ConviteError) {
    return NextResponse.json(
      { 
        error: error.message, 
        codigo: error.codigo 
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { 
        error: 'Dados inválidos', 
        codigo: CodigosErro.DADOS_INVALIDOS,
        detalhes: error.errors 
      },
      { status: 400 }
    );
  }

  console.error('Erro não tratado:', error);
  return NextResponse.json(
    { 
      error: 'Erro interno do servidor',
      codigo: 'ERRO_INTERNO'
    },
    { status: 500 }
  );
}
```

## Testing Strategy

### 1. Testes Unitários

```typescript
// tests/services/acesso-aula.test.ts
describe('AcessoAulaService', () => {
  let service: AcessoAulaService;

  beforeEach(() => {
    service = new AcessoAulaService();
  });

  describe('podeAssistirAula', () => {
    it('deve permitir acesso a aula pública para aluno matriculado', async () => {
      // Arrange
      const aulaId = 'aula-publica-id';
      const alunoId = 'aluno-id';
      
      // Mock da aula pública
      jest.spyOn(service, 'getAula').mockResolvedValue({
        id: aulaId,
        privada: false,
        curso_id: 'curso-id'
      });
      
      // Mock da matrícula
      jest.spyOn(service, 'getMatricula').mockResolvedValue({
        id: 'matricula-id',
        tipo_acesso: 'matriculado'
      });

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(true);
      expect(result.tipo_acesso).toBe('aula_publica');
    });

    it('deve permitir acesso a aula privada para convidado do curso', async () => {
      // Arrange
      const aulaId = 'aula-privada-id';
      const alunoId = 'aluno-id';
      
      jest.spyOn(service, 'getAula').mockResolvedValue({
        id: aulaId,
        privada: true,
        curso_id: 'curso-id'
      });
      
      jest.spyOn(service, 'getMatricula').mockResolvedValue({
        id: 'matricula-id',
        tipo_acesso: 'convidado_curso'
      });

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(true);
      expect(result.tipo_acesso).toBe('convidado_curso');
    });

    it('deve bloquear acesso a aula privada para aluno matriculado sem permissão específica', async () => {
      // Arrange
      const aulaId = 'aula-privada-id';
      const alunoId = 'aluno-id';
      
      jest.spyOn(service, 'getAula').mockResolvedValue({
        id: aulaId,
        privada: true,
        curso_id: 'curso-id'
      });
      
      jest.spyOn(service, 'getMatricula').mockResolvedValue({
        id: 'matricula-id',
        tipo_acesso: 'matriculado'
      });
      
      jest.spyOn(service, 'getAulaPermissao').mockResolvedValue(null);

      // Act
      const result = await service.podeAssistirAula(aulaId, alunoId);

      // Assert
      expect(result.pode_assistir).toBe(false);
      expect(result.motivo).toContain('convite específico');
    });
  });
});
```

### 2. Testes de Integração

```typescript
// tests/api/convites.integration.test.ts
describe('API de Convites', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('POST /api/cursos/[id]/convites/curso-completo', () => {
    it('deve enviar convite para curso completo', async () => {
      // Arrange
      const instrutor = await testDb.createUser({ role: 'instrutor' });
      const curso = await testDb.createCurso({ instrutor_id: instrutor.id });
      
      const conviteData = {
        email: 'aluno@teste.com',
        mensagem: 'Você foi convidado!',
        instrutor_id: instrutor.id
      };

      // Act
      const response = await request(app)
        .post(`/api/cursos/${curso.id}/convites/curso-completo`)
        .send(conviteData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      
      // Verificar se convite foi salvo no banco
      const convite = await testDb.getConvitePendente(response.body.token);
      expect(convite.tipo_convite).toBe('curso_completo');
      expect(convite.email).toBe(conviteData.email);
    });

    it('deve retornar erro 403 para usuário não instrutor', async () => {
      // Arrange
      const usuario = await testDb.createUser({ role: 'aluno' });
      const curso = await testDb.createCurso();
      
      const conviteData = {
        email: 'aluno@teste.com',
        instrutor_id: usuario.id
      };

      // Act & Assert
      await request(app)
        .post(`/api/cursos/${curso.id}/convites/curso-completo`)
        .send(conviteData)
        .expect(403);
    });
  });
});
```

### 3. Testes End-to-End

```typescript
// tests/e2e/convites.e2e.test.ts
describe('Fluxo Completo de Convites', () => {
  it('deve permitir instrutor convidar aluno e aluno aceitar convite', async () => {
    // 1. Instrutor faz login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'instrutor@teste.com');
    await page.fill('[data-testid=password]', 'senha123');
    await page.click('[data-testid=login-button]');

    // 2. Navegar para curso
    await page.goto('/dashboard/cursos/curso-teste-id');
    
    // 3. Abrir modal de convite
    await page.click('[data-testid=convidar-aluno]');
    await page.click('[data-testid=convite-curso-completo]');
    
    // 4. Preencher dados do convite
    await page.fill('[data-testid=email-aluno]', 'aluno@teste.com');
    await page.fill('[data-testid=mensagem]', 'Bem-vindo ao curso!');
    await page.click('[data-testid=enviar-convite]');
    
    // 5. Verificar sucesso
    await expect(page.locator('[data-testid=sucesso-convite]')).toBeVisible();
    
    // 6. Simular clique no link do email (usando token)
    const token = await getLastConviteToken();
    await page.goto(`/convites/aceitar/${token}`);
    
    // 7. Verificar redirecionamento para curso
    await expect(page).toHaveURL(/\/cursos\/curso-teste-id/);
    
    // 8. Verificar badge de acesso total
    await expect(page.locator('[data-testid=badge-acesso]')).toContainText('Convidado do Curso');
  });
});
```

## Migration Strategy

### 1. Script de Migração Principal

```sql
-- migration_001_sistema_aulas_privadas.sql

BEGIN;

-- 1. Backup das tabelas existentes
CREATE TABLE rarcursos.matriculas_backup AS SELECT * FROM rarcursos.matriculas;

-- 2. Adicionar colunas à tabela matriculas
ALTER TABLE rarcursos.matriculas 
ADD COLUMN IF NOT EXISTS tipo_acesso VARCHAR DEFAULT 'matriculado' 
CHECK (tipo_acesso IN ('matriculado', 'convidado_curso'));

ALTER TABLE rarcursos.matriculas 
ADD COLUMN IF NOT EXISTS adicionado_por UUID REFERENCES rarcursos.users(id);

-- 3. Atualizar registros existentes
UPDATE rarcursos.matriculas 
SET tipo_acesso = 'matriculado' 
WHERE tipo_acesso IS NULL;

-- 4. Tornar coluna obrigatória
ALTER TABLE rarcursos.matriculas 
ALTER COLUMN tipo_acesso SET NOT NULL;

-- 5. Criar tabela aula_permissoes
CREATE TABLE IF NOT EXISTS rarcursos.aula_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES rarcursos.aulas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES rarcursos.users(id) ON DELETE CASCADE,
  concedida_por UUID NOT NULL REFERENCES rarcursos.users(id),
  tipo_permissao VARCHAR NOT NULL CHECK (tipo_permissao IN ('convite_especifico', 'acesso_curso')),
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aula_id, aluno_id)
);

-- 6. Criar tabela convites_pendentes
CREATE TABLE IF NOT EXISTS rarcursos.convites_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  curso_id UUID NOT NULL REFERENCES rarcursos.cursos(id) ON DELETE CASCADE,
  tipo_convite VARCHAR NOT NULL CHECK (tipo_convite IN ('curso_completo', 'aulas_especificas')),
  aula_ids UUID[],
  enviado_por UUID NOT NULL REFERENCES rarcursos.users(id),
  mensagem TEXT,
  token VARCHAR UNIQUE NOT NULL,
  aceito BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT NOW(),
  expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

-- 7. Criar índices
CREATE INDEX IF NOT EXISTS idx_matriculas_tipo_acesso ON rarcursos.matriculas(tipo_acesso);
CREATE INDEX IF NOT EXISTS idx_matriculas_adicionado_por ON rarcursos.matriculas(adicionado_por);

CREATE INDEX IF NOT EXISTS idx_aula_permissoes_aula_id ON rarcursos.aula_permissoes(aula_id);
CREATE INDEX IF NOT EXISTS idx_aula_permissoes_aluno_id ON rarcursos.aula_permissoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aula_permissoes_tipo ON rarcursos.aula_permissoes(tipo_permissao);

CREATE INDEX IF NOT EXISTS idx_convites_token ON rarcursos.convites_pendentes(token);
CREATE INDEX IF NOT EXISTS idx_convites_email ON rarcursos.convites_pendentes(email);
CREATE INDEX IF NOT EXISTS idx_convites_curso ON rarcursos.convites_pendentes(curso_id);

-- 8. Verificar se coluna privada existe na tabela aulas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'rarcursos' 
        AND table_name = 'aulas' 
        AND column_name = 'privada'
    ) THEN
        ALTER TABLE rarcursos.aulas ADD COLUMN privada BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

COMMIT;
```

### 2. Script de Rollback

```sql
-- rollback_001_sistema_aulas_privadas.sql

BEGIN;

-- 1. Remover índices criados
DROP INDEX IF EXISTS rarcursos.idx_matriculas_tipo_acesso;
DROP INDEX IF EXISTS rarcursos.idx_matriculas_adicionado_por;
DROP INDEX IF EXISTS rarcursos.idx_aula_permissoes_aula_id;
DROP INDEX IF EXISTS rarcursos.idx_aula_permissoes_aluno_id;
DROP INDEX IF EXISTS rarcursos.idx_aula_permissoes_tipo;
DROP INDEX IF EXISTS rarcursos.idx_convites_token;
DROP INDEX IF EXISTS rarcursos.idx_convites_email;
DROP INDEX IF EXISTS rarcursos.idx_convites_curso;

-- 2. Remover tabelas criadas
DROP TABLE IF EXISTS rarcursos.convites_pendentes;
DROP TABLE IF EXISTS rarcursos.aula_permissoes;

-- 3. Remover colunas adicionadas à matriculas
ALTER TABLE rarcursos.matriculas DROP COLUMN IF EXISTS tipo_acesso;
ALTER TABLE rarcursos.matriculas DROP COLUMN IF EXISTS adicionado_por;

-- 4. Restaurar dados do backup se necessário
-- (Opcional - apenas se houver problemas)

-- 5. Remover backup
DROP TABLE IF EXISTS rarcursos.matriculas_backup;

COMMIT;
```

Este design fornece uma base sólida e escalável para implementar o sistema híbrido de aulas privadas, mantendo compatibilidade com a estrutura existente e seguindo as melhores práticas de desenvolvimento.
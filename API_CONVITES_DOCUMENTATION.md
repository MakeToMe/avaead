# 📚 Documentação das APIs de Convites

## Visão Geral

As APIs de convites implementam o sistema híbrido de aulas privadas, permitindo dois tipos de convites:
- **Convite para Curso Completo**: Acesso a todas as aulas (públicas + privadas)
- **Convite para Aulas Específicas**: Acesso granular a aulas selecionadas

## 🔗 Endpoints Implementados

### 1. Convite para Curso Completo

#### `POST /api/cursos/[id]/convites/curso-completo`
Envia convite para acesso completo ao curso.

**Parâmetros:**
- `id` (path): ID do curso

**Body:**
```json
{
  "email": "aluno@exemplo.com",
  "instrutor_id": "uuid-instrutor",
  "mensagem": "Mensagem personalizada (opcional)"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "token": "abc123def456...",
    "tipo_convite": "curso_completo",
    "email": "aluno@exemplo.com",
    "curso_id": "uuid-curso"
  }
}
```

#### `GET /api/cursos/[id]/convites/curso-completo?instrutor_id=uuid`
Lista convites pendentes para curso completo.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "aluno@exemplo.com",
      "mensagem": "Bem-vindo!",
      "token": "abc123...",
      "aceito": false,
      "criado_em": "2025-08-15T10:00:00Z",
      "expira_em": "2025-08-22T10:00:00Z"
    }
  ]
}
```

### 2. Convite para Aulas Específicas

#### `POST /api/cursos/[id]/convites/aulas-especificas`
Envia convite para aulas específicas.

**Body:**
```json
{
  "email": "aluno@exemplo.com",
  "aula_ids": ["uuid-aula1", "uuid-aula2"],
  "instrutor_id": "uuid-instrutor",
  "mensagem": "Mensagem personalizada (opcional)"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "token": "xyz789abc123...",
    "tipo_convite": "aulas_especificas",
    "email": "aluno@exemplo.com",
    "curso_id": "uuid-curso",
    "aulas_incluidas": [
      {
        "id": "uuid-aula1",
        "titulo": "Aula 1",
        "modulos": { "titulo": "Módulo 1" }
      }
    ],
    "total_aulas": 2
  }
}
```

#### `GET /api/cursos/[id]/convites/aulas-especificas?instrutor_id=uuid`
Lista convites pendentes para aulas específicas.

### 3. Gerenciamento de Tipo de Acesso

#### `PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso`
Altera o tipo de acesso de um aluno matriculado.

**Body:**
```json
{
  "tipo_acesso": "convidado_curso",
  "instrutor_id": "uuid-instrutor"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Tipo de acesso alterado com sucesso",
  "data": {
    "aluno_id": "uuid-aluno",
    "curso_id": "uuid-curso",
    "tipo_acesso_anterior": "matriculado",
    "tipo_acesso_atual": "convidado_curso",
    "alterado_por": "uuid-instrutor",
    "alterado_em": "2025-08-15T10:00:00Z"
  }
}
```

#### `GET /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso?instrutor_id=uuid`
Consulta o tipo de acesso atual de um aluno.

### 4. Verificação de Acesso

#### `GET /api/cursos/[id]/aulas/acesso?aluno_id=uuid`
Verifica acesso do aluno a todas as aulas do curso.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "aluno_id": "uuid-aluno",
    "curso_id": "uuid-curso",
    "tipo_acesso": "convidado_curso",
    "estatisticas": {
      "total_aulas": 10,
      "aulas_publicas": 6,
      "aulas_privadas": 4,
      "aulas_acessiveis": 8,
      "aulas_bloqueadas": 2,
      "percentual_acesso": 80
    },
    "aulas_por_modulo": [
      {
        "modulo": {
          "id": "uuid-modulo",
          "titulo": "Módulo 1",
          "ordem": 1
        },
        "aulas": [
          {
            "id": "uuid-aula",
            "titulo": "Aula 1",
            "privada": false,
            "pode_assistir": true,
            "tipo_acesso": "aula_publica"
          }
        ],
        "total_aulas": 3,
        "aulas_acessiveis": 2,
        "aulas_bloqueadas": 1
      }
    ]
  }
}
```

#### `POST /api/cursos/[id]/aulas/acesso`
Verifica acesso a uma aula específica.

**Body:**
```json
{
  "aula_id": "uuid-aula",
  "aluno_id": "uuid-aluno"
}
```

### 5. Aceitação de Convites

#### `GET /api/convites/aceitar/[token]`
Aceita um convite via link (redirecionamento).

**Comportamento:**
- Sucesso: Redireciona para `/convites/sucesso?curso_id=...&tipo=...`
- Erro: Redireciona para `/convites/erro?motivo=...`

#### `POST /api/convites/aceitar/[token]`
Aceita um convite via API (uso programático).

**Resposta:**
```json
{
  "success": true,
  "message": "Convite aceito com sucesso",
  "data": {
    "convite": {
      "id": "uuid",
      "email": "aluno@exemplo.com",
      "tipo_convite": "curso_completo",
      "cursos": {
        "titulo": "Nome do Curso"
      }
    },
    "matricula": {
      "id": "uuid",
      "tipo_acesso": "convidado_curso",
      "users": {
        "nome": "Nome do Aluno"
      }
    },
    "aceito_em": "2025-08-15T10:00:00Z"
  }
}
```

## 🚨 Códigos de Erro

### Códigos HTTP
- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `403` - Não autorizado (não é instrutor)
- `404` - Recurso não encontrado
- `409` - Conflito (convite duplicado, usuário já matriculado)
- `410` - Convite expirado
- `500` - Erro interno do servidor

### Códigos de Erro Personalizados
```json
{
  "success": false,
  "error": "Mensagem do erro",
  "codigo": "CODIGO_ERRO",
  "detalhes": [] // Opcional, para erros de validação
}
```

**Códigos disponíveis:**
- `CONVITE_NAO_ENCONTRADO`
- `CONVITE_EXPIRADO`
- `CONVITE_JA_ACEITO`
- `CONVITE_DUPLICADO`
- `NAO_E_INSTRUTOR`
- `USUARIO_JA_MATRICULADO`
- `AULAS_NAO_PERTENCEM_CURSO`
- `DADOS_INVALIDOS`
- `ERRO_INTERNO`

## 🔒 Validações de Segurança

### Verificação de Instrutor
Todas as operações de convite verificam se o usuário é instrutor do curso:
```sql
SELECT instrutor_id FROM cursos WHERE id = curso_id
```

### Validação de Dados
- Emails são validados com regex
- UUIDs são validados
- Arrays de aula_ids devem ter pelo menos 1 item
- Tipos de acesso são validados contra enum

### Prevenção de Duplicatas
- Convites duplicados para mesmo email/curso são bloqueados
- Usuários já matriculados não podem receber novos convites

## 🧪 Testando as APIs

### 1. Usando curl

```bash
# Convite para curso completo
curl -X POST "http://localhost:3000/api/cursos/CURSO_ID/convites/curso-completo" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aluno@teste.com",
    "instrutor_id": "INSTRUTOR_ID",
    "mensagem": "Bem-vindo ao curso!"
  }'

# Verificar acesso
curl "http://localhost:3000/api/cursos/CURSO_ID/aulas/acesso?aluno_id=ALUNO_ID"

# Aceitar convite
curl -X POST "http://localhost:3000/api/convites/aceitar/TOKEN"
```

### 2. Usando JavaScript/Fetch

```javascript
// Enviar convite
const response = await fetch('/api/cursos/CURSO_ID/convites/curso-completo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'aluno@teste.com',
    instrutor_id: 'INSTRUTOR_ID',
    mensagem: 'Bem-vindo!'
  })
});

const result = await response.json();
console.log(result);
```

## 📊 Fluxo Completo

### Convite para Curso Completo
1. Instrutor envia convite via `POST /api/cursos/[id]/convites/curso-completo`
2. Sistema gera token único e salva em `convites_pendentes`
3. Email é enviado com link `/api/convites/aceitar/[token]`
4. Aluno clica no link
5. Sistema cria matrícula com `tipo_acesso = 'convidado_curso'`
6. Aluno tem acesso a todas as aulas (públicas + privadas)

### Convite para Aulas Específicas
1. Instrutor envia convite via `POST /api/cursos/[id]/convites/aulas-especificas`
2. Sistema valida se aulas pertencem ao curso
3. Sistema gera token e salva convite com array de `aula_ids`
4. Aluno aceita convite
5. Sistema cria matrícula normal + permissões específicas em `aula_permissoes`
6. Aluno tem acesso apenas às aulas selecionadas

## 🔧 Configuração

### Variáveis de Ambiente Necessárias
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
URL_BASE=https://seu-dominio.com
```

### Dependências
- `@supabase/supabase-js`
- `zod` (validação)
- `crypto` (geração de tokens)

## 📝 Notas de Implementação

- Tokens de convite expiram em 7 dias
- Convites aceitos não podem ser reutilizados
- Instrutor pode alterar tipo de acesso de alunos já matriculados
- Sistema previne convites duplicados
- Todas as operações são auditáveis (quem fez, quando)
- Middleware de erro trata automaticamente exceções
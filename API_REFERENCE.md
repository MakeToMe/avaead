# 🔌 API Reference - Sistema de Aulas Privadas

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Convites](#convites)
3. [Permissões](#permissões)
4. [Verificação de Acesso](#verificação-de-acesso)
5. [Gerenciamento](#gerenciamento)
6. [Auditoria](#auditoria)
7. [Códigos de Erro](#códigos-de-erro)

---

## 🔐 Autenticação

Todas as APIs requerem autenticação via JWT token ou sessão do Supabase.

```http
Authorization: Bearer seu-jwt-token
```

---

## 📧 Convites

### Enviar Convite para Curso Completo

Permite ao instrutor convidar um aluno para ter acesso total ao curso.

```http
POST /api/cursos/{curso_id}/convites/curso-completo
Content-Type: application/json
```

**Parâmetros:**
- `curso_id` (path): UUID do curso

**Body:**
```json
{
  "email": "aluno@exemplo.com",
  "mensagem": "Bem-vindo ao curso!",
  "instrutor_id": "uuid-do-instrutor"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "token": "abc123_def456789",
  "message": "Convite enviado com sucesso"
}
```

**Exemplo cURL:**
```bash
curl -X POST "https://api.exemplo.com/api/cursos/123/convites/curso-completo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "email": "aluno@exemplo.com",
    "mensagem": "Bem-vindo!",
    "instrutor_id": "instrutor-123"
  }'
```

---

### Enviar Convite para Aulas Específicas

Permite ao instrutor convidar um aluno para aulas específicas.

```http
POST /api/cursos/{curso_id}/convites/aulas-especificas
Content-Type: application/json
```

**Body:**
```json
{
  "email": "aluno@exemplo.com",
  "aula_ids": ["aula-1", "aula-2", "aula-3"],
  "mensagem": "Acesso às aulas selecionadas",
  "instrutor_id": "uuid-do-instrutor"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "token": "xyz789_abc123456",
  "message": "Convite para aulas específicas enviado"
}
```

---

### Aceitar Convite

Processa a aceitação de um convite por token.

```http
POST /api/convites/aceitar
Content-Type: application/json
```

**Body:**
```json
{
  "token": "abc123_def456789"
}
```

**Resposta de Sucesso (200):**
```json
{
  "sucesso": true,
  "curso_id": "uuid-do-curso",
  "message": "Convite aceito com sucesso"
}
```

**Resposta de Erro (400):**
```json
{
  "sucesso": false,
  "erro": "Convite expirado"
}
```

---

## 🛡️ Permissões

### Conceder Permissão Específica

Concede acesso a uma aula privada para um aluno específico.

```http
POST /api/aulas/{aula_id}/permissoes
Content-Type: application/json
```

**Body:**
```json
{
  "aluno_id": "uuid-do-aluno",
  "tipo_permissao": "convite_especifico"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Permissão concedida com sucesso"
}
```

---

### Remover Permissão Específica

Remove acesso específico de um aluno a uma aula privada.

```http
DELETE /api/aulas/{aula_id}/permissoes/{aluno_id}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Permissão removida com sucesso"
}
```

---

### Listar Permissões de uma Aula

Lista todos os alunos com acesso a uma aula específica.

```http
GET /api/aulas/{aula_id}/permissoes
```

**Resposta de Sucesso (200):**
```json
{
  "aula": {
    "id": "aula-123",
    "titulo": "Aula Privada",
    "privada": true
  },
  "alunos_com_acesso": [
    {
      "id": "matricula-1",
      "aluno_id": "aluno-1",
      "nome": "João Silva",
      "email": "joao@exemplo.com",
      "tipo_acesso": "convidado_curso",
      "data_permissao": "2025-01-15T10:30:00Z"
    }
  ],
  "alunos_sem_acesso": [
    {
      "id": "matricula-2",
      "aluno_id": "aluno-2",
      "nome": "Maria Santos",
      "email": "maria@exemplo.com",
      "data_matricula": "2025-01-10T14:20:00Z"
    }
  ],
  "estatisticas": {
    "total_com_acesso": 1,
    "total_sem_acesso": 1,
    "convidados_curso": 1,
    "convites_especificos": 0
  }
}
```

---

## ✅ Verificação de Acesso

### Verificar Acesso a Aula

Verifica se um usuário pode acessar uma aula específica.

```http
GET /api/aulas/{aula_id}/verificar-acesso?usuario_id={usuario_id}
```

**Parâmetros:**
- `aula_id` (path): UUID da aula
- `usuario_id` (query): UUID do usuário

**Resposta de Sucesso (200):**
```json
{
  "permitido": true,
  "tipo_acesso": "convidado_curso",
  "usuario_id": "usuario-123",
  "aula_id": "aula-456"
}
```

**Resposta de Acesso Negado (200):**
```json
{
  "permitido": false,
  "motivo": "Esta aula requer convite específico do instrutor",
  "usuario_id": "usuario-123",
  "aula_id": "aula-456"
}
```

---

### Listar Aulas com Status de Acesso

Lista todas as aulas de um curso com informações de acesso para um aluno.

```http
GET /api/cursos/{curso_id}/aulas/acesso?aluno_id={aluno_id}
```

**Resposta de Sucesso (200):**
```json
{
  "aulas": [
    {
      "id": "aula-1",
      "titulo": "Introdução",
      "privada": false,
      "pode_assistir": true,
      "tipo_acesso": "aula_publica"
    },
    {
      "id": "aula-2",
      "titulo": "Conteúdo Avançado",
      "privada": true,
      "pode_assistir": true,
      "tipo_acesso": "convidado_curso"
    },
    {
      "id": "aula-3",
      "titulo": "Masterclass",
      "privada": true,
      "pode_assistir": false,
      "motivo": "Esta aula requer convite específico do instrutor"
    }
  ],
  "tipo_acesso": {
    "tipo": "convidado_curso",
    "descricao": "Convidado do Curso - Acesso total",
    "total_aulas": 3,
    "aulas_acessiveis": 2
  },
  "estatisticas": {
    "total_aulas": 3,
    "aulas_acessiveis": 2,
    "aulas_publicas": 1,
    "aulas_privadas": 2,
    "aulas_privadas_com_acesso": 1,
    "aulas_privadas_bloqueadas": 1
  }
}
```

---

## 👥 Gerenciamento

### Listar Alunos do Curso

Lista todos os alunos matriculados em um curso com seus tipos de acesso.

```http
GET /api/cursos/{curso_id}/alunos
```

**Resposta de Sucesso (200):**
```json
{
  "alunos": [
    {
      "id": "matricula-1",
      "aluno_id": "aluno-1",
      "nome": "João Silva",
      "email": "joao@exemplo.com",
      "tipo_acesso": "convidado_curso",
      "data_matricula": "2025-01-10T10:00:00Z",
      "progresso_percentual": 75,
      "aulas_especificas": 0
    },
    {
      "id": "matricula-2",
      "aluno_id": "aluno-2",
      "nome": "Maria Santos",
      "email": "maria@exemplo.com",
      "tipo_acesso": "matriculado",
      "data_matricula": "2025-01-12T14:30:00Z",
      "progresso_percentual": 45,
      "aulas_especificas": 2
    }
  ],
  "total": 2,
  "matriculados": 1,
  "convidados": 1
}
```

---

### Alterar Tipo de Acesso

Altera o tipo de acesso de um aluno em um curso.

```http
PUT /api/cursos/{curso_id}/alunos/{aluno_id}/tipo-acesso
Content-Type: application/json
```

**Body:**
```json
{
  "tipo_acesso": "convidado_curso"
}
```

**Valores válidos para `tipo_acesso`:**
- `matriculado`: Acesso apenas a aulas públicas
- `convidado_curso`: Acesso total (todas as aulas)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Tipo de acesso alterado para convidado_curso",
  "tipo_acesso_anterior": "matriculado",
  "tipo_acesso_novo": "convidado_curso"
}
```

---

## 📊 Auditoria

### Buscar Eventos de Auditoria

Lista eventos de auditoria com filtros opcionais.

```http
GET /api/admin/auditoria/eventos?data_inicio=2025-01-01&data_fim=2025-01-31&tipo_evento=convite_enviado
```

**Parâmetros de Query (todos opcionais):**
- `data_inicio`: Data de início (YYYY-MM-DD)
- `data_fim`: Data de fim (YYYY-MM-DD)
- `tipo_evento`: Tipo específico de evento
- `severidade`: Nível de severidade (info, warning, error, critical)
- `usuario_email`: Email do usuário
- `limite`: Número máximo de resultados (padrão: 100)

**Resposta de Sucesso (200):**
```json
{
  "eventos": [
    {
      "id": "evento-1",
      "tipo_evento": "convite_enviado",
      "severidade": "info",
      "timestamp": "2025-01-15T10:30:00Z",
      "usuario_nome": "Professor Silva",
      "usuario_email": "professor@exemplo.com",
      "recurso_tipo": "convite",
      "recurso_nome": "Curso de React",
      "detalhes": {
        "email_destinatario": "aluno@exemplo.com",
        "tipo_convite": "curso_completo"
      },
      "ip_address": "192.168.1.100"
    }
  ],
  "total": 1,
  "pagina": 1,
  "limite": 100
}
```

---

### Obter Métricas de Auditoria

Retorna métricas resumidas do sistema de auditoria.

```http
GET /api/admin/auditoria/metricas
```

**Resposta de Sucesso (200):**
```json
{
  "total_eventos_hoje": 45,
  "total_usuarios_ativos": 12,
  "eventos_criticos": 2,
  "tipos_eventos_distintos": 8,
  "eventos_por_tipo": {
    "convite_enviado": 15,
    "convite_aceito": 12,
    "acesso_aula_permitido": 156,
    "acesso_aula_negado": 8
  },
  "usuarios_mais_ativos": [
    {
      "usuario_id": "instrutor-1",
      "nome": "Professor Silva",
      "total_eventos": 25
    }
  ]
}
```

---

## ❌ Códigos de Erro

### Códigos HTTP Padrão

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 200 | OK | Operação realizada com sucesso |
| 400 | Bad Request | Dados inválidos ou parâmetros faltando |
| 401 | Unauthorized | Token de autenticação inválido ou ausente |
| 403 | Forbidden | Usuário não tem permissão para a operação |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | Conflito (ex: convite já aceito) |
| 500 | Internal Server Error | Erro interno do servidor |

### Códigos de Erro Específicos

```json
{
  "error": "Mensagem de erro legível",
  "codigo": "CODIGO_ESPECIFICO",
  "detalhes": {}
}
```

**Códigos Específicos:**

| Código | Descrição |
|--------|-----------|
| `CONVITE_NAO_ENCONTRADO` | Token de convite não existe |
| `CONVITE_EXPIRADO` | Convite passou da data de expiração |
| `CONVITE_JA_ACEITO` | Convite já foi aceito anteriormente |
| `NAO_AUTORIZADO` | Usuário não tem permissão |
| `NAO_E_INSTRUTOR` | Usuário não é instrutor do curso |
| `ALUNO_NAO_MATRICULADO` | Aluno não está matriculado no curso |
| `AULA_NAO_ENCONTRADA` | Aula não existe ou está inativa |
| `AULA_PRIVADA_SEM_PERMISSAO` | Tentativa de acesso a aula privada sem permissão |
| `DADOS_INVALIDOS` | Dados de entrada não passaram na validação |
| `EMAIL_INVALIDO` | Formato de email inválido |

### Exemplos de Respostas de Erro

**Convite Expirado (400):**
```json
{
  "sucesso": false,
  "erro": "Convite expirado",
  "codigo": "CONVITE_EXPIRADO"
}
```

**Não Autorizado (403):**
```json
{
  "error": "Você não tem permissão para gerenciar este curso",
  "codigo": "NAO_E_INSTRUTOR"
}
```

**Dados Inválidos (400):**
```json
{
  "error": "Dados inválidos",
  "codigo": "DADOS_INVALIDOS",
  "detalhes": [
    {
      "campo": "email",
      "mensagem": "Email é obrigatório"
    },
    {
      "campo": "aula_ids",
      "mensagem": "Selecione pelo menos uma aula"
    }
  ]
}
```

---

## 🔧 Utilitários para Desenvolvimento

### Testando APIs com cURL

```bash
# Definir variáveis
export API_BASE="https://seu-dominio.com/api"
export TOKEN="seu-jwt-token"

# Testar verificação de acesso
curl -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/aulas/aula-123/verificar-acesso?usuario_id=usuario-456"

# Enviar convite
curl -X POST "$API_BASE/cursos/curso-123/convites/curso-completo" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","instrutor_id":"instrutor-123"}'
```

### Testando com JavaScript/Fetch

```javascript
// Função auxiliar para chamadas API
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    },
    ...options
  });
  
  return response.json();
}

// Exemplos de uso
const acesso = await apiCall('/aulas/123/verificar-acesso?usuario_id=456');
const convite = await apiCall('/cursos/123/convites/curso-completo', {
  method: 'POST',
  body: JSON.stringify({
    email: 'aluno@exemplo.com',
    instrutor_id: 'instrutor-123'
  })
});
```

---

## 📝 Notas de Versionamento

**Versão Atual**: 1.0

### Compatibilidade
- **Next.js**: 15+
- **Supabase**: Qualquer versão
- **PostgreSQL**: 15+

### Changelog
- **v1.0**: Versão inicial com todas as funcionalidades básicas

---

**Documentação gerada automaticamente**  
**Última atualização**: Janeiro 2025
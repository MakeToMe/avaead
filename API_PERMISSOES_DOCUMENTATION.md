# 📚 Documentação das APIs de Permissões de Aulas

## Visão Geral

As APIs de permissões de aulas permitem o gerenciamento granular de acesso a aulas privadas, complementando o sistema híbrido de convites. Instrutores podem conceder/remover permissões específicas para alunos matriculados.

## 🔗 Endpoints Implementados

### 1. Gerenciamento de Permissões por Aula

#### `POST /api/aulas/[id]/permissoes`
Concede permissão específica para um aluno assistir uma aula privada.

**Parâmetros:**
- `id` (path): ID da aula

**Body:**
```json
{
  "aluno_id": "uuid-aluno",
  "instrutor_id": "uuid-instrutor"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Permissão concedida com sucesso",
  "data": {
    "permissao": {
      "id": "uuid-permissao",
      "aula_id": "uuid-aula",
      "aluno_id": "uuid-aluno",
      "concedida_por": "uuid-instrutor",
      "tipo_permissao": "convite_especifico",
      "criado_em": "2025-08-15T10:00:00Z"
    },
    "aula": {
      "id": "uuid-aula",
      "titulo": "Aula Avançada",
      "modulos": {
        "titulo": "Módulo 2"
      }
    },
    "aluno": {
      "uid": "uuid-aluno",
      "nome": "João Silva",
      "email": "joao@exemplo.com"
    },
    "concedida_em": "2025-08-15T10:00:00Z"
  }
}
```

#### `GET /api/aulas/[id]/permissoes?instrutor_id=uuid`
Lista todas as permissões de uma aula específica.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "aula": {
      "id": "uuid-aula",
      "titulo": "Aula Avançada",
      "privada": true,
      "curso_id": "uuid-curso"
    },
    "resumo": {
      "total_com_acesso": 5,
      "convidados_curso": 2,
      "permissoes_especificas": 3,
      "matriculados_sem_acesso": 8
    },
    "convidados_curso": [
      {
        "id": "uuid-matricula",
        "aluno_id": "uuid-aluno",
        "tipo_acesso": "convidado_curso",
        "users": {
          "nome": "Maria Santos",
          "email": "maria@exemplo.com"
        }
      }
    ],
    "permissoes_especificas": [
      {
        "id": "uuid-permissao",
        "aluno_id": "uuid-aluno",
        "tipo_permissao": "convite_especifico",
        "criado_em": "2025-08-15T10:00:00Z",
        "users": {
          "nome": "João Silva",
          "email": "joao@exemplo.com"
        },
        "instrutor": {
          "nome": "Prof. Carlos"
        }
      }
    ],
    "matriculados_sem_acesso": [
      {
        "id": "uuid-matricula",
        "aluno_id": "uuid-aluno",
        "users": {
          "nome": "Ana Costa",
          "email": "ana@exemplo.com"
        }
      }
    ]
  }
}
```

### 2. Gerenciamento de Permissão Específica

#### `DELETE /api/aulas/[id]/permissoes/[aluno_id]`
Remove permissão específica de um aluno para uma aula.

**Body:**
```json
{
  "instrutor_id": "uuid-instrutor"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Permissão removida com sucesso",
  "data": {
    "aula": {
      "id": "uuid-aula",
      "titulo": "Aula Avançada"
    },
    "aluno": {
      "nome": "João Silva",
      "email": "joao@exemplo.com"
    },
    "removido_por": "uuid-instrutor",
    "removido_em": "2025-08-15T10:00:00Z"
  }
}
```

#### `GET /api/aulas/[id]/permissoes/[aluno_id]?instrutor_id=uuid`
Verifica se um aluno específico tem permissão para uma aula.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "aula": {
      "id": "uuid-aula",
      "titulo": "Aula Avançada",
      "privada": true
    },
    "aluno": {
      "nome": "João Silva",
      "email": "joao@exemplo.com"
    },
    "matricula": {
      "tipo_acesso": "matriculado",
      "data_matricula": "2025-08-01T10:00:00Z"
    },
    "matriculado": true,
    "tem_acesso": true,
    "tipo_acesso": "convite_especifico",
    "motivo": "Permissão específica concedida por Prof. Carlos",
    "verificado_em": "2025-08-15T10:00:00Z"
  }
}
```

### 3. Gerenciamento de Permissões por Aluno

#### `GET /api/cursos/[id]/alunos/[aluno_id]/permissoes?instrutor_id=uuid`
Lista todas as permissões específicas de um aluno em um curso.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "aluno": {
      "id": "uuid-matricula",
      "tipo_acesso": "matriculado",
      "users": {
        "nome": "João Silva",
        "email": "joao@exemplo.com"
      }
    },
    "tipo_acesso_geral": "matriculado",
    "tem_acesso_total": false,
    "permissoes_especificas": [
      {
        "id": "uuid-permissao",
        "aula_id": "uuid-aula",
        "tipo_permissao": "convite_especifico",
        "criado_em": "2025-08-15T10:00:00Z",
        "aulas": {
          "titulo": "Aula Avançada",
          "modulos": {
            "titulo": "Módulo 2"
          }
        },
        "instrutor": {
          "nome": "Prof. Carlos"
        }
      }
    ],
    "total_permissoes_especificas": 1
  }
}
```

#### `POST /api/cursos/[id]/alunos/[aluno_id]/permissoes`
Concede múltiplas permissões específicas para um aluno.

**Body:**
```json
{
  "aula_ids": ["uuid-aula1", "uuid-aula2", "uuid-aula3"],
  "instrutor_id": "uuid-instrutor"
}
```

**Resposta (207 Multi-Status):**
```json
{
  "success": true,
  "message": "2 permissões concedidas, 1 erros",
  "data": {
    "curso_id": "uuid-curso",
    "aluno_id": "uuid-aluno",
    "total_solicitadas": 3,
    "total_concedidas": 2,
    "total_erros": 1,
    "permissoes_concedidas": [
      {
        "aula_id": "uuid-aula1",
        "success": true,
        "aula": {
          "titulo": "Aula 1"
        }
      },
      {
        "aula_id": "uuid-aula2",
        "success": true,
        "aula": {
          "titulo": "Aula 2"
        }
      }
    ],
    "erros": [
      {
        "aula_id": "uuid-aula3",
        "success": false,
        "error": "Aluno já tem permissão para esta aula"
      }
    ],
    "processado_em": "2025-08-15T10:00:00Z"
  }
}
```

#### `DELETE /api/cursos/[id]/alunos/[aluno_id]/permissoes`
Remove todas as permissões específicas de um aluno em um curso.

**Body:**
```json
{
  "instrutor_id": "uuid-instrutor"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "3 permissões removidas com sucesso",
  "data": {
    "curso_id": "uuid-curso",
    "aluno_id": "uuid-aluno",
    "permissoes_removidas": 3,
    "aulas_afetadas": [
      {
        "aula_id": "uuid-aula1",
        "titulo": "Aula 1"
      },
      {
        "aula_id": "uuid-aula2",
        "titulo": "Aula 2"
      }
    ],
    "removido_por": "uuid-instrutor",
    "removido_em": "2025-08-15T10:00:00Z"
  }
}
```

## 🚨 Validações e Regras de Negócio

### Validações de Segurança
- ✅ Verificação se usuário é instrutor do curso
- ✅ Verificação se aluno está matriculado no curso
- ✅ Verificação se aula existe e pertence ao curso
- ✅ Prevenção de permissões duplicadas

### Regras de Negócio
- ❌ Não é possível conceder permissão para aula pública
- ❌ Não é possível conceder permissão para aluno com acesso total (convidado_curso)
- ❌ Não é possível conceder permissão duplicada
- ✅ Apenas instrutores podem gerenciar permissões
- ✅ Permissões são específicas por aula
- ✅ Remoção de permissão é auditável

### Códigos de Erro Específicos
```json
{
  "success": false,
  "error": "Mensagem do erro",
  "codigo": "CODIGO_ERRO"
}
```

**Novos códigos para permissões:**
- `AULA_NAO_E_PRIVADA` - Tentativa de conceder permissão para aula pública
- `ALUNO_TEM_ACESSO_TOTAL` - Aluno já tem acesso total (convidado_curso)
- `PERMISSAO_JA_EXISTE` - Permissão já foi concedida
- `PERMISSAO_NAO_EXISTE` - Tentativa de remover permissão inexistente

## 🧪 Testando as APIs

### 1. Conceder Permissão Específica
```bash
curl -X POST "http://localhost:3000/api/aulas/AULA_ID/permissoes" \
  -H "Content-Type: application/json" \
  -d '{
    "aluno_id": "ALUNO_ID",
    "instrutor_id": "INSTRUTOR_ID"
  }'
```

### 2. Listar Permissões da Aula
```bash
curl "http://localhost:3000/api/aulas/AULA_ID/permissoes?instrutor_id=INSTRUTOR_ID"
```

### 3. Verificar Permissão Específica
```bash
curl "http://localhost:3000/api/aulas/AULA_ID/permissoes/ALUNO_ID?instrutor_id=INSTRUTOR_ID"
```

### 4. Conceder Múltiplas Permissões
```bash
curl -X POST "http://localhost:3000/api/cursos/CURSO_ID/alunos/ALUNO_ID/permissoes" \
  -H "Content-Type: application/json" \
  -d '{
    "aula_ids": ["AULA_ID1", "AULA_ID2"],
    "instrutor_id": "INSTRUTOR_ID"
  }'
```

### 5. Remover Permissão
```bash
curl -X DELETE "http://localhost:3000/api/aulas/AULA_ID/permissoes/ALUNO_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "instrutor_id": "INSTRUTOR_ID"
  }'
```

## 📊 Fluxos de Uso

### Fluxo 1: Conceder Acesso Granular
1. Instrutor visualiza aula privada
2. Instrutor vê lista de alunos matriculados sem acesso
3. Instrutor seleciona aluno e concede permissão
4. Sistema cria registro em `aula_permissoes`
5. Aluno passa a ter acesso à aula específica

### Fluxo 2: Gerenciar Permissões de Aula
1. Instrutor acessa gerenciamento de aula privada
2. Sistema mostra resumo de acessos:
   - Convidados do curso (acesso automático)
   - Permissões específicas
   - Matriculados sem acesso
3. Instrutor pode conceder/remover permissões individuais

### Fluxo 3: Gerenciar Permissões de Aluno
1. Instrutor acessa perfil de aluno específico
2. Sistema mostra todas as permissões específicas do aluno
3. Instrutor pode:
   - Conceder permissões para múltiplas aulas
   - Remover permissões específicas
   - Promover para acesso total (convidado_curso)

## 🔧 Integração com Sistema Existente

### Compatibilidade com Convites
- ✅ Funciona junto com sistema de convites
- ✅ Respeita hierarquia de acessos (convidado_curso > convite_específico > matriculado)
- ✅ Não permite conflitos (ex: permissão específica para quem já tem acesso total)

### Auditoria
- ✅ Todas as operações registram quem executou
- ✅ Timestamps de criação e remoção
- ✅ Histórico mantido para auditoria

### Performance
- ✅ Índices otimizados para consultas frequentes
- ✅ Queries eficientes com JOINs apropriados
- ✅ Paginação implícita em listagens grandes

## 📝 Notas de Implementação

### Banco de Dados
- Tabela `aula_permissoes` com constraints de integridade
- Índices em `aula_id`, `aluno_id` e `tipo_permissao`
- Constraint UNIQUE para evitar duplicatas

### Validações
- Verificação de instrutor em todas as operações
- Validação de existência de aula, aluno e curso
- Prevenção de operações inválidas (ex: permissão para aula pública)

### Respostas Enriquecidas
- Dados completos de aula, aluno e instrutor
- Estatísticas de acesso por aula
- Informações de auditoria (quem, quando)

### Tratamento de Erros
- Middleware centralizado de tratamento de erros
- Códigos de erro específicos para cada situação
- Mensagens descritivas para debugging
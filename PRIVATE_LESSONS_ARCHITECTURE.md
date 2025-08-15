# 🔒 Arquitetura: Sistema de Aulas Privadas (GRANULAR)

**Data:** 14/08/2025  
**Status:** 📋 **PLANEJAMENTO ATUALIZADO - PERMISSÃO POR AULA**

## 🎯 **Regra de Negócio Atualizada:**

- **Controle granular:** Permissão específica por AULA, não por curso
- **Aula privada = true:** Instrutor deve dar permissão individual para cada aluno
- **Aula privada = false:** Todos os alunos matriculados podem ver
- **Manter:** Modal existente para adicionar alunos ao CURSO (matrícula geral)
- **Novo:** Sistema para dar permissão específica em AULAS privadas

## 🏗️ **NOVA SOLUÇÃO: Duas Tabelas Complementares**

### **Tabela 1: `curso_alunos` (EXISTENTE - Matrícula Geral)**

```sql
CREATE TABLE curso_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES cursos(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES users(id) ON DELETE CASCADE,
  adicionado_por UUID REFERENCES users(id), -- instrutor
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(curso_id, aluno_id)
);
```

### **Tabela 2: `aula_permissoes` (NOVA - Permissões Granulares) ⭐**

```sql
CREATE TABLE aula_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID REFERENCES aulas(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES users(id) ON DELETE CASCADE,
  concedida_por UUID REFERENCES users(id), -- instrutor que deu permissão
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aula_id, aluno_id)
);
```

### **Vantagens desta Arquitetura:**

1. ✅ **Granularidade Total** - Controle por aula específica
2. ✅ **Escalável** - Suporta milhares de permissões
3. ✅ **Performática** - Queries rápidas com índices
4. ✅ **Auditável** - Histórico de quem deu cada permissão
5. ✅ **Flexível** - Instrutor pode dar/remover permissões individualmente
6. ✅ **Compatível** - Mantém sistema existente de matrícula

## 🔄 **Nova Lógica de Acesso:**

### **Fluxo de Verificação:**

1. **Aluno está matriculado no curso?**
   ```sql
   SELECT * FROM curso_alunos 
   WHERE curso_id = $1 AND aluno_id = $2
   ```

2. **Aula é privada?**
   ```sql
   SELECT privada FROM aulas WHERE id = $3
   ```

3. **Se aula for privada, tem permissão específica?**
   ```sql
   SELECT * FROM aula_permissoes 
   WHERE aula_id = $3 AND aluno_id = $2
   ```

### **Regras de Acesso:**

- **Aula Pública** (`privada = false`): Qualquer aluno matriculado pode ver
- **Aula Privada** (`privada = true`): Só alunos com permissão específica

### **Query Completa de Verificação:**
```sql
-- Verificar se aluno pode assistir aula específica
SELECT 
  a.privada,
  ca.aluno_id IS NOT NULL as matriculado,
  ap.aluno_id IS NOT NULL as tem_permissao_privada,
  CASE 
    WHEN a.privada = false AND ca.aluno_id IS NOT NULL THEN true
    WHEN a.privada = true AND ap.aluno_id IS NOT NULL THEN true
    ELSE false
  END as pode_assistir
FROM aulas a
LEFT JOIN curso_alunos ca ON ca.curso_id = a.curso_id AND ca.aluno_id = $2
LEFT JOIN aula_permissoes ap ON ap.aula_id = a.id AND ap.aluno_id = $2
WHERE a.id = $1;
```

## 🎨 **Interface do Aluno:**

### **Estrutura Visual:**
```
📚 Curso: React Avançado

📁 Módulo 1: Fundamentos
  ✅ Aula 1: Introdução (pública) ← Pode assistir
  ✅ Aula 2: Hooks Básicos (pública) ← Pode assistir
  🔒 Aula 3: Hooks Avançados (privada) ← Badge + bloqueio

📁 Módulo 2: Avançado
  ✅ Aula 4: Context API (pública) ← Pode assistir
  ✅ Aula 5: Performance (privada) ← Tem permissão específica!
  🔒 Aula 6: Testes (privada) ← Badge + bloqueio
```

### **Comportamentos por Tipo de Aula:**

**Aula Pública** (`privada = false`):
- ✅ Qualquer aluno matriculado pode assistir
- Aparece normal na lista

**Aula Privada SEM permissão:**
- 🔒 Badge "Privada" visível
- Ao clicar: "Você precisa de permissão do instrutor para esta aula"
- Player bloqueado

**Aula Privada COM permissão:**
- ✅ Aparece normal (sem badge)
- Aluno pode assistir normalmente

## 🛠️ **Implementação Backend:**

### **1. Função de Verificação Granular:**
```typescript
async function podeAssistirAula(
  aulaId: string, 
  alunoId: string
): Promise<{pode_assistir: boolean, motivo?: string}> {
  
  // 1. Buscar dados da aula e verificar matrícula
  const result = await supabase
    .from('aulas')
    .select(`
      id,
      privada,
      curso_id,
      titulo,
      curso_alunos!inner(aluno_id),
      aula_permissoes(aluno_id)
    `)
    .eq('id', aulaId)
    .eq('curso_alunos.aluno_id', alunoId)
    .single()
  
  if (!result.data) {
    return {
      pode_assistir: false, 
      motivo: "Você não está matriculado neste curso"
    }
  }
  
  const aula = result.data
  
  // 2. Se aula é pública, pode assistir
  if (!aula.privada) {
    return { pode_assistir: true }
  }
  
  // 3. Se aula é privada, verificar permissão específica
  const temPermissao = aula.aula_permissoes.length > 0
  
  return {
    pode_assistir: temPermissao,
    motivo: temPermissao ? undefined : "Esta aula requer permissão específica do instrutor"
  }
}
```

### **2. API de Listagem com Permissões:**
```typescript
// GET /api/cursos/[id]/aulas?aluno_id=xxx
{
  "modulos": [
    {
      "id": "mod1",
      "titulo": "Fundamentos",
      "aulas": [
        {
          "id": "aula1",
          "titulo": "Introdução",
          "privada": false,
          "pode_assistir": true
        },
        {
          "id": "aula2", 
          "titulo": "Hooks Avançados",
          "privada": true,
          "pode_assistir": false,
          "motivo_bloqueio": "Esta aula requer permissão específica do instrutor"
        },
        {
          "id": "aula3",
          "titulo": "Performance",
          "privada": true,
          "pode_assistir": true, // ← Tem permissão específica!
          "concedida_por": "Prof. João Silva"
        }
      ]
    }
  ]
}
```

### **3. APIs para Gerenciar Permissões:**
```typescript
// POST /api/aulas/[id]/permissoes
// Dar permissão para aluno específico
{
  "aluno_id": "uuid-do-aluno",
  "instrutor_id": "uuid-do-instrutor"
}

// DELETE /api/aulas/[id]/permissoes/[aluno_id]
// Remover permissão de aluno específico

// GET /api/aulas/[id]/permissoes
// Listar todos os alunos com permissão nesta aula
```

## 🎯 **Dashboard do Instrutor:**

### **Funcionalidade 1: Gerenciar Alunos do Curso (EXISTENTE)**
```
┌─────────────────────────────────────────────────┐
│ 👥 Alunos Matriculados: React Avançado         │
├─────────────────────────────────────────────────┤
│ • João Silva        [Remover do Curso]         │
│ • Maria Santos      [Remover do Curso]         │
│ • Pedro Costa       [Remover do Curso]         │
│ • Ana Oliveira      [Remover do Curso]         │
│                                                 │
│ [+ Adicionar Aluno por Email]                  │
└─────────────────────────────────────────────────┘
```

### **Funcionalidade 2: Gerenciar Permissões de Aula (NOVA) ⭐**
```
┌─────────────────────────────────────────────────┐
│ 🔒 Aula: "Hooks Avançados" (Privada)           │
├─────────────────────────────────────────────────┤
│                                                 │
│ ✅ Alunos com Permissão (2):                   │
│ • Ana Oliveira      [Remover Permissão]        │
│ • Carlos Lima       [Remover Permissão]        │
│                                                 │
│ ❌ Alunos sem Permissão (2):                   │
│ • João Silva        [Dar Permissão]            │
│ • Maria Santos      [Dar Permissão]            │
│                                                 │
│ 📊 Total matriculados no curso: 4              │
└─────────────────────────────────────────────────┘
```

### **Funcionalidade 3: Visão Geral das Aulas**
```
┌─────────────────────────────────────────────────┐
│ 📚 Minhas Aulas - Visão Geral                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ ✅ Aula 1: Introdução (Pública)                │
│    👥 Todos os alunos podem ver (4/4)          │
│                                                 │
│ 🔒 Aula 2: Hooks Avançados (Privada)           │
│    👥 2 de 4 alunos têm permissão              │
│    [Gerenciar Permissões]                      │
│                                                 │
│ ✅ Aula 3: Context API (Pública)               │
│    👥 Todos os alunos podem ver (4/4)          │
│                                                 │
│ 🔒 Aula 4: Performance (Privada)               │
│    👥 0 de 4 alunos têm permissão              │
│    [Gerenciar Permissões]                      │
└─────────────────────────────────────────────────┘
```

## 📊 **Comparação de Abordagens:**

| Abordagem | Escalabilidade | Performance | Flexibilidade | Manutenção |
|-----------|----------------|-------------|---------------|------------|
| **Tabela Relacionamento** ⭐ | ✅ Excelente | ✅ Rápida | ✅ Total | ✅ Fácil |
| Array na tabela users | ❌ Limitada | ⚠️ Lenta | ⚠️ Média | ❌ Difícil |
| JSONB na tabela users | ⚠️ Média | ⚠️ Média | ✅ Boa | ⚠️ Média |

## 🚀 **Plano de Implementação:**

### **Fase 1: Estrutura**
1. Criar tabela `curso_alunos`
2. Migrar dados existentes de matrículas
3. Criar índices para performance

### **Fase 2: Backend**
1. APIs para verificar permissões
2. Endpoints para gerenciar alunos
3. Lógica de controle de acesso

### **Fase 3: Frontend**
1. Interface de listagem com badges
2. Player com bloqueio para aulas privadas
3. Dashboard do instrutor

## 🎯 **Recomendação Final:**

**USE A TABELA `curso_alunos`** com os campos:
- `curso_id` (UUID)
- `aluno_id` (UUID) 
- `tipo_acesso` ('matriculado' | 'convidado')
- `pode_ver_privadas` (BOOLEAN)
- `adicionado_por` (UUID - instrutor)

Esta é a solução mais **escalável, performática e flexível** para seu sistema! 🏆

## 📋 **SQL para Criar as Tabelas:**

### **Tabela 1: `curso_alunos` (Matrícula Geral)**
```sql
-- Se não existir, criar:
CREATE TABLE curso_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adicionado_por UUID REFERENCES users(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(curso_id, aluno_id)
);

-- Índices para performance
CREATE INDEX idx_curso_alunos_curso_id ON curso_alunos(curso_id);
CREATE INDEX idx_curso_alunos_aluno_id ON curso_alunos(aluno_id);
```

### **Tabela 2: `aula_permissoes` (Permissões Granulares) ⭐**
```sql
CREATE TABLE aula_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concedida_por UUID NOT NULL REFERENCES users(id), -- instrutor
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aula_id, aluno_id)
);

-- Índices para performance
CREATE INDEX idx_aula_permissoes_aula_id ON aula_permissoes(aula_id);
CREATE INDEX idx_aula_permissoes_aluno_id ON aula_permissoes(aluno_id);
CREATE INDEX idx_aula_permissoes_concedida_por ON aula_permissoes(concedida_por);
```

## 🎯 **Resumo da Nova Arquitetura:**

### **Fluxo Completo:**
1. **Instrutor cria aula** → Define `privada = true/false`
2. **Aluno se matricula no curso** → Registro em `curso_alunos`
3. **Se aula for privada** → Instrutor deve dar permissão em `aula_permissoes`
4. **Aluno tenta assistir** → Sistema verifica ambas as tabelas

### **Vantagens:**
- ✅ **Granularidade total** por aula específica
- ✅ **Mantém sistema existente** de matrícula
- ✅ **Escalável** para milhares de permissões
- ✅ **Auditável** com histórico completo
- ✅ **Flexível** para regras futuras

**Esta arquitetura atende perfeitamente à nova regra de negócio!** 🏆
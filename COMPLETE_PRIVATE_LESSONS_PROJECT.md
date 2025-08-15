# 🎯 Projeto Completo: Sistema de Aulas Privadas Híbrido

**Data:** 14/08/2025  
**Status:** 📋 **PROJETO COMPLETO - PRONTO PARA IMPLEMENTAÇÃO**

## 🏗️ **Arquitetura Híbrida: Dois Tipos de Convite**

### **Cenário 1: Convite para Curso Completo**
- Instrutor convida aluno para o curso inteiro
- Aluno tem acesso a **TODAS** as aulas (públicas + privadas)
- Mais simples para o instrutor gerenciar

### **Cenário 2: Convite para Aulas Específicas**
- Instrutor convida aluno para aulas específicas
- Aluno tem acesso apenas às aulas selecionadas
- Controle granular máximo

## 🗄️ **Estrutura de Banco de Dados**

### **Tabela 1: `curso_alunos` (ATUALIZADA)**

```sql
CREATE TABLE curso_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo_acesso VARCHAR NOT NULL CHECK (tipo_acesso IN ('matriculado', 'convidado_curso')),
  adicionado_por UUID REFERENCES users(id), -- instrutor que adicionou
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(curso_id, aluno_id)
);

-- Índices
CREATE INDEX idx_curso_alunos_curso_id ON curso_alunos(curso_id);
CREATE INDEX idx_curso_alunos_aluno_id ON curso_alunos(aluno_id);
CREATE INDEX idx_curso_alunos_tipo_acesso ON curso_alunos(tipo_acesso);
```

### **Tabela 2: `aula_permissoes` (NOVA)**

```sql
CREATE TABLE aula_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concedida_por UUID NOT NULL REFERENCES users(id), -- instrutor
  tipo_permissao VARCHAR NOT NULL CHECK (tipo_permissao IN ('convite_especifico', 'acesso_curso')),
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aula_id, aluno_id)
);

-- Índices
CREATE INDEX idx_aula_permissoes_aula_id ON aula_permissoes(aula_id);
CREATE INDEX idx_aula_permissoes_aluno_id ON aula_permissoes(aluno_id);
CREATE INDEX idx_aula_permissoes_tipo ON aula_permissoes(tipo_permissao);
```

## 🔄 **Lógica de Acesso Completa**

### **Fluxo de Verificação:**

```typescript
async function podeAssistirAula(aulaId: string, alunoId: string): Promise<{
  pode_assistir: boolean,
  motivo?: string,
  tipo_acesso?: string
}> {
  
  // 1. Buscar dados da aula
  const aula = await getAula(aulaId)
  if (!aula) return { pode_assistir: false, motivo: "Aula não encontrada" }
  
  // 2. Verificar se está matriculado no curso
  const matricula = await getCursoAluno(aula.curso_id, alunoId)
  if (!matricula) {
    return { pode_assistir: false, motivo: "Não matriculado no curso" }
  }
  
  // 3. Se aula é pública, pode assistir
  if (!aula.privada) {
    return { pode_assistir: true, tipo_acesso: "aula_publica" }
  }
  
  // 4. Se aula é privada, verificar tipo de acesso
  
  // 4a. Se foi convidado para o curso completo
  if (matricula.tipo_acesso === 'convidado_curso') {
    return { 
      pode_assistir: true, 
      tipo_acesso: "convidado_curso",
      motivo: "Acesso total ao curso"
    }
  }
  
  // 4b. Verificar permissão específica para esta aula
  const permissaoEspecifica = await getAulaPermissao(aulaId, alunoId)
  if (permissaoEspecifica) {
    return { 
      pode_assistir: true, 
      tipo_acesso: "convite_especifico",
      motivo: "Convite específico para esta aula"
    }
  }
  
  // 4c. Sem permissão
  return { 
    pode_assistir: false, 
    motivo: "Esta aula requer convite específico do instrutor" 
  }
}
```

### **Tipos de Acesso:**

| Tipo | Descrição | Aulas Públicas | Aulas Privadas |
|------|-----------|----------------|----------------|
| `matriculado` | Aluno se inscreveu | ✅ Todas | ❌ Nenhuma |
| `convidado_curso` | Instrutor convidou para curso | ✅ Todas | ✅ **TODAS** |
| `convite_especifico` | Instrutor convidou para aulas | ✅ Todas | ✅ **Apenas as específicas** |

## 🎨 **Interface do Aluno**

### **Estrutura Visual Atualizada:**
```
📚 Curso: React Avançado
👤 Seu acesso: Convidado do Curso (Acesso Total) ← Novo badge

📁 Módulo 1: Fundamentos
  ✅ Aula 1: Introdução (pública)
  ✅ Aula 2: Hooks Básicos (pública)  
  ✅ Aula 3: Hooks Avançados (privada) ← Pode ver (convidado curso)

📁 Módulo 2: Avançado
  ✅ Aula 4: Context API (pública)
  ✅ Aula 5: Performance (privada) ← Pode ver (convidado curso)
  🔒 Aula 6: Testes (privada) ← Bloqueada (sem convite específico)
```

### **Badges de Status:**
- **🎓 Matriculado** - Aluno se inscreveu
- **⭐ Convidado do Curso** - Acesso total
- **🎯 Convite Específico** - Acesso a aulas selecionadas
- **🔒 Sem Acesso** - Aula privada bloqueada

## 🎯 **Dashboard do Instrutor**

### **Funcionalidade 1: Gerenciar Alunos do Curso**
```
┌─────────────────────────────────────────────────┐
│ 👥 Alunos do Curso: React Avançado             │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🎓 Matriculados (2):                           │
│ • João Silva        [Promover para Convidado]  │
│ • Maria Santos      [Promover para Convidado]  │
│                                                 │
│ ⭐ Convidados do Curso (1):                    │
│ • Ana Oliveira      [Rebaixar para Matriculado]│
│                                                 │
│ 🎯 Convites Específicos (1):                   │
│ • Carlos Lima       [Ver Aulas Permitidas]     │
│                                                 │
│ [+ Convidar por Email] [+ Convite Específico]  │
└─────────────────────────────────────────────────┘
```

### **Funcionalidade 2: Convite para Curso Completo**
```
┌─────────────────────────────────────────────────┐
│ ⭐ Convidar Aluno para Curso Completo           │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📧 Email do aluno:                             │
│ [joao@email.com                    ]           │
│                                                 │
│ 💬 Mensagem personalizada (opcional):          │
│ [Olá! Você foi convidado para ter acesso      │
│  completo ao meu curso de React Avançado...]   │
│                                                 │
│ ✅ Benefícios do convite:                      │
│ • Acesso a TODAS as aulas (públicas + privadas)│
│ • Sem restrições de conteúdo                   │
│ • Acesso imediato                              │
│                                                 │
│ [Cancelar]              [Enviar Convite]       │
└─────────────────────────────────────────────────┘
```

### **Funcionalidade 3: Convite para Aulas Específicas**
```
┌─────────────────────────────────────────────────┐
│ 🎯 Convidar Aluno para Aulas Específicas       │
├─────────────────────────────────────────────────┤
│                                                 │
│ 📧 Email do aluno:                             │
│ [maria@email.com                   ]           │
│                                                 │
│ 🎬 Selecionar aulas privadas:                  │
│ ☐ Módulo 1                                     │
│   ☐ Aula 3: Hooks Avançados                   │
│ ☐ Módulo 2                                     │
│   ☑ Aula 5: Performance ← Selecionada         │
│   ☐ Aula 6: Testes Avançados                  │
│ ☐ Módulo 3                                     │
│   ☑ Aula 8: Deploy ← Selecionada              │
│                                                 │
│ 💬 Mensagem personalizada:                     │
│ [Você foi convidado para aulas específicas...] │
│                                                 │
│ 📊 Resumo: 2 aulas selecionadas                │
│                                                 │
│ [Cancelar]              [Enviar Convite]       │
└─────────────────────────────────────────────────┘
```

### **Funcionalidade 4: Gerenciar Aula Específica**
```
┌─────────────────────────────────────────────────┐
│ 🔒 Aula: "Performance Avançada" (Privada)      │
├─────────────────────────────────────────────────┤
│                                                 │
│ ⭐ Convidados do Curso (acesso automático):    │
│ • Ana Oliveira      [Remover do Curso]         │
│                                                 │
│ 🎯 Convites Específicos para esta aula:       │
│ • Carlos Lima       [Remover Permissão]        │
│ • Pedro Costa       [Remover Permissão]        │
│                                                 │
│ 🎓 Matriculados sem acesso:                    │
│ • João Silva        [Dar Permissão]            │
│ • Maria Santos      [Dar Permissão]            │
│                                                 │
│ [+ Convite Específico] [+ Promover Matriculado]│
└─────────────────────────────────────────────────┘
```

## 🛠️ **APIs Necessárias**

### **1. Gerenciamento de Curso**
```typescript
// POST /api/cursos/[id]/convites/curso-completo
{
  "email": "aluno@email.com",
  "mensagem": "Você foi convidado...",
  "instrutor_id": "uuid"
}

// POST /api/cursos/[id]/convites/aulas-especificas  
{
  "email": "aluno@email.com",
  "aula_ids": ["uuid1", "uuid2", "uuid3"],
  "mensagem": "Você foi convidado para aulas específicas...",
  "instrutor_id": "uuid"
}

// PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso
{
  "tipo_acesso": "convidado_curso" | "matriculado"
}
```

### **2. Gerenciamento de Aulas**
```typescript
// POST /api/aulas/[id]/permissoes
{
  "aluno_id": "uuid",
  "instrutor_id": "uuid",
  "tipo_permissao": "convite_especifico"
}

// DELETE /api/aulas/[id]/permissoes/[aluno_id]

// GET /api/aulas/[id]/permissoes
// Lista todos com permissão nesta aula
```

### **3. Verificação de Acesso**
```typescript
// GET /api/cursos/[id]/aulas/acesso?aluno_id=uuid
{
  "aulas": [
    {
      "id": "aula1",
      "titulo": "Introdução",
      "privada": false,
      "pode_assistir": true,
      "tipo_acesso": "aula_publica"
    },
    {
      "id": "aula2", 
      "titulo": "Performance",
      "privada": true,
      "pode_assistir": true,
      "tipo_acesso": "convidado_curso",
      "motivo": "Acesso total ao curso"
    },
    {
      "id": "aula3",
      "titulo": "Testes",
      "privada": true,
      "pode_assistir": false,
      "motivo": "Requer convite específico"
    }
  ]
}
```

## 📧 **Sistema de Convites por Email**

### **Template 1: Convite para Curso Completo**
```html
<h2>🎉 Você foi convidado para um curso completo!</h2>

<p>Olá!</p>

<p><strong>Prof. João Silva</strong> convidou você para ter acesso completo ao curso:</p>

<div class="course-card">
  <h3>📚 React Avançado</h3>
  <p>✅ Acesso a TODAS as aulas (públicas + privadas)</p>
  <p>✅ Sem restrições de conteúdo</p>
  <p>✅ Acesso vitalício</p>
</div>

<p>Mensagem do instrutor:</p>
<blockquote>{{mensagem_personalizada}}</blockquote>

<a href="{{link_aceitar}}" class="btn-primary">Aceitar Convite</a>
```

### **Template 2: Convite para Aulas Específicas**
```html
<h2>🎯 Você foi convidado para aulas específicas!</h2>

<p>Olá!</p>

<p><strong>Prof. João Silva</strong> convidou você para aulas específicas do curso:</p>

<div class="course-card">
  <h3>📚 React Avançado</h3>
  <p><strong>Aulas incluídas:</strong></p>
  <ul>
    <li>🎬 Aula 5: Performance Avançada</li>
    <li>🎬 Aula 8: Deploy em Produção</li>
  </ul>
</div>

<p>Mensagem do instrutor:</p>
<blockquote>{{mensagem_personalizada}}</blockquote>

<a href="{{link_aceitar}}" class="btn-primary">Aceitar Convite</a>
```

## 🔄 **Migração de Banco de Dados**

### **Script de Migração:**
```sql
-- 1. Atualizar tabela curso_alunos existente
ALTER TABLE curso_alunos 
ADD COLUMN tipo_acesso VARCHAR DEFAULT 'matriculado' 
CHECK (tipo_acesso IN ('matriculado', 'convidado_curso'));

-- 2. Atualizar registros existentes
UPDATE curso_alunos SET tipo_acesso = 'matriculado' WHERE tipo_acesso IS NULL;

-- 3. Tornar coluna obrigatória
ALTER TABLE curso_alunos ALTER COLUMN tipo_acesso SET NOT NULL;

-- 4. Criar tabela de permissões de aula
CREATE TABLE aula_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concedida_por UUID NOT NULL REFERENCES users(id),
  tipo_permissao VARCHAR NOT NULL CHECK (tipo_permissao IN ('convite_especifico', 'acesso_curso')),
  criado_em TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(aula_id, aluno_id)
);

-- 5. Criar índices
CREATE INDEX idx_curso_alunos_tipo_acesso ON curso_alunos(tipo_acesso);
CREATE INDEX idx_aula_permissoes_aula_id ON aula_permissoes(aula_id);
CREATE INDEX idx_aula_permissoes_aluno_id ON aula_permissoes(aluno_id);
CREATE INDEX idx_aula_permissoes_tipo ON aula_permissoes(tipo_permissao);

-- 6. Criar tabela de convites pendentes
CREATE TABLE convites_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  tipo_convite VARCHAR NOT NULL CHECK (tipo_convite IN ('curso_completo', 'aulas_especificas')),
  aula_ids UUID[], -- Array de IDs para convites específicos
  enviado_por UUID NOT NULL REFERENCES users(id),
  mensagem TEXT,
  token VARCHAR UNIQUE NOT NULL,
  aceito BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT NOW(),
  expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_convites_token ON convites_pendentes(token);
CREATE INDEX idx_convites_email ON convites_pendentes(email);
```

## 🎯 **Plano de Implementação**

### **Fase 1: Backend (1-2 semanas)**
1. ✅ Migração de banco de dados
2. ✅ APIs de gerenciamento de convites
3. ✅ Lógica de verificação de acesso
4. ✅ Sistema de emails de convite
5. ✅ Testes unitários

### **Fase 2: Dashboard do Instrutor (1 semana)**
1. ✅ Interface de convite para curso completo
2. ✅ Interface de convite para aulas específicas
3. ✅ Gerenciamento de alunos por tipo
4. ✅ Visão geral de permissões por aula

### **Fase 3: Interface do Aluno (1 semana)**
1. ✅ Badges de tipo de acesso
2. ✅ Bloqueio visual de aulas privadas
3. ✅ Página de aceitar convites
4. ✅ Notificações de novo acesso

### **Fase 4: Testes e Refinamentos (1 semana)**
1. ✅ Testes de integração
2. ✅ Testes de performance
3. ✅ Ajustes de UX
4. ✅ Documentação

## 🎉 **Resumo da Solução**

### **Flexibilidade Total:**
- ✅ **Convite para curso** → Acesso total
- ✅ **Convite para aulas** → Acesso granular
- ✅ **Matrícula normal** → Apenas aulas públicas

### **Vantagens:**
- 🎯 **Controle granular** máximo
- 📈 **Escalável** para milhares de alunos
- 🔄 **Flexível** para diferentes estratégias
- 📊 **Auditável** com histórico completo
- 💼 **Comercial** - diferentes níveis de acesso

**Esta arquitetura híbrida atende a todos os cenários possíveis!** 🏆

Quer que eu prossiga com a implementação ou tem algum ajuste no projeto?
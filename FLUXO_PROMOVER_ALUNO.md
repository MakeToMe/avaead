# 🚀 Fluxo Completo: Botão "PROMOVER"

## 🎯 **O que acontece quando você clica em "PROMOVER"**

### **📱 Frontend (Componente GerenciarAlunos)**
```typescript
// 1. Usuário clica no botão "Promover"
onClick={() => alterarTipoAcesso(aluno.aluno_id, 'convidado_curso')}

// 2. Função faz requisição para API
const response = await fetch(`/api/cursos/${cursoId}/alunos/${alunoId}/tipo-acesso`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tipo_acesso: 'convidado_curso' })
});

// 3. Se sucesso, recarrega lista de alunos
if (response.ok) {
  await carregarAlunos(); // Atualiza a interface
}
```

### **🔧 Backend (API tipo-acesso/route.ts)**

#### **Passo 1: Validações**
```sql
-- Verificar se curso e aluno existem
SELECT c.id, c.titulo, c.instrutor_id, u.nome, u.email
FROM rarcursos.cursos c
CROSS JOIN rarcursos.users u
WHERE c.id = $cursoId AND u.uid = $alunoId
```

#### **Passo 2: Verificar Matrícula**
```sql
-- Buscar matrícula atual
SELECT id, tipo_acesso, aluno_id, curso_id
FROM rarcursos.matriculas
WHERE curso_id = $cursoId AND aluno_id = $alunoId
```

#### **Passo 3: Atualizar Tipo de Acesso**
```sql
-- Promover aluno (matriculado → convidado_curso)
UPDATE rarcursos.matriculas 
SET tipo_acesso = 'convidado_curso', 
    atualizado_em = NOW()
WHERE id = $matriculaId
```

#### **Passo 4: Log de Auditoria**
```sql
-- Registrar evento no sistema de auditoria
INSERT INTO rarcursos.logs_auditoria (
  tipo_evento,
  severidade,
  usuario_id,           -- Instrutor que fez a ação
  usuario_afetado_id,   -- Aluno que foi promovido
  recurso_tipo,
  recurso_id,
  detalhes,
  ip_address,
  user_agent,
  timestamp
) VALUES (
  'aluno_promovido',
  'info',
  $instrutorId,
  $alunoId,
  'matricula',
  $matriculaId,
  '{
    "curso_id": "...",
    "curso_titulo": "Logado",
    "aluno_nome": "Flávio Marcelo Guardia",
    "tipo_acesso_anterior": "matriculado",
    "tipo_acesso_novo": "convidado_curso",
    "acao": "promovido"
  }',
  $ipAddress,
  $userAgent,
  NOW()
);
```

## 🎨 **Mudanças Visuais na Interface**

### **Antes (Matriculado):**
- **Seção:** "Matriculados (1)"
- **Cor:** Azul/Indigo
- **Badge:** Nenhum
- **Botão:** "Promover" (verde)
- **Acesso:** Apenas aulas públicas

### **Depois (Convidado do Curso):**
- **Seção:** "Convidados do Curso (1)"
- **Cor:** Amarelo/Dourado
- **Badge:** "Acesso Total"
- **Ícone:** Coroa 👑
- **Botão:** "Rebaixar" (cinza)
- **Acesso:** Todas as aulas (públicas + privadas)

## 🔄 **Fluxo Reverso: Botão "REBAIXAR"**

### **Quando clicar em "Rebaixar":**
```sql
-- Rebaixar aluno (convidado_curso → matriculado)
UPDATE rarcursos.matriculas 
SET tipo_acesso = 'matriculado'
WHERE id = $matriculaId
```

### **Log de Auditoria:**
```json
{
  "tipo_evento": "aluno_rebaixado",
  "tipo_acesso_anterior": "convidado_curso",
  "tipo_acesso_novo": "matriculado",
  "acao": "rebaixado"
}
```

## 📊 **Impacto no Sistema**

### **1. Controle de Acesso às Aulas**
- **Matriculado:** Middleware bloqueia aulas privadas
- **Convidado:** Middleware permite acesso total

### **2. Sistema de Auditoria**
- **Rastreabilidade:** Quem promoveu/rebaixou quem e quando
- **Compliance:** Histórico completo de mudanças de permissão
- **Relatórios:** Métricas de promoções/rebaixamentos

### **3. Interface Dinâmica**
- **Contadores:** Atualizam automaticamente
- **Filtros:** Funcionam com novos tipos
- **Busca:** Encontra alunos em ambas as seções

## 🧪 **Como Testar**

### **1. Teste Básico:**
1. **Clique:** "Promover" no Flávio Marcelo Guardia
2. **Verifique:** Aluno move para seção "Convidados"
3. **Clique:** "Rebaixar" 
4. **Verifique:** Aluno volta para "Matriculados"

### **2. Verificar Auditoria:**
1. **Acesse:** `/admin/auditoria`
2. **Procure:** Eventos "aluno_promovido" e "aluno_rebaixado"
3. **Verifique:** Detalhes completos nos logs

### **3. Testar Controle de Acesso:**
1. **Promova** o aluno
2. **Login como aluno**
3. **Verifique:** Acesso a aulas que antes eram bloqueadas

---

**🎯 Agora você pode testar o sistema completo de promoção/rebaixamento de alunos!**
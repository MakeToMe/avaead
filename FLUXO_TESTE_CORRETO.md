# 🎯 Fluxo de Teste Correto - Sistema de Aulas Privadas

## 📍 **Estrutura Real da Aplicação**

### **Dashboard (/dashboard)**
- **Cards de resumo:** Estatísticas gerais
- **Grid de alunos:** Lista todos os alunos da plataforma
- **Função:** Visão administrativa geral

### **Meus Cursos (/meus-cursos)**
- **Lista de cursos:** Cursos que você criou
- **Opções por curso:** Editar, Excluir, Criar novo
- **Função:** Gerenciar seus cursos

## 🔍 **Onde Encontrar o Gerenciamento de Convites**

### **Opção 1: Dentro do Curso Individual**
1. **Acesse:** `/meus-cursos`
2. **Clique em:** "Editar" em um curso específico
3. **Procure por:** Aba ou seção "Alunos" ou "Gerenciar Alunos"

### **Opção 2: Página Específica do Curso**
1. **Acesse:** `/curso/[id]` (página do curso)
2. **Procure por:** Botão "Gerenciar Alunos" (se você for o instrutor)

### **Opção 3: Dashboard do Instrutor (se existir)**
1. **Acesse:** `/dashboard-instrutor` ou `/instrutor`
2. **Procure por:** Lista de cursos com opções de gerenciamento

## 🧪 **Fluxo de Teste Correto**

### **🎯 Teste 1: Localizar Interface de Convites**

#### **Passo 1: Verificar em Meus Cursos**
1. **Acesse:** `/meus-cursos`
2. **Clique em "Editar"** em qualquer curso
3. **Procure por abas:** "Alunos", "Gerenciar Alunos", "Convites"

#### **Passo 2: Verificar na Página do Curso**
1. **Acesse:** `/curso/80374430-e883-43ea-92bf-ca0b2ebde23d` (seu curso "Logado")
2. **Procure por botões:** "Gerenciar Alunos", "Enviar Convites"

#### **Passo 3: Verificar Dashboard Específico**
1. **Tente acessar:** `/dashboard-instrutor`
2. **Ou:** `/instrutor/dashboard`

### **🎯 Teste 2: Se Não Encontrar a Interface**

Vamos verificar se o componente `GerenciarAlunos` está sendo usado em algum lugar:

#### **Verificação 1: Buscar Rotas**
```bash
# Procurar por arquivos que usam GerenciarAlunos
grep -r "GerenciarAlunos" app/
```

#### **Verificação 2: Verificar Páginas de Curso**
- **Página de edição:** `/meus-cursos/[id]/editar`
- **Página do curso:** `/curso/[id]`
- **Dashboard instrutor:** `/dashboard-instrutor`

## 🔧 **Se a Interface Não Existir**

### **Cenário Provável:**
O componente `GerenciarAlunos` foi criado mas não foi integrado à interface ainda.

### **Soluções:**

#### **1. Criar Página de Gerenciamento**
Adicionar uma página específica: `/curso/[id]/alunos`

#### **2. Integrar ao Editor de Curso**
Adicionar aba "Alunos" na página de edição do curso

#### **3. Adicionar ao Dashboard**
Criar seção de gerenciamento no dashboard do instrutor

## 🚀 **Teste Alternativo (API Direta)**

Se a interface não estiver pronta, você pode testar via API:

### **1. Testar API de Convites**
```bash
# Enviar convite via API
curl -X POST http://localhost:3000/api/convites \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "cursoId": "80374430-e883-43ea-92bf-ca0b2ebde23d",
    "tipoConvite": "curso_completo",
    "mensagem": "Convite de teste",
    "enviadoPor": "db7b5806-7d5a-40d7-b049-1e55c364bf3e"
  }'
```

### **2. Verificar Convites no Banco**
```sql
SELECT * FROM rarcursos.convites_pendentes 
ORDER BY criado_em DESC;
```

## 📋 **Próximos Passos**

### **1. Identificar Localização Atual**
Vamos descobrir onde está (ou deveria estar) a interface de gerenciamento.

### **2. Se Necessário, Criar Interface**
Integrar o componente `GerenciarAlunos` em uma página acessível.

### **3. Testar Funcionalidade Completa**
Após localizar/criar a interface, seguir o fluxo completo de testes.

## 🔍 **Investigação Necessária**

Preciso verificar:
1. **Onde o componente `GerenciarAlunos` deveria ser usado**
2. **Se existe rota para gerenciamento de alunos**
3. **Como integrar à interface existente**

---

**🎯 Vamos primeiro localizar onde deveria estar a interface de gerenciamento de convites!**
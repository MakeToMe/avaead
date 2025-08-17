# 🎯 Guia de Teste Atualizado - Sistema de Aulas Privadas

## ✅ **Interface Integrada!**

Agora o gerenciamento de alunos está integrado à página de edição de cursos.

## 🚀 **Fluxo de Teste Correto**

### **🎯 Teste 1: Acessar Gerenciamento de Alunos**

1. **Acesse:** `/meus-cursos`
2. **Clique em:** "Editar" no curso "Logado" (ou qualquer curso seu)
3. **Na página de edição:** Clique na aba "Gerenciar Alunos"
4. **Resultado esperado:** Deve mostrar a interface de gerenciamento com o aluno "Flávio Marcelo Guardia"

### **🎯 Teste 2: Enviar Convite para Curso Completo**

1. **Na aba "Gerenciar Alunos"**
2. **Procure por:** Formulário de envio de convites
3. **Preencha:**
   - **Email:** `teste@exemplo.com`
   - **Tipo:** "Curso Completo"
   - **Mensagem:** "Convite para o curso completo"
4. **Clique:** "Enviar Convite"
5. **Verifique:**
   - ✅ Mensagem de sucesso
   - ✅ Convite aparece na lista "Pendentes"

### **🎯 Teste 3: Enviar Convite para Aulas Específicas**

1. **Na mesma interface**
2. **Selecione:** "Aulas Específicas"
3. **Escolha:** 2-3 aulas do curso
4. **Preencha email diferente:** `teste2@exemplo.com`
5. **Envie o convite**
6. **Verifique:** Convite criado com aulas selecionadas

### **🎯 Teste 4: Gerenciar Alunos Existentes**

1. **Na lista de alunos matriculados**
2. **Veja:** "Flávio Marcelo Guardia" como "Matriculado"
3. **Teste botões:**
   - **"Promover":** Muda para "Convidado do Curso" (acesso total)
   - **"Rebaixar":** Volta para "Matriculado" (apenas aulas públicas)

## 📍 **URLs Específicas para Teste**

### **Curso "Logado" (seu curso de teste):**
```
/meus-cursos/editar/80374430-e883-43ea-92bf-ca0b2ebde23d
```

### **Estrutura da Interface:**
- **Aba 1:** "Editar Curso" (formulário existente)
- **Aba 2:** "Gerenciar Alunos" (nova funcionalidade)

## 🔧 **Se Houver Problemas**

### **1. Erro de Importação**
Se aparecer erro sobre `GerenciarAlunos`:
```bash
# Reiniciar aplicação
pnpm dev
```

### **2. Aba não aparece**
- Limpe cache do navegador (Ctrl+F5)
- Verifique console do navegador (F12)

### **3. API não funciona**
- Verifique se todas as dependências estão instaladas:
```bash
pnpm install
```

## 📊 **Dados Esperados na Interface**

### **Alunos Matriculados:**
- **Flávio Marcelo Guardia** (guardia.dev@gmail.com)
- **Tipo:** Matriculado
- **Progresso:** 0%
- **Data:** 15/08/2025

### **Funcionalidades Disponíveis:**
- ✅ Enviar convites (curso completo)
- ✅ Enviar convites (aulas específicas)
- ✅ Alterar tipo de acesso (promover/rebaixar)
- ✅ Buscar alunos por nome/email
- ✅ Filtrar por tipo (matriculados/convidados)

## 🎉 **Próximos Testes**

Após confirmar que a interface funciona:

1. **Teste aceitar convites** (usar links gerados)
2. **Teste controle de acesso** (aulas específicas)
3. **Teste sistema de auditoria** (logs automáticos)
4. **Teste webhook de emails** (se configurado)

---

**🚀 Agora você tem acesso completo ao sistema de gerenciamento de alunos!**

### **Caminho Rápido:**
`/meus-cursos` → **Editar curso** → **Aba "Gerenciar Alunos"**
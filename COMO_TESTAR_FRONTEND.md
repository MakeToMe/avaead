# 🧪 Como Testar o Sistema no Frontend

## ✅ **Status Atual**
- ✅ Migrações do banco executadas com sucesso
- ✅ Todas as APIs criadas e funcionais
- ✅ Componentes React implementados
- ✅ Sistema de auditoria ativo
- ✅ Testes automatizados passando (100%)

## 🚀 **Passos para Testar**

### **1. Iniciar a Aplicação**
```bash
# Instalar dependências (se ainda não fez)
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev
```

### **2. Acessar a Aplicação**
- **URL:** http://localhost:3000
- **Login:** Use suas credenciais existentes
- **Perfis necessários:** Instrutor e Aluno para testes completos

### **3. Cenários de Teste Principais**

#### **🎯 Teste 1: Enviar Convite para Curso Completo**
1. **Login como instrutor**
2. **Navegue para:** Dashboard do Instrutor
3. **Selecione um curso** que você criou
4. **Clique em:** "Gerenciar Alunos"
5. **Preencha:**
   - Email: `teste@exemplo.com`
   - Tipo: "Curso Completo"
   - Mensagem: "Convite para o curso completo"
6. **Clique:** "Enviar Convite"
7. **Verifique:**
   - ✅ Mensagem de sucesso
   - ✅ Convite aparece na lista "Pendentes"
   - ✅ Email enviado (se webhook configurado)

#### **🎯 Teste 2: Enviar Convite para Aulas Específicas**
1. **Mesmo processo anterior, mas:**
2. **Selecione:** "Aulas Específicas"
3. **Escolha:** 2-3 aulas do curso
4. **Envie o convite**
5. **Verifique:** Convite criado com aulas selecionadas

#### **🎯 Teste 3: Aceitar Convite**
1. **Copie o token do convite** (da tabela ou email)
2. **Acesse:** `http://localhost:3000/convite/aceitar/[TOKEN]`
3. **Preencha dados** (se novo usuário)
4. **Aceite o convite**
5. **Verifique:**
   - ✅ Redirecionamento para "Meus Cursos"
   - ✅ Curso aparece na lista
   - ✅ Acesso correto às aulas

#### **🎯 Teste 4: Verificar Controle de Acesso**
1. **Como aluno com acesso limitado**
2. **Tente acessar aula não permitida**
3. **Verifique:** Bloqueio e mensagem de erro

#### **🎯 Teste 5: Sistema de Auditoria**
1. **Login como admin**
2. **Acesse:** `/admin/auditoria`
3. **Verifique:**
   - ✅ Logs das ações anteriores
   - ✅ Filtros funcionando
   - ✅ Detalhes completos

## 🔧 **Ferramentas de Debug**

### **Console do Navegador**
- Abra F12 → Console
- Monitore erros JavaScript
- Verifique requisições na aba Network

### **Verificar Banco de Dados**
```sql
-- Ver convites recentes
SELECT * FROM rarcursos.convites_pendentes 
ORDER BY criado_em DESC LIMIT 5;

-- Ver logs de auditoria
SELECT * FROM rarcursos.logs_auditoria 
ORDER BY timestamp DESC LIMIT 10;

-- Ver permissões de aula
SELECT * FROM rarcursos.aula_permissoes 
ORDER BY criado_em DESC LIMIT 5;
```

### **APIs para Testar Manualmente**
```bash
# Listar convites de um curso
curl "http://localhost:3000/api/convites?cursoId=SEU_CURSO_ID"

# Verificar acesso a uma aula
curl "http://localhost:3000/api/aulas/SUA_AULA_ID/verificar-acesso"
```

## 🚨 **Problemas Comuns e Soluções**

### **Erro 500 nas APIs**
```bash
# Verificar logs do servidor
# No terminal onde roda pnpm dev

# Verificar se migrações foram executadas
python verify_migration.py
```

### **Emails não enviados**
- Verifique configuração do webhook n8n
- Teste endpoint manualmente
- Confirme se webhook está ativo

### **Permissões não funcionam**
- Verifique se usuário está logado
- Confirme foreign keys no banco
- Teste com diferentes perfis de usuário

### **Interface quebrada**
- Verifique console do navegador
- Confirme se todos os componentes existem
- Recarregue a página (Ctrl+F5)

## 📊 **Métricas para Monitorar**

Durante os testes, observe:
- **Performance:** Tempo de carregamento
- **Logs:** Quantidade de registros de auditoria
- **Erros:** Console errors ou falhas de rede
- **UX:** Fluxo intuitivo para usuários
- **Responsividade:** Teste em mobile/tablet

## ✅ **Checklist de Validação**

Após completar os testes:

- [ ] ✅ Convites de curso completo funcionam
- [ ] ✅ Convites de aulas específicas funcionam  
- [ ] ✅ Aceitação de convites funciona
- [ ] ✅ Controle de acesso por aula funciona
- [ ] ✅ Sistema de auditoria registra eventos
- [ ] ✅ Emails são enviados (se configurado)
- [ ] ✅ Páginas de erro funcionam adequadamente
- [ ] ✅ Interface é intuitiva e responsiva
- [ ] ✅ Performance é aceitável
- [ ] ✅ Funciona em diferentes navegadores

## 🎯 **Dados de Teste Sugeridos**

### **Usuários**
- **Instrutor:** Usuário com perfil instrutor
- **Aluno 1:** Usuário existente para testes
- **Aluno 2:** Email novo para testar cadastro via convite

### **Cursos**
- **Curso A:** Com 5+ aulas para testes completos
- **Curso B:** Para testes de aulas específicas

### **Emails de Teste**
- `teste1@exemplo.com`
- `teste2@exemplo.com`
- `aluno.novo@exemplo.com`

## 🆘 **Suporte**

Se encontrar problemas:

1. **Consulte os logs** no console do navegador
2. **Verifique o banco** com as queries SQL fornecidas
3. **Execute os testes automatizados:** `pnpm test`
4. **Consulte a documentação:** `SISTEMA_AULAS_PRIVADAS_DOCUMENTACAO.md`

## 🎉 **Próximos Passos**

Após validar que tudo funciona:

1. **Configure o webhook n8n** para emails reais
2. **Ajuste as permissões** conforme necessário
3. **Customize a interface** para sua marca
4. **Configure monitoramento** em produção
5. **Treine os usuários** no novo sistema

---

**🚀 O sistema está pronto para uso! Boa sorte com os testes!**
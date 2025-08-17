# 🧪 Guia de Testes do Sistema de Aulas Privadas Híbrido

## 📋 Pré-requisitos

Antes de começar os testes, certifique-se de que:

✅ **Migrações executadas** - Todas as tabelas foram criadas no banco
✅ **Aplicação rodando** - `pnpm dev` executando
✅ **Usuários de teste** - Pelo menos 2 usuários cadastrados (instrutor e aluno)
✅ **Curso criado** - Pelo menos 1 curso com algumas aulas

## 🎯 Cenários de Teste

### 1. **Teste de Convites para Curso Completo**

#### 1.1 Como Instrutor - Enviar Convite
1. **Login como instrutor**
2. **Acesse:** `/dashboard-instrutor`
3. **Clique em:** "Gerenciar Alunos" no curso desejado
4. **Preencha o formulário:**
   - Email: `aluno.teste@exemplo.com`
   - Tipo: "Curso Completo"
   - Mensagem personalizada (opcional)
5. **Clique:** "Enviar Convite"
6. **Verifique:**
   - ✅ Mensagem de sucesso
   - ✅ Email enviado (check webhook n8n)
   - ✅ Convite aparece na lista "Pendentes"

#### 1.2 Como Convidado - Aceitar Convite
1. **Acesse o link do convite** (do email ou copie da tabela convites_pendentes)
2. **URL será:** `/convite/aceitar/[token]`
3. **Preencha dados de cadastro** (se novo usuário)
4. **Clique:** "Aceitar Convite"
5. **Verifique:**
   - ✅ Redirecionamento para `/meus-cursos`
   - ✅ Curso aparece na lista
   - ✅ Acesso a todas as aulas do curso

### 2. **Teste de Convites para Aulas Específicas**

#### 2.1 Como Instrutor - Convite Seletivo
1. **Login como instrutor**
2. **Acesse:** Gerenciar Alunos do curso
3. **Selecione:** "Aulas Específicas"
4. **Escolha:** 2-3 aulas específicas
5. **Envie o convite**
6. **Verifique:**
   - ✅ Convite criado com aula_ids preenchido
   - ✅ Email enviado com detalhes das aulas

#### 2.2 Como Convidado - Acesso Limitado
1. **Aceite o convite**
2. **Acesse:** `/meus-cursos`
3. **Entre no curso**
4. **Verifique:**
   - ✅ Apenas aulas selecionadas visíveis
   - ❌ Outras aulas bloqueadas/ocultas
   - ✅ Mensagem explicativa sobre acesso limitado

### 3. **Teste de Permissões de Aula**

#### 3.1 Verificar Controle de Acesso
1. **Como aluno com acesso limitado**
2. **Tente acessar:** `/aula/[id-nao-permitida]`
3. **Verifique:**
   - ❌ Redirecionamento para página de erro
   - ✅ Mensagem: "Você não tem permissão para acessar esta aula"

#### 3.2 Conceder Permissão Individual
1. **Como instrutor**
2. **Acesse:** Lista de aulas do curso
3. **Clique:** "Gerenciar Acesso" em uma aula específica
4. **Adicione um aluno** à lista de permissões
5. **Verifique:**
   - ✅ Aluno agora pode acessar a aula
   - ✅ Registro criado na tabela aula_permissoes

### 4. **Teste do Sistema de Auditoria**

#### 4.1 Verificar Logs Automáticos
1. **Execute qualquer ação** (enviar convite, aceitar, etc.)
2. **Acesse:** `/admin/auditoria` (como admin)
3. **Verifique:**
   - ✅ Logs aparecem em tempo real
   - ✅ Informações completas (usuário, ação, timestamp)
   - ✅ Detalhes em JSON corretos

#### 4.2 Filtros e Busca
1. **Na página de auditoria:**
2. **Teste filtros:**
   - Por tipo de evento
   - Por usuário
   - Por data
   - Por severidade
3. **Verifique:**
   - ✅ Filtros funcionam corretamente
   - ✅ Busca retorna resultados relevantes

### 5. **Teste de Integração com Webhook**

#### 5.1 Verificar Envio de Emails
1. **Envie um convite**
2. **Monitore o webhook n8n**
3. **Verifique:**
   - ✅ Requisição enviada para n8n
   - ✅ Email recebido pelo destinatário
   - ✅ Template correto usado
   - ✅ Links funcionais no email

## 🔧 Ferramentas de Debug

### 1. **Console do Navegador**
```javascript
// Verificar estado do usuário
console.log('User:', window.user);

// Verificar permissões
console.log('Permissions:', window.permissions);

// Debug de requisições
localStorage.setItem('debug', 'true');
```

### 2. **Verificar Banco de Dados**
```sql
-- Verificar convites pendentes
SELECT * FROM rarcursos.convites_pendentes ORDER BY criado_em DESC;

-- Verificar permissões de aula
SELECT * FROM rarcursos.aula_permissoes ORDER BY criado_em DESC;

-- Verificar logs de auditoria
SELECT * FROM rarcursos.logs_auditoria ORDER BY timestamp DESC LIMIT 10;

-- Verificar matrículas
SELECT * FROM rarcursos.matriculas WHERE tipo_acesso = 'convidado_curso';
```

### 3. **Network Tab**
- Monitore requisições para `/api/convites/`
- Verifique responses das APIs
- Confirme status codes (200, 201, 403, etc.)

## 🚨 Cenários de Erro para Testar

### 1. **Convites Expirados**
1. **Modifique no banco:** `expira_em` para data passada
2. **Tente aceitar o convite**
3. **Verifique:** Mensagem de erro apropriada

### 2. **Convites Já Aceitos**
1. **Aceite um convite**
2. **Tente usar o mesmo link novamente**
3. **Verifique:** Redirecionamento ou mensagem informativa

### 3. **Acesso Não Autorizado**
1. **Como aluno comum**
2. **Tente acessar:** `/dashboard-instrutor`
3. **Verifique:** Redirecionamento para página apropriada

### 4. **Emails Inválidos**
1. **Envie convite para email inválido**
2. **Verifique:** Validação no frontend e backend

## 📊 Métricas para Monitorar

Durante os testes, monitore:

- **Performance:** Tempo de carregamento das páginas
- **Logs:** Quantidade de logs gerados
- **Erros:** Console errors ou network failures
- **UX:** Fluxo intuitivo para o usuário
- **Responsividade:** Teste em mobile/tablet

## ✅ Checklist Final

Após completar todos os testes:

- [ ] Convites de curso completo funcionam
- [ ] Convites de aulas específicas funcionam
- [ ] Controle de acesso por aula funciona
- [ ] Sistema de auditoria registra tudo
- [ ] Emails são enviados corretamente
- [ ] Páginas de erro funcionam
- [ ] Interface é intuitiva
- [ ] Performance é aceitável
- [ ] Funciona em diferentes dispositivos

## 🆘 Problemas Comuns

### **Erro 500 nas APIs**
- Verifique logs do servidor
- Confirme se migrações foram executadas
- Teste conexão com banco

### **Emails não enviados**
- Verifique configuração do webhook n8n
- Teste endpoint manualmente
- Confirme credenciais de email

### **Permissões não funcionam**
- Verifique middleware de autenticação
- Confirme foreign keys no banco
- Teste com diferentes tipos de usuário

### **Interface quebrada**
- Verifique console do navegador
- Confirme se todos os componentes foram criados
- Teste com dados reais vs dados de teste
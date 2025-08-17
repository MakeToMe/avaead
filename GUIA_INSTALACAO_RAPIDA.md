# 🚀 Guia de Instalação Rápida - Sistema de Aulas Privadas

## ⏱️ Tempo Estimado: 15-20 minutos

### 📋 Pré-requisitos
- ✅ Projeto Next.js funcionando
- ✅ Banco PostgreSQL (Supabase)
- ✅ n8n configurado (opcional para emails)

---

## 🔧 Passo 1: Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Supabase (já existentes)
NEXT_PUBLIC_SUPABASE_URL=sua-url-supabase
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Novas variáveis para o sistema
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/convites-email
NEXT_PUBLIC_URL_BASE=https://seu-dominio.com
JWT_SECRET=sua-chave-jwt-secreta
```

---

## 🗄️ Passo 2: Executar Migração do Banco

### Opção A: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole e execute o conteúdo de `sql/criar-tabela-auditoria.sql`

### Opção B: Via CLI
```bash
# Se você tem psql instalado
psql -h seu-host -U postgres -d seu-banco -f sql/criar-tabela-auditoria.sql
```

### ✅ Verificar Migração
Execute esta query para confirmar:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'rarcursos' 
AND table_name IN ('aula_permissoes', 'convites_pendentes', 'logs_auditoria');
```

Deve retornar 3 tabelas.

---

## 📧 Passo 3: Configurar n8n (Opcional)

### Se você tem n8n:
1. Crie um novo workflow
2. Adicione um nó "Webhook"
3. Configure método POST
4. Use a URL gerada na variável `N8N_WEBHOOK_URL`
5. Adicione nós de email para processar os convites

### Se não tem n8n:
O sistema funcionará, mas emails não serão enviados automaticamente.

---

## 🧪 Passo 4: Testar o Sistema

### Teste Básico de Conectividade
```bash
# No diretório do projeto
node test-webhook-simple.js
```

### Teste Completo (Opcional)
```bash
# Executar todos os testes
node scripts/executar-testes.js
```

---

## 🎯 Passo 5: Verificar Funcionalidades

### ✅ Checklist de Verificação

#### 1. Banco de Dados
- [ ] Tabelas criadas (`aula_permissoes`, `convites_pendentes`, `logs_auditoria`)
- [ ] Coluna `tipo_acesso` adicionada à tabela `matriculas`
- [ ] Índices criados corretamente

#### 2. APIs Funcionando
Teste estas URLs (substitua os IDs):
- [ ] `GET /api/cursos/[id]/alunos` - Lista alunos
- [ ] `GET /api/aulas/[id]/verificar-acesso?usuario_id=xxx` - Verifica acesso
- [ ] `POST /api/convites/aceitar` - Aceita convites

#### 3. Interface do Usuário
- [ ] `/dashboard/cursos/[id]/alunos` - Dashboard do instrutor
- [ ] `/dashboard/aulas/[id]/permissoes` - Gerenciar permissões
- [ ] `/cursos/[id]` - Interface do aluno
- [ ] `/admin/auditoria` - Dashboard de auditoria

#### 4. Webhook n8n (se configurado)
- [ ] Webhook responde com status 200
- [ ] Emails são enviados corretamente

---

## 🚨 Resolução Rápida de Problemas

### Erro: "Tabela não encontrada"
```bash
# Verificar se migração foi executada
psql -c "SELECT COUNT(*) FROM rarcursos.aula_permissoes;"
```

### Erro: "Webhook não funciona"
```bash
# Testar conectividade
curl -X POST $N8N_WEBHOOK_URL -H "Content-Type: application/json" -d '{"teste":true}'
```

### Erro: "Permissão negada"
```sql
-- Verificar permissões do usuário do banco
GRANT ALL ON SCHEMA rarcursos TO seu_usuario;
GRANT ALL ON ALL TABLES IN SCHEMA rarcursos TO seu_usuario;
```

---

## 📱 Primeiros Passos Após Instalação

### 1. Como Instrutor
1. Acesse `/dashboard/cursos/[seu-curso-id]/alunos`
2. Clique em "Convidar para Curso Completo"
3. Digite um email de teste
4. Envie o convite

### 2. Como Aluno
1. Verifique o email enviado (ou logs se n8n não configurado)
2. Acesse o link do convite
3. Confirme a aceitação
4. Vá para `/cursos/[curso-id]` e veja suas permissões

### 3. Verificar Auditoria
1. Acesse `/admin/auditoria`
2. Veja os eventos registrados
3. Teste os filtros e exportação

---

## 🎉 Pronto!

Seu sistema de aulas privadas está funcionando! 

### 📚 Próximos Passos
- Leia a [Documentação Completa](SISTEMA_AULAS_PRIVADAS_DOCUMENTACAO.md)
- Configure templates de email no n8n
- Personalize a interface conforme sua marca
- Configure monitoramento de logs

### 🆘 Precisa de Ajuda?
- Consulte a seção [Troubleshooting](SISTEMA_AULAS_PRIVADAS_DOCUMENTACAO.md#troubleshooting)
- Verifique os logs em `/logs/auditoria-YYYY-MM-DD.log`
- Execute os testes: `node scripts/executar-testes.js`

---

**⚡ Instalação Expressa (1 comando)**

Se você quer automatizar tudo:

```bash
# Criar script de instalação automática
cat > instalar-sistema-aulas-privadas.sh << 'EOF'
#!/bin/bash
echo "🚀 Instalando Sistema de Aulas Privadas..."

# Executar migração
psql $DATABASE_URL -f sql/criar-tabela-auditoria.sql

# Testar conectividade
node test-webhook-simple.js

# Executar testes básicos
node scripts/executar-testes.js unit

echo "✅ Instalação concluída!"
echo "📖 Leia SISTEMA_AULAS_PRIVADAS_DOCUMENTACAO.md para mais detalhes"
EOF

chmod +x instalar-sistema-aulas-privadas.sh
./instalar-sistema-aulas-privadas.sh
```

**Tempo total**: ~5 minutos com script automático! 🎯
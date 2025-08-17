# Sistema Híbrido de Aulas Privadas - Documentação Completa

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Guia do Instrutor](#guia-do-instrutor)
4. [Guia do Aluno](#guia-do-aluno)
5. [APIs Disponíveis](#apis-disponíveis)
6. [Sistema de Auditoria](#sistema-de-auditoria)
7. [Configuração e Deploy](#configuração-e-deploy)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O Sistema Híbrido de Aulas Privadas permite aos instrutores controlar o acesso às aulas de seus cursos de forma granular, oferecendo duas modalidades principais:

### Tipos de Acesso

1. **Matriculado** 🎓
   - Acesso apenas a aulas públicas
   - Tipo padrão para novos alunos

2. **Convidado do Curso** 👑
   - Acesso total a todas as aulas (públicas e privadas)
   - Concedido pelo instrutor

3. **Convite Específico** 🎯
   - Acesso apenas a aulas privadas selecionadas
   - Controle granular por aula

### Funcionalidades Principais

- ✅ Convites por email (curso completo ou aulas específicas)
- ✅ Gerenciamento de permissões em tempo real
- ✅ Interface intuitiva para instrutores e alunos
- ✅ Sistema de auditoria completo
- ✅ Integração com webhook n8n para emails
- ✅ Middleware de segurança robusto

---

## 🏗️ Arquitetura do Sistema

### Estrutura do Banco de Dados

```sql
-- Extensão da tabela matriculas
ALTER TABLE matriculas ADD COLUMN tipo_acesso VARCHAR DEFAULT 'matriculado';

-- Nova tabela para permissões específicas
CREATE TABLE aula_permissoes (
  id UUID PRIMARY KEY,
  aula_id UUID REFERENCES aulas(id),
  aluno_id UUID REFERENCES users(id),
  concedida_por UUID REFERENCES users(id),
  tipo_permissao VARCHAR,
  criado_em TIMESTAMP
);

-- Tabela para convites pendentes
CREATE TABLE convites_pendentes (
  id UUID PRIMARY KEY,
  email VARCHAR,
  curso_id UUID REFERENCES cursos(id),
  tipo_convite VARCHAR,
  aula_ids UUID[],
  token VARCHAR UNIQUE,
  aceito BOOLEAN DEFAULT FALSE,
  expira_em TIMESTAMP
);
```

### Componentes Principais

```
📁 Sistema de Aulas Privadas
├── 🔧 Serviços
│   ├── ConviteService (gerenciamento de convites)
│   ├── WebhookService (integração n8n)
│   └── TokenService (tokens únicos)
├── 🛡️ Middleware
│   └── VerificacaoAcesso (controle de acesso)
├── 🎨 Componentes UI
│   ├── Dashboard Instrutor
│   ├── Interface Aluno
│   └── Componentes de Proteção
├── 📊 Auditoria
│   └── SistemaAuditoria (logs e métricas)
└── 🧪 Testes
    ├── Testes Unitários
    └── Testes de Integração
```

---

## 👨‍🏫 Guia do Instrutor

### 1. Gerenciando Alunos do Curso

#### Acessar Gerenciamento
1. Vá para `/dashboard/cursos/[id]/alunos`
2. Visualize alunos por tipo de acesso
3. Use filtros para encontrar alunos específicos

#### Promover/Rebaixar Alunos
```typescript
// Promover para Convidado do Curso
PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso
{
  "tipo_acesso": "convidado_curso"
}

// Rebaixar para Matriculado
PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso
{
  "tipo_acesso": "matriculado"
}
```

### 2. Enviando Convites

#### Convite para Curso Completo
1. Clique em "Convidar para Curso Completo"
2. Digite o email do aluno
3. Adicione mensagem personalizada (opcional)
4. Envie o convite

**Resultado**: Aluno terá acesso a todas as aulas do curso.

#### Convite para Aulas Específicas
1. Clique em "Convidar para Aulas Específicas"
2. Digite o email do aluno
3. Selecione as aulas privadas desejadas
4. Adicione mensagem personalizada (opcional)
5. Envie o convite

**Resultado**: Aluno terá acesso apenas às aulas selecionadas.

### 3. Gerenciando Permissões de Aulas

#### Acessar Gerenciamento de Aula
1. Vá para `/dashboard/aulas/[id]/permissoes`
2. Visualize alunos com e sem acesso
3. Conceda ou remova permissões individuais

#### Conceder Permissão Específica
```typescript
POST /api/aulas/[id]/permissoes
{
  "aluno_id": "uuid-do-aluno",
  "tipo_permissao": "convite_especifico"
}
```

#### Remover Permissão
```typescript
DELETE /api/aulas/[id]/permissoes/[aluno_id]
```

### 4. Boas Práticas para Instrutores

#### ✅ Recomendações
- **Organize por Módulos**: Agrupe aulas relacionadas antes de enviar convites específicos
- **Use Mensagens Claras**: Explique o motivo do convite na mensagem personalizada
- **Monitore Regularmente**: Verifique quem está acessando suas aulas privadas
- **Promova Gradualmente**: Comece com convites específicos antes de dar acesso total

#### ⚠️ Cuidados
- **Não Spam**: Evite enviar muitos convites para o mesmo aluno
- **Verifique Emails**: Confirme se o email está correto antes de enviar
- **Revise Permissões**: Periodicamente revise quem tem acesso às suas aulas
- **Backup de Dados**: Mantenha registro dos alunos importantes

---

## 🎓 Guia do Aluno

### 1. Entendendo Seu Acesso

#### Tipos de Badge na Interface
- 🟢 **Pública**: Todos os matriculados têm acesso
- 🟡 **Acesso Total**: Você foi convidado para o curso completo
- 🟣 **Convite Específico**: Acesso concedido pelo instrutor
- 🔴 **Bloqueada**: Entre em contato com o instrutor

### 2. Aceitando Convites

#### Processo de Aceitação
1. **Receba o Email**: Verifique sua caixa de entrada
2. **Clique no Link**: Use o link único do convite
3. **Confirme Aceitação**: Será redirecionado automaticamente
4. **Acesse o Curso**: Suas permissões são ativadas imediatamente

#### Problemas Comuns
- **Link Expirado**: Convites expiram em 7 dias
- **Email não Recebido**: Verifique spam/lixo eletrônico
- **Erro ao Aceitar**: Entre em contato com o instrutor

### 3. Navegando pela Interface

#### Página do Curso
- **Resumo de Acesso**: Veja seu tipo de acesso no topo
- **Lista de Aulas**: Badges indicam seu nível de acesso
- **Progresso**: Acompanhe seu avanço no curso

#### Aulas Bloqueadas
- **Ícone de Cadeado**: Indica aula privada sem acesso
- **Mensagem Explicativa**: Mostra como obter acesso
- **Botão de Contato**: Link para falar com o instrutor

### 4. Dicas para Alunos

#### 📚 Maximizando o Aprendizado
- **Explore Aulas Públicas**: Sempre disponíveis para matriculados
- **Solicite Acesso**: Peça ao instrutor acesso a aulas específicas
- **Participe Ativamente**: Demonstre interesse para receber mais convites
- **Mantenha Contato**: Comunique-se regularmente com o instrutor

---

## 🔌 APIs Disponíveis

### Convites

#### Enviar Convite para Curso Completo
```http
POST /api/cursos/[id]/convites/curso-completo
Content-Type: application/json

{
  "email": "aluno@exemplo.com",
  "mensagem": "Bem-vindo ao curso!",
  "instrutor_id": "uuid-instrutor"
}
```

#### Enviar Convite para Aulas Específicas
```http
POST /api/cursos/[id]/convites/aulas-especificas
Content-Type: application/json

{
  "email": "aluno@exemplo.com",
  "aula_ids": ["uuid-aula-1", "uuid-aula-2"],
  "mensagem": "Acesso às aulas selecionadas",
  "instrutor_id": "uuid-instrutor"
}
```

#### Aceitar Convite
```http
POST /api/convites/aceitar
Content-Type: application/json

{
  "token": "token-do-convite"
}
```

### Permissões

#### Verificar Acesso a Aula
```http
GET /api/aulas/[id]/verificar-acesso?usuario_id=uuid-usuario
```

#### Listar Aulas com Acesso
```http
GET /api/cursos/[id]/aulas/acesso?aluno_id=uuid-aluno
```

#### Conceder Permissão Específica
```http
POST /api/aulas/[id]/permissoes
Content-Type: application/json

{
  "aluno_id": "uuid-aluno",
  "tipo_permissao": "convite_especifico"
}
```

### Gerenciamento

#### Alterar Tipo de Acesso
```http
PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso
Content-Type: application/json

{
  "tipo_acesso": "convidado_curso"
}
```

#### Listar Alunos do Curso
```http
GET /api/cursos/[id]/alunos
```

### Códigos de Resposta

| Código | Significado | Descrição |
|--------|-------------|-----------|
| 200 | OK | Operação realizada com sucesso |
| 400 | Bad Request | Dados inválidos ou faltando |
| 403 | Forbidden | Sem permissão para a operação |
| 404 | Not Found | Recurso não encontrado |
| 500 | Internal Error | Erro interno do servidor |

---

## 📊 Sistema de Auditoria

### Eventos Rastreados

#### Convites
- `convite_enviado`: Quando instrutor envia convite
- `convite_aceito`: Quando aluno aceita convite
- `convite_expirado`: Quando convite expira

#### Permissões
- `permissao_concedida`: Permissão específica concedida
- `permissao_removida`: Permissão específica removida
- `tipo_acesso_alterado`: Mudança de tipo de acesso

#### Acesso
- `acesso_aula_permitido`: Acesso autorizado a aula
- `acesso_aula_negado`: Tentativa de acesso negada
- `conteudo_aula_acessado`: Conteúdo da aula visualizado

### Dashboard de Auditoria

#### Acessar Dashboard
1. Vá para `/admin/auditoria`
2. Use filtros para refinar a busca
3. Exporte relatórios em CSV

#### Métricas Disponíveis
- **Eventos por Dia**: Atividade diária do sistema
- **Usuários Ativos**: Usuários que realizaram ações
- **Eventos Críticos**: Problemas que requerem atenção
- **Tipos de Eventos**: Distribuição por categoria

### Configuração de Logs

#### Níveis de Severidade
- `info`: Operações normais
- `warning`: Situações que merecem atenção
- `error`: Erros que afetam funcionalidade
- `critical`: Problemas graves de segurança

#### Retenção de Dados
```sql
-- Limpar logs com mais de 1 ano
SELECT rarcursos.limpar_logs_auditoria_antigos(365);
```

---

## ⚙️ Configuração e Deploy

### Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# n8n Webhook
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/convites-email
NEXT_PUBLIC_URL_BASE=https://seu-dominio.com

# JWT
JWT_SECRET=sua-chave-secreta-jwt
```

### Migração do Banco de Dados

#### 1. Executar Script Principal
```sql
-- Execute o arquivo: sql/criar-tabela-auditoria.sql
\i sql/criar-tabela-auditoria.sql
```

#### 2. Verificar Migração
```sql
-- Verificar se tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'rarcursos' 
AND table_name IN ('aula_permissoes', 'convites_pendentes', 'logs_auditoria');
```

### Configuração do n8n

#### 1. Criar Webhook
1. Adicione um nó "Webhook" no n8n
2. Configure método POST
3. Use a URL gerada na variável `N8N_WEBHOOK_URL`

#### 2. Processar Dados
```javascript
// Exemplo de processamento no n8n
const payload = $json;

if (payload.tipo === 'convite_curso_completo') {
  // Enviar email de convite para curso completo
  return {
    to: payload.destinatario.email,
    subject: `Convite para ${payload.curso.titulo}`,
    html: templateCursoCompleto(payload)
  };
}
```

### Deploy em Produção

#### 1. Checklist Pré-Deploy
- [ ] Variáveis de ambiente configuradas
- [ ] Migração do banco executada
- [ ] Webhook n8n funcionando
- [ ] Testes passando
- [ ] Logs de auditoria ativos

#### 2. Monitoramento
- **Logs de Aplicação**: Verifique erros no console
- **Métricas de Auditoria**: Monitore atividade suspeita
- **Performance**: Acompanhe tempo de resposta das APIs
- **Webhook**: Confirme entrega de emails

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Convites Não São Enviados

**Sintomas**: Convite salvo no banco mas email não chega

**Soluções**:
```bash
# Verificar webhook n8n
curl -X POST $N8N_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"tipo":"teste_conexao"}'

# Verificar logs do sistema
tail -f logs/auditoria-$(date +%Y-%m-%d).log
```

#### 2. Acesso Negado Inesperado

**Sintomas**: Aluno deveria ter acesso mas é bloqueado

**Diagnóstico**:
```sql
-- Verificar matrícula
SELECT * FROM matriculas 
WHERE aluno_id = 'uuid-aluno' AND curso_id = 'uuid-curso';

-- Verificar permissões específicas
SELECT * FROM aula_permissoes 
WHERE aluno_id = 'uuid-aluno' AND aula_id = 'uuid-aula';
```

#### 3. Performance Lenta

**Sintomas**: APIs demoram para responder

**Otimizações**:
```sql
-- Verificar índices
EXPLAIN ANALYZE SELECT * FROM logs_auditoria 
WHERE usuario_id = 'uuid' AND timestamp >= NOW() - INTERVAL '7 days';

-- Recriar estatísticas
ANALYZE logs_auditoria;
ANALYZE aula_permissoes;
```

#### 4. Logs de Auditoria Não Funcionam

**Sintomas**: Eventos não aparecem no dashboard

**Verificações**:
```typescript
// Testar sistema de auditoria
import { sistemaAuditoria } from '@/lib/auditoria/sistema-auditoria';

await sistemaAuditoria.registrarEvento({
  tipo_evento: 'teste_sistema',
  severidade: 'info',
  recurso_tipo: 'sistema',
  detalhes: { teste: true }
});
```

### Logs Úteis

#### Verificar Atividade de Usuário
```sql
SELECT * FROM v_relatorio_auditoria 
WHERE usuario_email = 'usuario@exemplo.com' 
AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

#### Monitorar Convites
```sql
SELECT 
  cp.*,
  u.nome as instrutor_nome,
  c.titulo as curso_titulo
FROM convites_pendentes cp
JOIN users u ON cp.enviado_por = u.id
JOIN cursos c ON cp.curso_id = c.id
WHERE cp.aceito = false
AND cp.expira_em > NOW()
ORDER BY cp.criado_em DESC;
```

#### Verificar Performance
```sql
SELECT 
  tipo_evento,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (criado_em - timestamp))) as tempo_processamento
FROM logs_auditoria 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY tipo_evento
ORDER BY total DESC;
```

---

## 📞 Suporte

### Contatos
- **Documentação Técnica**: Este arquivo
- **Logs do Sistema**: `/logs/auditoria-YYYY-MM-DD.log`
- **Dashboard de Auditoria**: `/admin/auditoria`

### Recursos Adicionais
- **Testes**: Execute `node scripts/executar-testes.js`
- **Webhook n8n**: Consulte `N8N_WEBHOOK_DOCUMENTATION.md`
- **Migração**: Veja `sql/criar-tabela-auditoria.sql`

---

**Versão**: 1.0  
**Última Atualização**: Janeiro 2025  
**Compatibilidade**: Next.js 15+, Supabase, PostgreSQL 15+
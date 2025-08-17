# Documentação do Webhook n8n para Sistema de Convites

## 📋 Visão Geral

Este documento descreve como configurar o n8n para receber e processar convites do sistema de aulas privadas híbrido.

## 🔗 Configuração do Webhook

### 1. URL do Webhook
Configure a variável de ambiente no sistema:
```env
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/convites-email
```

### 2. Método HTTP
- **Método**: POST
- **Content-Type**: application/json

## 📦 Estrutura dos Payloads

### Convite para Curso Completo

```json
{
  "tipo": "convite_curso_completo",
  "destinatario": {
    "email": "aluno@exemplo.com",
    "nome": "João Silva"
  },
  "curso": {
    "id": "curso-123",
    "titulo": "Curso de React Avançado",
    "instrutor": "Maria Santos",
    "instrutor_email": "maria@exemplo.com"
  },
  "convite": {
    "token": "1a2b3c4d_abcdef1234567890",
    "link_aceitar": "https://saber365.app/convites/aceitar/1a2b3c4d_abcdef1234567890",
    "mensagem_personalizada": "Bem-vindo ao nosso curso!",
    "data_envio": "2025-01-15T10:30:00.000Z",
    "data_expiracao": "2025-01-22T10:30:00.000Z"
  }
}
```

### Convite para Aulas Específicas

```json
{
  "tipo": "convite_aulas_especificas",
  "destinatario": {
    "email": "aluno@exemplo.com",
    "nome": "João Silva"
  },
  "curso": {
    "id": "curso-456",
    "titulo": "Curso de Node.js",
    "instrutor": "Carlos Lima",
    "instrutor_email": "carlos@exemplo.com"
  },
  "aulas": [
    {
      "id": "aula-1",
      "titulo": "Introdução ao Express",
      "descricao": "Configuração inicial do servidor",
      "duracao": 1800
    },
    {
      "id": "aula-2",
      "titulo": "Middleware e Rotas",
      "descricao": "Criando APIs RESTful",
      "duracao": 2400
    }
  ],
  "convite": {
    "token": "5e6f7g8h_fedcba0987654321",
    "link_aceitar": "https://saber365.app/convites/aceitar/5e6f7g8h_fedcba0987654321",
    "mensagem_personalizada": "Acesso às aulas selecionadas!",
    "data_envio": "2025-01-15T14:20:00.000Z",
    "data_expiracao": "2025-01-22T14:20:00.000Z"
  }
}
```

### Teste de Conexão

```json
{
  "tipo": "teste_conexao",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

## 🎨 Templates de Email Sugeridos

### Template para Curso Completo

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite para Curso Completo</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .course-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .badge { background: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Você foi convidado!</h1>
            <p>Acesso completo ao curso</p>
        </div>
        
        <div class="content">
            <p>Olá <strong>{{destinatario.nome}}</strong>,</p>
            
            <p>Você recebeu um convite especial do instrutor <strong>{{curso.instrutor}}</strong> para ter acesso completo ao curso:</p>
            
            <div class="course-info">
                <h3>{{curso.titulo}}</h3>
                <p><span class="badge">ACESSO TOTAL</span></p>
                <p>Com este convite, você terá acesso a <strong>todas as aulas</strong> do curso, incluindo conteúdo exclusivo e aulas privadas.</p>
                
                {{#if convite.mensagem_personalizada}}
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <strong>Mensagem do instrutor:</strong><br>
                    "{{convite.mensagem_personalizada}}"
                </div>
                {{/if}}
            </div>
            
            <div style="text-align: center;">
                <a href="{{convite.link_aceitar}}" class="button">
                    ✅ Aceitar Convite
                </a>
            </div>
            
            <p><strong>⏰ Importante:</strong> Este convite expira em <strong>7 dias</strong> ({{convite.data_expiracao}}).</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <h4>🚀 O que você terá acesso:</h4>
            <ul>
                <li>✅ Todas as aulas públicas</li>
                <li>✅ Todas as aulas privadas</li>
                <li>✅ Materiais complementares</li>
                <li>✅ Suporte do instrutor</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Este é um email automático. Se você não esperava este convite, pode ignorá-lo.</p>
            <p>© 2025 Saber365 - Plataforma de Ensino Online</p>
        </div>
    </div>
</body>
</html>
```

### Template para Aulas Específicas

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite para Aulas Específicas</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #FF6B6B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .course-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f093fb; }
        .aula-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 3px solid #FF6B6B; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .badge { background: #FF6B6B; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .duracao { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Convite Especial!</h1>
            <p>Acesso a aulas selecionadas</p>
        </div>
        
        <div class="content">
            <p>Olá <strong>{{destinatario.nome}}</strong>,</p>
            
            <p>Você recebeu um convite do instrutor <strong>{{curso.instrutor}}</strong> para acessar aulas específicas do curso:</p>
            
            <div class="course-info">
                <h3>{{curso.titulo}}</h3>
                <p><span class="badge">ACESSO SELETIVO</span></p>
                
                {{#if convite.mensagem_personalizada}}
                <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <strong>Mensagem do instrutor:</strong><br>
                    "{{convite.mensagem_personalizada}}"
                </div>
                {{/if}}
                
                <h4>📚 Aulas incluídas neste convite:</h4>
                {{#each aulas}}
                <div class="aula-item">
                    <h5>{{titulo}}</h5>
                    {{#if descricao}}<p>{{descricao}}</p>{{/if}}
                    {{#if duracao}}<p class="duracao">⏱️ Duração: {{duracao}} minutos</p>{{/if}}
                </div>
                {{/each}}
            </div>
            
            <div style="text-align: center;">
                <a href="{{convite.link_aceitar}}" class="button">
                    ✅ Aceitar Convite
                </a>
            </div>
            
            <p><strong>⏰ Importante:</strong> Este convite expira em <strong>7 dias</strong> ({{convite.data_expiracao}}).</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p><strong>ℹ️ Sobre este convite:</strong></p>
            <ul>
                <li>✅ Acesso apenas às aulas listadas acima</li>
                <li>✅ Materiais relacionados às aulas</li>
                <li>✅ Suporte do instrutor para essas aulas</li>
                <li>❌ Outras aulas do curso requerem convite separado</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Este é um email automático. Se você não esperava este convite, pode ignorá-lo.</p>
            <p>© 2025 Saber365 - Plataforma de Ensino Online</p>
        </div>
    </div>
</body>
</html>
```

## ⚙️ Configuração no n8n

### 1. Webhook Node
- **Método**: POST
- **Path**: `/webhook/convites-email`
- **Response Mode**: Respond to Webhook

### 2. Switch Node (Baseado no tipo)
Condições:
- `{{$json.tipo}} === "convite_curso_completo"`
- `{{$json.tipo}} === "convite_aulas_especificas"`
- `{{$json.tipo}} === "teste_conexao"`

### 3. Email Nodes
Configure um node de email para cada tipo de convite usando os templates acima.

### 4. Variáveis de Template
Use as seguintes variáveis nos templates:
- `{{destinatario.email}}`
- `{{destinatario.nome}}`
- `{{curso.titulo}}`
- `{{curso.instrutor}}`
- `{{convite.link_aceitar}}`
- `{{convite.mensagem_personalizada}}`
- `{{convite.data_expiracao}}`
- `{{aulas}}` (array, apenas para aulas específicas)

## 🧪 Testando a Integração

### 1. Teste de Conexão
Execute no terminal do projeto:
```bash
node test-webhook-convites.js
```

### 2. Teste Manual
Envie um POST para o webhook com payload de exemplo:
```bash
curl -X POST https://seu-n8n.com/webhook/convites-email \
  -H "Content-Type: application/json" \
  -d '{"tipo":"teste_conexao","timestamp":"2025-01-15T12:00:00.000Z"}'
```

## 🔒 Segurança

### Recomendações:
1. **HTTPS**: Use sempre HTTPS para o webhook
2. **Validação**: Valide o formato dos dados recebidos
3. **Rate Limiting**: Configure limite de requisições
4. **Logs**: Mantenha logs das requisições para auditoria
5. **Autenticação**: Considere adicionar token de autenticação se necessário

## 📊 Monitoramento

### Métricas Importantes:
- Taxa de sucesso de envio de emails
- Tempo de resposta do webhook
- Erros de processamento
- Taxa de aceitação de convites

### Logs Recomendados:
- Timestamp da requisição
- Tipo de convite
- Email destinatário
- Status do envio
- Erros (se houver)

## 🆘 Troubleshooting

### Problemas Comuns:

1. **Webhook não recebe dados**
   - Verificar URL configurada
   - Verificar conectividade de rede
   - Verificar logs do n8n

2. **Email não é enviado**
   - Verificar configuração SMTP
   - Verificar templates
   - Verificar dados do payload

3. **Template com erro**
   - Verificar sintaxe do template
   - Verificar variáveis disponíveis
   - Testar com dados de exemplo

### Contato para Suporte:
Em caso de problemas, verifique os logs do sistema e do n8n para identificar a causa do erro.
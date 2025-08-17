# 🚀 Guia de Deploy na VPS - Avaead

## 📊 Situação Atual
- **Servidor:** VPS com PM2
- **Projeto atual:** `/var/www/ead` (projeto antigo)
- **Processo PM2:** `ead` (ID: 3)
- **Novo projeto:** GitHub `feature/auth-improvements-2025-01-06`

## 🔄 Processo de Deploy

### 1️⃣ **Backup e Preparação**

```bash
# 1. Conectar na VPS
ssh root@rarserver

# 2. Fazer backup do projeto atual (segurança)
cd /var/www
cp -r ead ead_backup_$(date +%Y%m%d_%H%M%S)

# 3. Verificar status do PM2
pm2 status
pm2 show ead
```

### 2️⃣ **Parar o Serviço Atual**

```bash
# Parar o processo atual
pm2 stop ead

# Verificar se parou
pm2 status
```

### 3️⃣ **Remover Projeto Antigo**

```bash
# Entrar no diretório
cd /var/www

# Remover projeto antigo (cuidado!)
rm -rf ead

# Verificar se foi removido
ls -la
```

### 4️⃣ **Clonar Novo Projeto**

```bash
# Clonar o repositório atualizado
git clone https://github.com/MakeToMe/avaead.git ead

# Entrar no diretório
cd ead

# Mudar para a branch correta
git checkout feature/auth-improvements-2025-01-06

# Verificar se está na branch correta
git branch -a
git log --oneline -5
```

### 5️⃣ **Configurar Ambiente**

```bash
# Copiar arquivo de ambiente
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

**Variáveis importantes para configurar:**
```env
# Database
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://seu-dominio.com"

# MinIO/Storage
MINIO_ENDPOINT="..."
MINIO_ACCESS_KEY="..."
MINIO_SECRET_KEY="..."

# Environment
NODE_ENV="production"
```

### 6️⃣ **Instalar Dependências**

```bash
# Verificar se pnpm está instalado
pnpm --version

# Se não estiver instalado:
npm install -g pnpm

# Instalar dependências
pnpm install

# Verificar se instalou corretamente
ls -la node_modules
```

### 7️⃣ **Build do Projeto**

```bash
# Fazer build de produção
pnpm run build

# Verificar se o build foi bem-sucedido
ls -la .next
```

### 8️⃣ **Configurar PM2**

```bash
# Remover configuração antiga do PM2
pm2 delete ead

# Iniciar novo projeto
pm2 start npm --name "ead" -- start

# Ou usar configuração específica:
pm2 start "pnpm start" --name "ead"

# Verificar status
pm2 status
pm2 logs ead
```

### 9️⃣ **Configuração PM2 Avançada (Opcional)**

Criar arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ead',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/ead',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

```bash
# Usar configuração do ecosystem
pm2 start ecosystem.config.js
```

### 🔟 **Verificações Finais**

```bash
# Verificar se está rodando
pm2 status
pm2 logs ead --lines 50

# Testar se o site está respondendo
curl http://localhost:3000

# Salvar configuração do PM2
pm2 save
pm2 startup
```

## 🔧 **Comandos de Troubleshooting**

### Se der erro no build:
```bash
# Limpar cache
pnpm store prune
rm -rf node_modules .next
pnpm install
pnpm run build
```

### Se der erro de permissões:
```bash
# Ajustar permissões
chown -R root:root /var/www/ead
chmod -R 755 /var/www/ead
```

### Se der erro de porta:
```bash
# Verificar o que está usando a porta 3000
netstat -tulpn | grep :3000
lsof -i :3000

# Matar processo se necessário
kill -9 <PID>
```

### Logs úteis:
```bash
# Logs do PM2
pm2 logs ead
pm2 logs ead --lines 100

# Logs do sistema
journalctl -u pm2-root
```

## 🌐 **Configuração do Nginx (se aplicável)**

Se estiver usando Nginx como proxy reverso:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ✅ **Checklist Final**

- [ ] Backup do projeto antigo criado
- [ ] Projeto antigo removido
- [ ] Novo projeto clonado na branch correta
- [ ] Arquivo .env configurado
- [ ] Dependências instaladas
- [ ] Build realizado com sucesso
- [ ] PM2 configurado e rodando
- [ ] Site acessível via browser
- [ ] Logs sem erros críticos
- [ ] PM2 salvo e configurado para auto-start

## 🆘 **Em Caso de Problemas**

Se algo der errado, você pode restaurar o backup:

```bash
# Parar novo projeto
pm2 stop ead
pm2 delete ead

# Restaurar backup
cd /var/www
rm -rf ead
cp -r ead_backup_YYYYMMDD_HHMMSS ead
cd ead

# Reiniciar projeto antigo
pm2 start npm --name "ead" -- start
```
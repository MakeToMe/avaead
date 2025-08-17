# ✅ Checklist de Deploy VPS - Avaead

## 🚀 **Opção 1: Deploy Automatizado (Recomendado)**

```bash
# 1. Conectar na VPS
ssh root@rarserver

# 2. Baixar e executar script
cd /tmp
wget https://raw.githubusercontent.com/MakeToMe/avaead/feature/auth-improvements-2025-01-06/deploy-vps.sh
chmod +x deploy-vps.sh
./deploy-vps.sh
```

## 🔧 **Opção 2: Deploy Manual**

### Pré-Deploy
- [ ] Conectado na VPS como root
- [ ] PM2 instalado e funcionando
- [ ] pnpm instalado globalmente
- [ ] Backup do projeto atual criado

### Deploy Steps
```bash
# 1. Parar serviço atual
pm2 stop ead
pm2 delete ead

# 2. Backup e limpeza
cd /var/www
cp -r ead ead_backup_$(date +%Y%m%d_%H%M%S)
rm -rf ead

# 3. Clonar novo projeto
git clone https://github.com/MakeToMe/avaead.git ead
cd ead
git checkout feature/auth-improvements-2025-01-06

# 4. Configurar ambiente
cp .env.example .env
nano .env  # Configurar variáveis

# 5. Build e deploy
pnpm install
pnpm run build
pm2 start "pnpm start" --name "ead"
pm2 save
```

## 🔍 **Verificações Pós-Deploy**

### Status da Aplicação
- [ ] `pm2 status` mostra app rodando
- [ ] `curl http://localhost:3000` responde
- [ ] Logs sem erros críticos: `pm2 logs ead`

### Funcionalidades Críticas
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Criação de cursos funciona
- [ ] Sistema de permissões funciona
- [ ] Upload de arquivos funciona

### Performance
- [ ] Tempo de resposta < 3s
- [ ] Uso de memória estável
- [ ] CPU não em 100%

## 🆘 **Em Caso de Problemas**

### Rollback Rápido
```bash
# Usar script de rollback
./rollback-vps.sh

# Ou manual:
pm2 stop ead
pm2 delete ead
cd /var/www
rm -rf ead
cp -r ead_backup_YYYYMMDD_HHMMSS ead
cd ead
pm2 start "pnpm start" --name "ead"
```

### Debug Comum
```bash
# Logs detalhados
pm2 logs ead --lines 100

# Verificar porta
netstat -tulpn | grep :3000

# Verificar processo
ps aux | grep node

# Reiniciar PM2
pm2 restart ead
```

## 📋 **Variáveis de Ambiente Importantes**

```env
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Auth
NEXTAUTH_SECRET="random-secret-key"
NEXTAUTH_URL="https://seu-dominio.com"

# MinIO
MINIO_ENDPOINT="https://minio.seu-dominio.com"
MINIO_ACCESS_KEY="access-key"
MINIO_SECRET_KEY="secret-key"
MINIO_BUCKET_NAME="avaead"

# App
NODE_ENV="production"
PORT="3000"
```

## 🔧 **Comandos Úteis Pós-Deploy**

```bash
# Monitoramento
pm2 monit                    # Monitor em tempo real
pm2 status                   # Status dos processos
pm2 logs ead                 # Logs da aplicação
pm2 logs ead --lines 50      # Últimas 50 linhas

# Controle
pm2 restart ead             # Reiniciar aplicação
pm2 reload ead              # Reload sem downtime
pm2 stop ead                # Parar aplicação
pm2 start ead               # Iniciar aplicação

# Configuração
pm2 save                     # Salvar configuração atual
pm2 startup                  # Configurar auto-start
pm2 unstartup               # Remover auto-start

# Limpeza
pm2 flush                    # Limpar logs
pm2 delete all              # Remover todos os processos
```

## 🌐 **Configuração Nginx (se aplicável)**

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
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 **Monitoramento Contínuo**

### Métricas Importantes
- **CPU**: < 80%
- **Memória**: < 1GB
- **Uptime**: > 99%
- **Response Time**: < 3s

### Alertas
```bash
# Script de monitoramento simples
#!/bin/bash
while true; do
    if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "$(date): Aplicação não responde!" >> /var/log/avaead-monitor.log
        pm2 restart ead
    fi
    sleep 60
done
```
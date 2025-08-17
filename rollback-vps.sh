#!/bin/bash

# 🔄 Script de Rollback - Avaead VPS
# Uso: ./rollback-vps.sh [backup_directory]

set -e

echo "🔄 Script de Rollback do Avaead..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    log_error "Este script deve ser executado como root"
    exit 1
fi

PROJECT_DIR="/var/www/ead"
PM2_APP_NAME="ead"

# Listar backups disponíveis
log_info "Backups disponíveis:"
ls -la /var/www/ead_backup_* 2>/dev/null || {
    log_error "Nenhum backup encontrado!"
    exit 1
}

# Se não foi especificado um backup, pedir para o usuário escolher
if [ -z "$1" ]; then
    echo ""
    read -p "Digite o nome completo do diretório de backup (ex: ead_backup_20250117_143022): " BACKUP_DIR
    BACKUP_DIR="/var/www/$BACKUP_DIR"
else
    BACKUP_DIR="$1"
fi

# Verificar se o backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup não encontrado: $BACKUP_DIR"
    exit 1
fi

log_info "Backup selecionado: $BACKUP_DIR"

# Confirmar rollback
echo ""
log_warning "ATENÇÃO: Este processo irá:"
echo "  1. Parar a aplicação atual"
echo "  2. Remover o projeto atual"
echo "  3. Restaurar o backup: $BACKUP_DIR"
echo "  4. Reiniciar a aplicação"
echo ""
read -p "Tem certeza que deseja fazer o rollback? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Rollback cancelado"
    exit 0
fi

# 1. Parar aplicação atual
log_info "Parando aplicação atual..."
if pm2 show "$PM2_APP_NAME" &> /dev/null; then
    pm2 stop "$PM2_APP_NAME"
    pm2 delete "$PM2_APP_NAME"
    log_success "Aplicação parada"
else
    log_warning "Aplicação não estava rodando"
fi

# 2. Fazer backup do estado atual (por segurança)
if [ -d "$PROJECT_DIR" ]; then
    CURRENT_BACKUP="/var/www/ead_before_rollback_$(date +%Y%m%d_%H%M%S)"
    log_info "Fazendo backup do estado atual..."
    cp -r "$PROJECT_DIR" "$CURRENT_BACKUP"
    log_success "Estado atual salvo em: $CURRENT_BACKUP"
fi

# 3. Remover projeto atual
log_info "Removendo projeto atual..."
rm -rf "$PROJECT_DIR"
log_success "Projeto atual removido"

# 4. Restaurar backup
log_info "Restaurando backup..."
cp -r "$BACKUP_DIR" "$PROJECT_DIR"
log_success "Backup restaurado"

# 5. Entrar no diretório e verificar dependências
cd "$PROJECT_DIR"

# 6. Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    log_warning "node_modules não encontrado. Instalando dependências..."
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install
    elif [ -f "package-lock.json" ]; then
        npm install
    elif [ -f "yarn.lock" ]; then
        yarn install
    else
        npm install
    fi
    log_success "Dependências instaladas"
fi

# 7. Verificar se precisa fazer build
if [ ! -d ".next" ]; then
    log_warning "Build não encontrado. Fazendo build..."
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm run build
    else
        npm run build
    fi
    log_success "Build concluído"
fi

# 8. Iniciar aplicação
log_info "Iniciando aplicação..."
if [ -f "pnpm-lock.yaml" ]; then
    pm2 start "pnpm start" --name "$PM2_APP_NAME"
else
    pm2 start "npm start" --name "$PM2_APP_NAME"
fi
log_success "Aplicação iniciada"

# 9. Verificar status
log_info "Verificando status..."
sleep 5
pm2 status

# 10. Salvar configuração
pm2 save

# 11. Testar aplicação
log_info "Testando aplicação..."
if curl -f http://localhost:3000 &> /dev/null; then
    log_success "Aplicação está respondendo na porta 3000"
else
    log_error "Aplicação não está respondendo. Verificar logs:"
    pm2 logs "$PM2_APP_NAME" --lines 20
fi

echo ""
log_success "Rollback concluído!"
echo ""
echo "📋 Informações:"
echo "  - Backup restaurado: $BACKUP_DIR"
echo "  - Estado anterior salvo em: $CURRENT_BACKUP"
echo ""
echo "🔧 Comandos úteis:"
echo "  - Ver logs: pm2 logs $PM2_APP_NAME"
echo "  - Status: pm2 status"
echo ""

# Mostrar logs finais
log_info "Últimos logs da aplicação:"
pm2 logs "$PM2_APP_NAME" --lines 10
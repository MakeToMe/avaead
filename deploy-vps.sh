#!/bin/bash

# 🚀 Script de Deploy Automatizado - Avaead VPS
# Uso: ./deploy-vps.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do Avaead na VPS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
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

# Configurações
PROJECT_DIR="/var/www/ead"
BACKUP_DIR="/var/www/ead_backup_$(date +%Y%m%d_%H%M%S)"
REPO_URL="https://github.com/MakeToMe/avaead.git"
BRANCH="feature/auth-improvements-2025-01-06"
PM2_APP_NAME="ead"

log_info "Configurações:"
echo "  - Diretório do projeto: $PROJECT_DIR"
echo "  - Backup será salvo em: $BACKUP_DIR"
echo "  - Branch: $BRANCH"
echo ""

# Confirmar com o usuário
read -p "Deseja continuar com o deploy? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Deploy cancelado pelo usuário"
    exit 0
fi

# 1. Verificar se PM2 está instalado
log_info "Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 não está instalado. Instale com: npm install -g pm2"
    exit 1
fi
log_success "PM2 encontrado"

# 2. Verificar se pnpm está instalado
log_info "Verificando pnpm..."
if ! command -v pnpm &> /dev/null; then
    log_warning "pnpm não encontrado. Instalando..."
    npm install -g pnpm
    log_success "pnpm instalado"
else
    log_success "pnpm encontrado"
fi

# 3. Fazer backup do projeto atual
if [ -d "$PROJECT_DIR" ]; then
    log_info "Fazendo backup do projeto atual..."
    cp -r "$PROJECT_DIR" "$BACKUP_DIR"
    log_success "Backup criado em: $BACKUP_DIR"
else
    log_warning "Diretório $PROJECT_DIR não existe. Criando novo projeto..."
fi

# 4. Parar processo PM2 atual
log_info "Parando processo PM2 atual..."
if pm2 show "$PM2_APP_NAME" &> /dev/null; then
    pm2 stop "$PM2_APP_NAME"
    pm2 delete "$PM2_APP_NAME"
    log_success "Processo PM2 parado e removido"
else
    log_warning "Processo PM2 '$PM2_APP_NAME' não encontrado"
fi

# 5. Remover projeto antigo
if [ -d "$PROJECT_DIR" ]; then
    log_info "Removendo projeto antigo..."
    rm -rf "$PROJECT_DIR"
    log_success "Projeto antigo removido"
fi

# 6. Clonar novo projeto
log_info "Clonando novo projeto..."
cd /var/www
git clone "$REPO_URL" ead
cd ead

# 7. Mudar para branch correta
log_info "Mudando para branch: $BRANCH"
git checkout "$BRANCH"
log_success "Branch alterada para: $BRANCH"

# 8. Verificar se .env.example existe
if [ ! -f ".env.example" ]; then
    log_error "Arquivo .env.example não encontrado!"
    exit 1
fi

# 9. Configurar arquivo .env
log_info "Configurando arquivo .env..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    log_warning "Arquivo .env criado a partir do .env.example"
    log_warning "IMPORTANTE: Configure as variáveis de ambiente em .env antes de continuar!"
    
    read -p "Deseja editar o arquivo .env agora? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nano .env
    fi
else
    log_success "Arquivo .env já existe"
fi

# 10. Instalar dependências
log_info "Instalando dependências..."
pnpm install
log_success "Dependências instaladas"

# 11. Fazer build
log_info "Fazendo build do projeto..."
pnpm run build
log_success "Build concluído"

# 12. Iniciar com PM2
log_info "Iniciando aplicação com PM2..."
pm2 start "pnpm start" --name "$PM2_APP_NAME"
log_success "Aplicação iniciada com PM2"

# 13. Verificar status
log_info "Verificando status da aplicação..."
sleep 5
pm2 status

# 14. Salvar configuração PM2
log_info "Salvando configuração PM2..."
pm2 save
log_success "Configuração PM2 salva"

# 15. Testar aplicação
log_info "Testando aplicação..."
if curl -f http://localhost:3000 &> /dev/null; then
    log_success "Aplicação está respondendo na porta 3000"
else
    log_error "Aplicação não está respondendo. Verificar logs:"
    pm2 logs "$PM2_APP_NAME" --lines 20
fi

echo ""
log_success "Deploy concluído!"
echo ""
echo "📋 Próximos passos:"
echo "  1. Verificar logs: pm2 logs $PM2_APP_NAME"
echo "  2. Monitorar status: pm2 status"
echo "  3. Testar no browser: http://seu-dominio.com"
echo ""
echo "🔧 Comandos úteis:"
echo "  - Ver logs: pm2 logs $PM2_APP_NAME"
echo "  - Reiniciar: pm2 restart $PM2_APP_NAME"
echo "  - Parar: pm2 stop $PM2_APP_NAME"
echo "  - Status: pm2 status"
echo ""
echo "💾 Backup salvo em: $BACKUP_DIR"
echo ""

# Mostrar logs finais
log_info "Últimos logs da aplicação:"
pm2 logs "$PM2_APP_NAME" --lines 10
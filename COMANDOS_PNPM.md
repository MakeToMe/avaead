# 📦 Comandos PNPM para o Sistema de Aulas Privadas

## 🚀 Comandos Principais

### **Desenvolvimento**
```bash
# Instalar dependências
pnpm install

# Executar em modo desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Executar versão de produção
pnpm start
```

### **Testes**
```bash
# Executar todos os testes automatizados
pnpm test

# Executar apenas testes unitários
pnpm test:unit

# Ver guia de testes frontend
pnpm test:frontend
```

### **Qualidade de Código**
```bash
# Executar linter
pnpm lint

# Corrigir problemas de lint automaticamente
pnpm lint --fix
```

## 🔧 Scripts Personalizados

### **Testes do Sistema**
```bash
# Teste completo do sistema
pnpm test
# Equivale a: node scripts/teste-sistema-completo.js

# Testes unitários específicos
pnpm test:unit
# Equivale a: node scripts/executar-testes.js
```

### **Desenvolvimento com Hot Reload**
```bash
# Desenvolvimento com reload automático
pnpm dev

# Desenvolvimento em porta específica
pnpm dev -- --port 3001
```

## 📊 Monitoramento

### **Verificar Dependências**
```bash
# Listar dependências instaladas
pnpm list

# Verificar dependências desatualizadas
pnpm outdated

# Atualizar dependências
pnpm update
```

### **Análise de Bundle**
```bash
# Analisar tamanho do bundle
pnpm build && pnpm analyze
```

## 🐛 Debug e Troubleshooting

### **Limpar Cache**
```bash
# Limpar cache do pnpm
pnpm store prune

# Reinstalar dependências
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### **Verificar Configuração**
```bash
# Ver configuração do pnpm
pnpm config list

# Verificar versão
pnpm --version
```

## 🚀 Fluxo de Desenvolvimento Recomendado

### **1. Setup Inicial**
```bash
# Clone o projeto
git clone [url-do-repo]
cd avaead

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas configurações
```

### **2. Desenvolvimento**
```bash
# Execute testes para verificar se tudo está funcionando
pnpm test

# Inicie o servidor de desenvolvimento
pnpm dev

# Em outro terminal, execute testes contínuos (se configurado)
pnpm test:watch
```

### **3. Antes de Commit**
```bash
# Verifique qualidade do código
pnpm lint

# Execute todos os testes
pnpm test

# Faça build para verificar se não há erros
pnpm build
```

## 🔄 Diferenças entre npm e pnpm

| Comando npm | Comando pnpm | Descrição |
|-------------|--------------|-----------|
| `npm install` | `pnpm install` | Instalar dependências |
| `npm run dev` | `pnpm dev` | Executar script dev |
| `npm run build` | `pnpm build` | Build do projeto |
| `npm run test` | `pnpm test` | Executar testes |
| `npm run lint` | `pnpm lint` | Executar linter |

## ⚡ Vantagens do pnpm

- **Mais rápido**: Instalação mais rápida que npm/yarn
- **Menos espaço**: Compartilha dependências entre projetos
- **Mais seguro**: Evita dependency hoisting issues
- **Compatível**: Funciona com package.json padrão

## 🆘 Problemas Comuns

### **Erro de permissão**
```bash
# No Windows (como admin)
pnpm config set store-dir "C:\pnpm-store"

# No Linux/Mac
sudo pnpm install -g pnpm
```

### **Dependências não encontradas**
```bash
# Limpar e reinstalar
rm -rf node_modules
pnpm install
```

### **Conflitos de versão**
```bash
# Verificar conflitos
pnpm why [nome-da-dependencia]

# Resolver conflitos
pnpm install --force
```

## 📝 Notas Importantes

- **pnpm** é totalmente compatível com projetos npm
- Todos os scripts do `package.json` funcionam normalmente
- O `pnpm-lock.yaml` é equivalente ao `package-lock.json`
- Comandos podem ser executados sem `run` (ex: `pnpm dev` em vez de `pnpm run dev`)

## 🎯 Para Testar o Sistema

```bash
# 1. Instalar dependências
pnpm install

# 2. Executar testes automatizados
pnpm test

# 3. Iniciar aplicação
pnpm dev

# 4. Seguir guia de testes manuais
# Consulte GUIA_TESTES_FRONTEND.md
```
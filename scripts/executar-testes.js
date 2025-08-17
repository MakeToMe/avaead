#!/usr/bin/env node

/**
 * Script para executar todos os testes do sistema de aulas privadas
 * 
 * Uso:
 * node scripts/executar-testes.js [tipo]
 * 
 * Tipos:
 * - unit: Apenas testes unitários
 * - integration: Apenas testes de integração
 * - all: Todos os testes (padrão)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configurações
const TIPOS_TESTE = {
  unit: 'tests/unit/**/*.test.js',
  integration: 'tests/integration/**/*.test.js',
  all: 'tests/**/*.test.js'
};

const CORES = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(cor, mensagem) {
  console.log(`${CORES[cor]}${mensagem}${CORES.reset}`);
}

function verificarPreRequisitos() {
  log('cyan', '🔍 Verificando pré-requisitos...');
  
  // Verificar se Jest está instalado
  try {
    execSync('npx jest --version', { stdio: 'pipe' });
    log('green', '✅ Jest encontrado');
  } catch (error) {
    log('red', '❌ Jest não encontrado. Instalando...');
    try {
      execSync('npm install --save-dev jest @types/jest', { stdio: 'inherit' });
      log('green', '✅ Jest instalado com sucesso');
    } catch (installError) {
      log('red', '❌ Erro ao instalar Jest');
      process.exit(1);
    }
  }

  // Verificar variáveis de ambiente
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_URL_BASE'
  ];

  const envFile = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    log('green', '✅ Arquivo .env encontrado');
  } else {
    log('yellow', '⚠️ Arquivo .env não encontrado. Alguns testes podem falhar.');
  }

  log('green', '✅ Pré-requisitos verificados\n');
}

function criarConfiguracaoJest() {
  const jestConfig = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
      'lib/**/*.{js,ts}',
      'app/api/**/*.{js,ts}',
      '!**/*.d.ts',
      '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000,
    verbose: true
  };

  const configPath = path.join(process.cwd(), 'jest.config.js');
  const configContent = `module.exports = ${JSON.stringify(jestConfig, null, 2)};`;
  
  fs.writeFileSync(configPath, configContent);
  log('green', '✅ Configuração do Jest criada');
}

function criarArquivoSetup() {
  const setupContent = `
// Setup global para testes
require('dotenv').config();

// Mock console em testes para reduzir ruído
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // Manter erros visíveis
};

// Timeout global para operações assíncronas
jest.setTimeout(30000);

// Mock do fetch global
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});
`;

  const setupPath = path.join(process.cwd(), 'tests', 'setup.js');
  
  // Criar diretório tests se não existir
  const testsDir = path.dirname(setupPath);
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  fs.writeFileSync(setupPath, setupContent);
  log('green', '✅ Arquivo de setup criado');
}

function executarTestes(tipo = 'all') {
  const padrao = TIPOS_TESTE[tipo];
  
  if (!padrao) {
    log('red', `❌ Tipo de teste inválido: ${tipo}`);
    log('yellow', `Tipos disponíveis: ${Object.keys(TIPOS_TESTE).join(', ')}`);
    process.exit(1);
  }

  log('blue', `🧪 Executando testes: ${tipo}`);
  log('cyan', `Padrão: ${padrao}\n`);

  try {
    const comando = `npx jest ${padrao} --coverage --passWithNoTests`;
    
    log('yellow', `Executando: ${comando}\n`);
    
    execSync(comando, { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    log('green', '\n✅ Todos os testes passaram!');
    
  } catch (error) {
    log('red', '\n❌ Alguns testes falharam');
    process.exit(1);
  }
}

function gerarRelatorioCobertura() {
  log('cyan', '\n📊 Gerando relatório de cobertura...');
  
  const coverageDir = path.join(process.cwd(), 'coverage');
  const htmlReport = path.join(coverageDir, 'lcov-report', 'index.html');
  
  if (fs.existsSync(htmlReport)) {
    log('green', `✅ Relatório HTML disponível em: ${htmlReport}`);
  }
  
  const lcovFile = path.join(coverageDir, 'lcov.info');
  if (fs.existsSync(lcovFile)) {
    log('green', `✅ Arquivo LCOV disponível em: ${lcovFile}`);
  }
}

function mostrarEstatisticas() {
  log('cyan', '\n📈 Estatísticas dos testes:');
  
  const unitTests = path.join(process.cwd(), 'tests', 'unit');
  const integrationTests = path.join(process.cwd(), 'tests', 'integration');
  
  let unitCount = 0;
  let integrationCount = 0;
  
  if (fs.existsSync(unitTests)) {
    unitCount = fs.readdirSync(unitTests).filter(f => f.endsWith('.test.js')).length;
  }
  
  if (fs.existsSync(integrationTests)) {
    integrationCount = fs.readdirSync(integrationTests).filter(f => f.endsWith('.test.js')).length;
  }
  
  log('blue', `📝 Testes unitários: ${unitCount} arquivos`);
  log('blue', `🔗 Testes de integração: ${integrationCount} arquivos`);
  log('blue', `📊 Total: ${unitCount + integrationCount} arquivos de teste`);
}

function main() {
  const args = process.argv.slice(2);
  const tipo = args[0] || 'all';
  
  log('bright', '🚀 Sistema de Testes - Aulas Privadas Híbrido\n');
  
  verificarPreRequisitos();
  criarConfiguracaoJest();
  criarArquivoSetup();
  mostrarEstatisticas();
  
  executarTestes(tipo);
  gerarRelatorioCobertura();
  
  log('green', '\n🎉 Execução de testes concluída!');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  executarTestes,
  verificarPreRequisitos,
  TIPOS_TESTE
};
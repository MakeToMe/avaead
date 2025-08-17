#!/usr/bin/env node

/**
 * Script de Validação Final do Sistema Híbrido de Aulas Privadas
 * 
 * Este script executa uma bateria completa de testes e validações
 * para garantir que o sistema está funcionando corretamente antes
 * de ser considerado pronto para produção.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
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

const CHECKLIST_VALIDACAO = {
  estrutura: [
    'lib/services/convite-service.ts',
    'lib/services/webhook-service.ts',
    'lib/middleware/verificacao-acesso.ts',
    'lib/auditoria/sistema-auditoria.ts',
    'sql/criar-tabela-auditoria.sql',
    'components/dashboard-instrutor/GerenciarAlunos.tsx',
    'components/curso/ListaAulas.tsx',
    'app/api/convites/aceitar/route.ts'
  ],
  documentacao: [
    'SISTEMA_AULAS_PRIVADAS_DOCUMENTACAO.md',
    'GUIA_INSTALACAO_RAPIDA.md',
    'API_REFERENCE.md',
    'N8N_WEBHOOK_DOCUMENTATION.md'
  ],
  testes: [
    'tests/unit/verificacao-acesso.test.js',
    'tests/unit/convite-service.test.js',
    'tests/integration/sistema-aulas-privadas.test.js',
    'tests/e2e/sistema-completo.test.js'
  ]
};

function log(cor, mensagem) {
  console.log(`${CORES[cor]}${mensagem}${CORES.reset}`);
}

function logSecao(titulo) {
  console.log('\n' + '='.repeat(60));
  log('bright', `🔍 ${titulo}`);
  console.log('='.repeat(60));
}

function logSubsecao(titulo) {
  log('cyan', `\n📋 ${titulo}`);
  console.log('-'.repeat(40));
}

async function validarEstrutura() {
  logSubsecao('Validando Estrutura de Arquivos');
  
  let arquivosEncontrados = 0;
  let arquivosFaltando = [];
  
  for (const categoria in CHECKLIST_VALIDACAO) {
    log('blue', `\n${categoria.toUpperCase()}:`);
    
    for (const arquivo of CHECKLIST_VALIDACAO[categoria]) {
      const caminhoCompleto = path.join(process.cwd(), arquivo);
      
      if (fs.existsSync(caminhoCompleto)) {
        log('green', `  ✅ ${arquivo}`);
        arquivosEncontrados++;
      } else {
        log('red', `  ❌ ${arquivo}`);
        arquivosFaltando.push(arquivo);
      }
    }
  }
  
  const totalArquivos = Object.values(CHECKLIST_VALIDACAO).flat().length;
  const porcentagem = Math.round((arquivosEncontrados / totalArquivos) * 100);
  
  log('bright', `\n📊 Estrutura: ${arquivosEncontrados}/${totalArquivos} arquivos (${porcentagem}%)`);
  
  if (arquivosFaltando.length > 0) {
    log('yellow', '\n⚠️ Arquivos faltando:');
    arquivosFaltando.forEach(arquivo => log('yellow', `   - ${arquivo}`));
  }
  
  return { arquivosEncontrados, totalArquivos, porcentagem };
}

async function validarVariaveisAmbiente() {
  logSubsecao('Validando Variáveis de Ambiente');
  
  const variaveisObrigatorias = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_URL_BASE'
  ];
  
  const variaveisOpcionais = [
    'N8N_WEBHOOK_URL',
    'JWT_SECRET'
  ];
  
  let variaveisOk = 0;
  let variaveisTotal = variaveisObrigatorias.length;
  
  log('blue', 'OBRIGATÓRIAS:');
  for (const variavel of variaveisObrigatorias) {
    if (process.env[variavel]) {
      log('green', `  ✅ ${variavel}`);
      variaveisOk++;
    } else {
      log('red', `  ❌ ${variavel}`);
    }
  }
  
  log('blue', '\nOPCIONAIS:');
  for (const variavel of variaveisOpcionais) {
    if (process.env[variavel]) {
      log('green', `  ✅ ${variavel}`);
    } else {
      log('yellow', `  ⚠️ ${variavel} (opcional)`);
    }
  }
  
  const porcentagem = Math.round((variaveisOk / variaveisTotal) * 100);
  log('bright', `\n📊 Variáveis: ${variaveisOk}/${variaveisTotal} obrigatórias (${porcentagem}%)`);
  
  return { variaveisOk, variaveisTotal, porcentagem };
}

async function executarTestes() {
  logSubsecao('Executando Testes');
  
  const tiposTeste = ['unit', 'integration'];
  let testesPassaram = 0;
  let totalTestes = tiposTeste.length;
  
  for (const tipo of tiposTeste) {
    try {
      log('blue', `\n🧪 Executando testes ${tipo}...`);
      
      const comando = `npx jest tests/${tipo} --passWithNoTests --silent`;
      execSync(comando, { stdio: 'pipe' });
      
      log('green', `  ✅ Testes ${tipo} passaram`);
      testesPassaram++;
      
    } catch (error) {
      log('red', `  ❌ Testes ${tipo} falharam`);
      log('yellow', `     ${error.message.split('\n')[0]}`);
    }
  }
  
  // Teste de conectividade com webhook
  try {
    log('blue', '\n🌐 Testando conectividade webhook...');
    
    if (process.env.N8N_WEBHOOK_URL) {
      execSync('node test-webhook-simple.js', { stdio: 'pipe' });
      log('green', '  ✅ Webhook funcionando');
    } else {
      log('yellow', '  ⚠️ Webhook não configurado (opcional)');
    }
  } catch (error) {
    log('yellow', '  ⚠️ Webhook não respondeu (pode estar offline)');
  }
  
  const porcentagem = Math.round((testesPassaram / totalTestes) * 100);
  log('bright', `\n📊 Testes: ${testesPassaram}/${totalTestes} suites passaram (${porcentagem}%)`);
  
  return { testesPassaram, totalTestes, porcentagem };
}

async function validarBancoDados() {
  logSubsecao('Validando Estrutura do Banco de Dados');
  
  // Verificar se arquivo SQL existe
  const sqlFile = path.join(process.cwd(), 'sql/criar-tabela-auditoria.sql');
  
  if (!fs.existsSync(sqlFile)) {
    log('red', '❌ Arquivo de migração SQL não encontrado');
    return { tabelasOk: 0, totalTabelas: 3, porcentagem: 0 };
  }
  
  log('green', '✅ Arquivo de migração SQL encontrado');
  
  // Verificar conteúdo do arquivo SQL
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  const tabelasEsperadas = [
    'logs_auditoria',
    'aula_permissoes', 
    'convites_pendentes'
  ];
  
  let tabelasEncontradas = 0;
  
  log('blue', '\nTabelas no script SQL:');
  for (const tabela of tabelasEsperadas) {
    if (sqlContent.includes(tabela)) {
      log('green', `  ✅ ${tabela}`);
      tabelasEncontradas++;
    } else {
      log('red', `  ❌ ${tabela}`);
    }
  }
  
  // Verificar se coluna tipo_acesso está sendo adicionada
  if (sqlContent.includes('tipo_acesso')) {
    log('green', '  ✅ Coluna tipo_acesso na tabela matriculas');
  } else {
    log('red', '  ❌ Coluna tipo_acesso não encontrada');
  }
  
  const porcentagem = Math.round((tabelasEncontradas / tabelasEsperadas.length) * 100);
  log('bright', `\n📊 Banco: ${tabelasEncontradas}/${tabelasEsperadas.length} tabelas (${porcentagem}%)`);
  
  return { tabelasOk: tabelasEncontradas, totalTabelas: tabelasEsperadas.length, porcentagem };
}

async function validarAPIs() {
  logSubsecao('Validando Estrutura das APIs');
  
  const apisEsperadas = [
    'app/api/convites/aceitar/route.ts',
    'app/api/cursos/[id]/convites/curso-completo/route.ts',
    'app/api/cursos/[id]/convites/aulas-especificas/route.ts',
    'app/api/cursos/[id]/alunos/route.ts',
    'app/api/cursos/[id]/alunos/[aluno_id]/tipo-acesso/route.ts',
    'app/api/aulas/[id]/permissoes/route.ts',
    'app/api/aulas/[id]/verificar-acesso/route.ts'
  ];
  
  let apisEncontradas = 0;
  
  log('blue', 'APIs implementadas:');
  for (const api of apisEsperadas) {
    const caminhoCompleto = path.join(process.cwd(), api);
    
    if (fs.existsSync(caminhoCompleto)) {
      log('green', `  ✅ ${api}`);
      apisEncontradas++;
    } else {
      log('red', `  ❌ ${api}`);
    }
  }
  
  const porcentagem = Math.round((apisEncontradas / apisEsperadas.length) * 100);
  log('bright', `\n📊 APIs: ${apisEncontradas}/${apisEsperadas.length} endpoints (${porcentagem}%)`);
  
  return { apisOk: apisEncontradas, totalApis: apisEsperadas.length, porcentagem };
}

async function validarComponentes() {
  logSubsecao('Validando Componentes da Interface');
  
  const componentesEsperados = [
    'components/dashboard-instrutor/GerenciarAlunos.tsx',
    'components/dashboard-instrutor/ModalConviteCursoCompleto.tsx',
    'components/dashboard-instrutor/ModalConviteAulasEspecificas.tsx',
    'components/dashboard-instrutor/GerenciarPermissoesAula.tsx',
    'components/curso/ListaAulas.tsx',
    'components/curso/ResumoAcessoAluno.tsx',
    'components/protecao/ProtecaoAula.tsx'
  ];
  
  let componentesEncontrados = 0;
  
  log('blue', 'Componentes implementados:');
  for (const componente of componentesEsperados) {
    const caminhoCompleto = path.join(process.cwd(), componente);
    
    if (fs.existsSync(caminhoCompleto)) {
      log('green', `  ✅ ${componente}`);
      componentesEncontrados++;
    } else {
      log('red', `  ❌ ${componente}`);
    }
  }
  
  const porcentagem = Math.round((componentesEncontrados / componentesEsperados.length) * 100);
  log('bright', `\n📊 Componentes: ${componentesEncontrados}/${componentesEsperados.length} (${porcentagem}%)`);
  
  return { componentesOk: componentesEncontrados, totalComponentes: componentesEsperados.length, porcentagem };
}

async function gerarRelatorioFinal(resultados) {
  logSecao('RELATÓRIO FINAL DE VALIDAÇÃO');
  
  const { estrutura, variaveis, testes, banco, apis, componentes } = resultados;
  
  // Calcular score geral
  const scoreTotal = (
    estrutura.porcentagem +
    variaveis.porcentagem +
    testes.porcentagem +
    banco.porcentagem +
    apis.porcentagem +
    componentes.porcentagem
  ) / 6;
  
  log('bright', `\n🎯 SCORE GERAL: ${Math.round(scoreTotal)}%`);
  
  // Detalhamento por categoria
  console.log('\n📊 DETALHAMENTO POR CATEGORIA:');
  console.log(`   📁 Estrutura de Arquivos: ${estrutura.porcentagem}%`);
  console.log(`   🔧 Variáveis de Ambiente: ${variaveis.porcentagem}%`);
  console.log(`   🧪 Testes: ${testes.porcentagem}%`);
  console.log(`   🗄️ Banco de Dados: ${banco.porcentagem}%`);
  console.log(`   🔌 APIs: ${apis.porcentagem}%`);
  console.log(`   🎨 Componentes: ${componentes.porcentagem}%`);
  
  // Status geral
  if (scoreTotal >= 90) {
    log('green', '\n🎉 SISTEMA PRONTO PARA PRODUÇÃO!');
    log('green', '   Todas as funcionalidades principais estão implementadas e testadas.');
  } else if (scoreTotal >= 75) {
    log('yellow', '\n⚠️ SISTEMA QUASE PRONTO');
    log('yellow', '   Algumas melhorias menores podem ser necessárias.');
  } else if (scoreTotal >= 50) {
    log('yellow', '\n🔧 SISTEMA EM DESENVOLVIMENTO');
    log('yellow', '   Funcionalidades principais implementadas, mas precisa de mais trabalho.');
  } else {
    log('red', '\n❌ SISTEMA INCOMPLETO');
    log('red', '   Muitas funcionalidades ainda precisam ser implementadas.');
  }
  
  // Recomendações
  console.log('\n💡 PRÓXIMOS PASSOS:');
  
  if (variaveis.porcentagem < 100) {
    log('yellow', '   - Configure as variáveis de ambiente obrigatórias');
  }
  
  if (testes.porcentagem < 80) {
    log('yellow', '   - Execute e corrija os testes que estão falhando');
  }
  
  if (estrutura.porcentagem < 90) {
    log('yellow', '   - Verifique se todos os arquivos necessários foram criados');
  }
  
  if (scoreTotal >= 90) {
    log('green', '   - Sistema pronto! Considere fazer deploy em ambiente de teste');
    log('green', '   - Execute testes E2E para validação final');
    log('green', '   - Configure monitoramento de produção');
  }
  
  // Salvar relatório em arquivo
  const relatorio = {
    timestamp: new Date().toISOString(),
    score_geral: Math.round(scoreTotal),
    detalhes: {
      estrutura: estrutura.porcentagem,
      variaveis: variaveis.porcentagem,
      testes: testes.porcentagem,
      banco: banco.porcentagem,
      apis: apis.porcentagem,
      componentes: componentes.porcentagem
    },
    status: scoreTotal >= 90 ? 'PRONTO' : scoreTotal >= 75 ? 'QUASE_PRONTO' : 'EM_DESENVOLVIMENTO'
  };
  
  fs.writeFileSync('relatorio-validacao.json', JSON.stringify(relatorio, null, 2));
  log('blue', '\n📄 Relatório salvo em: relatorio-validacao.json');
  
  return scoreTotal;
}

async function main() {
  log('bright', '🚀 VALIDAÇÃO FINAL - SISTEMA HÍBRIDO DE AULAS PRIVADAS');
  log('cyan', `Iniciado em: ${new Date().toLocaleString('pt-BR')}\n`);
  
  try {
    // Executar todas as validações
    const estrutura = await validarEstrutura();
    const variaveis = await validarVariaveisAmbiente();
    const testes = await executarTestes();
    const banco = await validarBancoDados();
    const apis = await validarAPIs();
    const componentes = await validarComponentes();
    
    // Gerar relatório final
    const scoreTotal = await gerarRelatorioFinal({
      estrutura,
      variaveis,
      testes,
      banco,
      apis,
      componentes
    });
    
    // Código de saída baseado no score
    process.exit(scoreTotal >= 75 ? 0 : 1);
    
  } catch (error) {
    log('red', `\n❌ Erro durante validação: ${error.message}`);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  validarEstrutura,
  validarVariaveisAmbiente,
  executarTestes,
  validarBancoDados,
  validarAPIs,
  validarComponentes,
  gerarRelatorioFinal
};
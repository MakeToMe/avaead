/**
 * Script de teste para verificar conectividade e credenciais do MinIO
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Configuração direta do MinIO (baseada no .env)
const config = {
  endpoint: 'https://rars3.rardevops.com',
  bucket: 'rarcursos',
  accessKey: 'bVjARFUI8HMlxD20sz5u',
  secretKey: 'mdA4FkHVxzvCmjDX6j6fSsCS8wGhyogIftE5aXws'
};

console.log('🔧 Configuração MinIO:');
console.log('- Endpoint:', config.endpoint);
console.log('- Bucket:', config.bucket);
console.log('- Access Key:', config.accessKey ? `${config.accessKey.substring(0, 8)}...` : 'MISSING');
console.log('- Secret Key:', config.secretKey ? `${config.secretKey.substring(0, 8)}...` : 'MISSING');
console.log('');

// Função para fazer requisições HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Teste 1: Conectividade básica
async function testConnectivity() {
  console.log('🌐 Teste 1: Conectividade básica...');
  
  try {
    const response = await makeRequest(config.endpoint, {
      method: 'GET',
      timeout: 10000
    });
    
    console.log('✅ Conectividade OK');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Server: ${response.headers.server || 'Unknown'}`);
    return true;
  } catch (error) {
    console.log('❌ Erro de conectividade:', error.message);
    return false;
  }
}

// Teste 2: Verificar se o bucket existe
async function testBucketExists() {
  console.log('🪣 Teste 2: Verificando se o bucket existe...');
  
  try {
    const bucketUrl = `${config.endpoint}/${config.bucket}/`;
    const response = await makeRequest(bucketUrl, {
      method: 'HEAD',
      timeout: 10000
    });
    
    if (response.statusCode === 200 || response.statusCode === 403) {
      console.log('✅ Bucket existe');
      console.log(`   Status: ${response.statusCode}`);
      return true;
    } else {
      console.log('❌ Bucket não encontrado');
      console.log(`   Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar bucket:', error.message);
    return false;
  }
}

// Teste 3: Testar upload simples (sem autenticação AWS)
async function testSimpleUpload() {
  console.log('📤 Teste 3: Upload simples (sem auth AWS)...');
  
  try {
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'Teste de upload MinIO';
    const uploadUrl = `${config.endpoint}/${config.bucket}/test/${testFileName}`;
    
    const response = await makeRequest(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': testContent.length,
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD'
      },
      body: testContent,
      timeout: 15000
    });
    
    console.log('📊 Resultado do upload:');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Headers:`, Object.keys(response.headers));
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Upload bem-sucedido');
      return { success: true, url: uploadUrl };
    } else {
      console.log('❌ Upload falhou');
      console.log('   Response:', response.data.substring(0, 500));
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('❌ Erro no upload:', error.message);
    return { success: false, error: error.message };
  }
}

// Teste 4: Verificar acesso ao arquivo
async function testFileAccess(uploadResult) {
  if (!uploadResult.success) {
    console.log('⏭️  Pulando teste de acesso (upload falhou)');
    return false;
  }
  
  console.log('🔍 Teste 4: Verificando acesso ao arquivo...');
  
  try {
    const response = await makeRequest(uploadResult.url, {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Arquivo acessível');
      console.log(`   Conteúdo: ${response.data}`);
      return true;
    } else {
      console.log('❌ Arquivo não acessível');
      console.log(`   Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao acessar arquivo:', error.message);
    return false;
  }
}

// Teste 5: Estrutura de pastas do usuário
async function testUserStructure() {
  console.log('👤 Teste 5: Testando estrutura de usuário...');
  
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testFileName = `${Date.now()}-test-video.mp4`;
  const userPath = `${testUserId}/videos/${testFileName}`;
  const uploadUrl = `${config.endpoint}/${config.bucket}/${userPath}`;
  
  try {
    const testContent = 'Fake video content for testing';
    
    const response = await makeRequest(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': testContent.length,
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD'
      },
      body: testContent,
      timeout: 15000
    });
    
    console.log(`📊 Upload para estrutura de usuário:`);
    console.log(`   Caminho: ${userPath}`);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Estrutura de usuário funciona');
      return true;
    } else {
      console.log('❌ Problema na estrutura de usuário');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro na estrutura de usuário:', error.message);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Iniciando testes do MinIO...\n');
  
  // Verificar se as variáveis estão definidas
  if (!config.endpoint || !config.bucket || !config.accessKey || !config.secretKey) {
    console.log('❌ Configurações incompletas no .env');
    console.log('   Verifique: MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY, MINIO_SECRET_KEY');
    return;
  }
  
  const results = {
    connectivity: false,
    bucket: false,
    upload: false,
    access: false,
    userStructure: false
  };
  
  // Executar testes sequencialmente
  results.connectivity = await testConnectivity();
  console.log('');
  
  if (results.connectivity) {
    results.bucket = await testBucketExists();
    console.log('');
    
    const uploadResult = await testSimpleUpload();
    results.upload = uploadResult.success;
    console.log('');
    
    results.access = await testFileAccess(uploadResult);
    console.log('');
    
    results.userStructure = await testUserStructure();
    console.log('');
  }
  
  // Resumo final
  console.log('📋 RESUMO DOS TESTES:');
  console.log('='.repeat(50));
  console.log(`🌐 Conectividade:        ${results.connectivity ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`🪣 Bucket existe:        ${results.bucket ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`📤 Upload funciona:      ${results.upload ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`🔍 Acesso ao arquivo:    ${results.access ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`👤 Estrutura usuário:    ${results.userStructure ? '✅ OK' : '❌ FALHOU'}`);
  console.log('='.repeat(50));
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('🎉 TODOS OS TESTES PASSARAM! MinIO está funcionando corretamente.');
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM. Verifique a configuração.');
  }
  
  console.log('\n💡 Dicas:');
  console.log('- Se upload falhar, verifique as credenciais e permissões');
  console.log('- Se conectividade falhar, verifique o endpoint');
  console.log('- Se bucket não existir, crie-o no painel do MinIO');
}

// Executar
runAllTests().catch(console.error);
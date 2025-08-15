/**
 * Teste de upload de arquivos maiores e diferentes tipos
 */

const https = require('https');

const config = {
  endpoint: 'https://rars3.rardevops.com',
  bucket: 'rarcursos'
};

function getMinioUserUploadUrl(userId, tipo, fileName) {
  const folderMapping = {
    video: 'videos',
    file: 'documentos',
    imagem: 'imagens'
  };
  
  const folder = folderMapping[tipo];
  const filePath = `${userId}/${folder}/${fileName}`;
  return `${config.endpoint}/${config.bucket}/${filePath}`;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
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
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Simular diferentes tamanhos de arquivo
async function testFileSizes() {
  console.log('📏 Testando diferentes tamanhos de arquivo...\n');
  
  const userId = 'test-user-' + Date.now();
  const sizes = [
    { name: 'Pequeno', size: 1024, unit: 'B' },           // 1KB
    { name: 'Médio', size: 1024 * 100, unit: 'KB' },     // 100KB
    { name: 'Grande', size: 1024 * 1024, unit: 'MB' },   // 1MB
    { name: 'Muito Grande', size: 1024 * 1024 * 5, unit: 'MB' } // 5MB
  ];
  
  for (const test of sizes) {
    console.log(`📦 Testando arquivo ${test.name} (${test.size >= 1024*1024 ? (test.size/1024/1024).toFixed(1) + ' MB' : test.size >= 1024 ? (test.size/1024).toFixed(0) + ' KB' : test.size + ' B'})...`);
    
    try {
      const fileName = `${Date.now()}-test-${test.name.toLowerCase()}.mp4`;
      const fileContent = 'X'.repeat(test.size);
      const uploadUrl = getMinioUserUploadUrl(userId, 'video', fileName);
      
      const startTime = Date.now();
      const response = await makeRequest(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
          'Content-Length': fileContent.length
        },
        body: fileContent
      });
      const endTime = Date.now();
      
      const uploadTime = (endTime - startTime) / 1000;
      const speed = (test.size / 1024 / 1024) / uploadTime; // MB/s
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`   ✅ Sucesso - ${uploadTime.toFixed(2)}s (${speed.toFixed(2)} MB/s)`);
      } else {
        console.log(`   ❌ Falhou - Status: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
}

// Testar diferentes tipos de arquivo
async function testFileTypes() {
  console.log('\n🎭 Testando diferentes tipos de arquivo...\n');
  
  const userId = 'test-types-' + Date.now();
  const fileTypes = [
    { ext: 'mp4', type: 'video/mp4', categoria: 'video' },
    { ext: 'avi', type: 'video/avi', categoria: 'video' },
    { ext: 'mov', type: 'video/quicktime', categoria: 'video' },
    { ext: 'pdf', type: 'application/pdf', categoria: 'file' },
    { ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', categoria: 'file' },
    { ext: 'jpg', type: 'image/jpeg', categoria: 'imagem' },
    { ext: 'png', type: 'image/png', categoria: 'imagem' }
  ];
  
  for (const fileType of fileTypes) {
    console.log(`📄 Testando ${fileType.ext.toUpperCase()} (${fileType.categoria})...`);
    
    try {
      const fileName = `${Date.now()}-test.${fileType.ext}`;
      const fileContent = `FAKE_${fileType.ext.toUpperCase()}_CONTENT_` + 'X'.repeat(1000);
      const uploadUrl = getMinioUserUploadUrl(userId, fileType.categoria, fileName);
      
      const response = await makeRequest(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType.type,
          'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
          'Content-Length': fileContent.length
        },
        body: fileContent
      });
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`   ✅ Upload OK - ETag: ${response.headers.etag || 'N/A'}`);
        
        // Testar acesso
        const accessResponse = await makeRequest(uploadUrl, { method: 'GET' });
        if (accessResponse.statusCode === 200) {
          console.log(`   ✅ Acesso OK - Tamanho: ${accessResponse.data.length} bytes`);
        } else {
          console.log(`   ❌ Acesso falhou - Status: ${accessResponse.statusCode}`);
        }
      } else {
        console.log(`   ❌ Upload falhou - Status: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
}

// Testar limites e edge cases
async function testEdgeCases() {
  console.log('\n🔬 Testando casos extremos...\n');
  
  const userId = 'test-edge-' + Date.now();
  
  // Teste 1: Nome de arquivo com caracteres especiais
  console.log('📝 Teste 1: Caracteres especiais no nome...');
  try {
    const specialName = 'arquivo com espaços & símbolos (teste) [2024].mp4';
    const cleanName = specialName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${Date.now()}-${cleanName}`;
    const uploadUrl = getMinioUserUploadUrl(userId, 'video', fileName);
    
    console.log(`   Nome original: ${specialName}`);
    console.log(`   Nome limpo: ${fileName}`);
    
    const response = await makeRequest(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
        'Content-Length': 100
      },
      body: 'X'.repeat(100)
    });
    
    console.log(`   ${response.statusCode >= 200 && response.statusCode < 300 ? '✅' : '❌'} Status: ${response.statusCode}`);
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  
  // Teste 2: Arquivo vazio
  console.log('\n📝 Teste 2: Arquivo vazio...');
  try {
    const fileName = `${Date.now()}-empty.mp4`;
    const uploadUrl = getMinioUserUploadUrl(userId, 'video', fileName);
    
    const response = await makeRequest(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
        'Content-Length': 0
      },
      body: ''
    });
    
    console.log(`   ${response.statusCode >= 200 && response.statusCode < 300 ? '✅' : '❌'} Status: ${response.statusCode}`);
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🧪 TESTE COMPLETO DE UPLOAD DE ARQUIVOS\n');
  console.log('='.repeat(60));
  
  await testFileSizes();
  await testFileTypes();
  await testEdgeCases();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TESTES CONCLUÍDOS!');
  console.log('\n💡 Resumo:');
  console.log('   ✓ Testados diferentes tamanhos de arquivo');
  console.log('   ✓ Testados diferentes tipos de mídia');
  console.log('   ✓ Testados casos extremos');
  console.log('   ✓ Verificada estrutura de pastas por categoria');
  console.log('\n📊 Se todos os testes passaram, o MinIO está pronto para produção!');
}

runAllTests().catch(console.error);
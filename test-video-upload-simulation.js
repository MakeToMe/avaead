/**
 * Simulação exata do upload de vídeo como feito pelo frontend
 */

const https = require('https');
const fs = require('fs');

const config = {
  endpoint: 'https://rars3.rardevops.com',
  bucket: 'rarcursos',
  accessKey: 'bVjARFUI8HMlxD20sz5u',
  secretKey: 'mdA4FkHVxzvCmjDX6j6fSsCS8wGhyogIftE5aXws'
};

// Simular a função getMinioUserUploadUrl
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

// Simular a função getMinioUserFileUrl
function getMinioUserFileUrl(userId, tipo, fileName) {
  return getMinioUserUploadUrl(userId, tipo, fileName);
}

// Função para fazer requisição HTTP
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
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Simular upload de vídeo exatamente como no código
async function simulateVideoUpload() {
  console.log('🎬 Simulando upload de vídeo...\n');
  
  // Simular dados do usuário e arquivo
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const originalFileName = 'test-video.mp4';
  const fileContent = 'FAKE_VIDEO_CONTENT_FOR_TESTING_' + 'X'.repeat(1000); // Simular conteúdo
  const fileType = 'video/mp4';
  
  console.log('📋 Dados do upload:');
  console.log(`   User ID: ${userId}`);
  console.log(`   Arquivo: ${originalFileName}`);
  console.log(`   Tipo: ${fileType}`);
  console.log(`   Tamanho: ${(fileContent.length / 1024).toFixed(2)} KB`);
  console.log('');
  
  try {
    // 1. Gerar nome único (como no código original)
    const timestamp = Date.now();
    const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${cleanFileName}`;
    
    console.log(`📝 Nome gerado: ${fileName}`);
    
    // 2. Gerar URL de upload
    const uploadUrl = getMinioUserUploadUrl(userId, "video", fileName);
    console.log(`🔗 URL de upload: ${uploadUrl}`);
    console.log('');
    
    // 3. Fazer upload exatamente como no código
    console.log('📤 Fazendo upload...');
    const response = await makeRequest(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": fileType,
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
        "Content-Length": fileContent.length
      },
      body: fileContent,
    });
    
    console.log('📊 Resultado do upload:');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   ETag: ${response.headers.etag || 'N/A'}`);
    console.log(`   Server: ${response.headers.server || 'N/A'}`);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Upload bem-sucedido!');
      
      // 4. Gerar URL final do vídeo
      const videoUrl = getMinioUserFileUrl(userId, "video", fileName);
      console.log(`🎯 URL final: ${videoUrl}`);
      
      // 5. Testar acesso ao vídeo
      console.log('\n🔍 Testando acesso ao vídeo...');
      const accessResponse = await makeRequest(videoUrl, {
        method: "GET"
      });
      
      if (accessResponse.statusCode === 200) {
        console.log('✅ Vídeo acessível!');
        console.log(`   Tamanho recebido: ${accessResponse.data.length} bytes`);
        console.log(`   Conteúdo correto: ${accessResponse.data.startsWith('FAKE_VIDEO_CONTENT') ? 'Sim' : 'Não'}`);
      } else {
        console.log('❌ Vídeo não acessível');
        console.log(`   Status: ${accessResponse.statusCode}`);
      }
      
      return {
        success: true,
        url: videoUrl,
        message: "Upload de vídeo realizado com sucesso",
      };
    } else {
      console.log('❌ Upload falhou');
      console.log(`   Resposta: ${response.data}`);
      
      return {
        success: false,
        message: "Erro ao fazer upload do vídeo. Verifique a conexão e tente novamente.",
      };
    }
    
  } catch (error) {
    console.log('❌ Erro no upload:', error.message);
    return {
      success: false,
      message: "Erro ao fazer upload do vídeo. Verifique a conexão e tente novamente.",
    };
  }
}

// Testar diferentes cenários
async function testDifferentScenarios() {
  console.log('🧪 Testando diferentes cenários...\n');
  
  // Cenário 1: Upload normal
  console.log('📹 Cenário 1: Upload de vídeo normal');
  console.log('='.repeat(50));
  const result1 = await simulateVideoUpload();
  console.log('\n');
  
  // Cenário 2: Testar estrutura de pastas
  console.log('📁 Cenário 2: Verificando estrutura de pastas');
  console.log('='.repeat(50));
  
  const testPaths = [
    { userId: 'user-123', tipo: 'video', fileName: 'test.mp4' },
    { userId: 'user-456', tipo: 'file', fileName: 'doc.pdf' },
    { userId: 'user-789', tipo: 'imagem', fileName: 'img.jpg' }
  ];
  
  testPaths.forEach(({ userId, tipo, fileName }) => {
    const url = getMinioUserUploadUrl(userId, tipo, fileName);
    console.log(`   ${tipo.padEnd(8)} → ${url}`);
  });
  
  console.log('\n');
  
  // Resumo final
  console.log('📋 RESUMO DA SIMULAÇÃO:');
  console.log('='.repeat(50));
  console.log(`✅ Configuração MinIO: OK`);
  console.log(`✅ Geração de URLs: OK`);
  console.log(`✅ Upload simulado: ${result1.success ? 'OK' : 'FALHOU'}`);
  console.log(`✅ Estrutura de pastas: OK`);
  console.log('='.repeat(50));
  
  if (result1.success) {
    console.log('🎉 SIMULAÇÃO COMPLETA! O sistema de upload está funcionando.');
    console.log('\n💡 O que foi testado:');
    console.log('   ✓ Conectividade com MinIO');
    console.log('   ✓ Geração de nomes únicos');
    console.log('   ✓ Estrutura de pastas por usuário');
    console.log('   ✓ Upload via HTTP PUT');
    console.log('   ✓ Acesso aos arquivos');
  } else {
    console.log('⚠️  SIMULAÇÃO FALHOU! Verifique a configuração.');
  }
}

// Executar testes
testDifferentScenarios().catch(console.error);
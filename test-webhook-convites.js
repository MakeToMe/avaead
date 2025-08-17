/**
 * Script de teste para validar o sistema de convites com webhook n8n
 */

const { webhookService } = require('./lib/services/webhook-service');
const { tokenService } = require('./lib/services/token-service');

async function testarSistemaConvites() {
  console.log('🧪 Iniciando testes do sistema de convites...\n');

  // 1. Testar geração de tokens
  console.log('1️⃣ Testando geração de tokens:');
  const token1 = tokenService.gerarToken();
  const token2 = tokenService.gerarToken();
  
  console.log(`   Token 1: ${token1}`);
  console.log(`   Token 2: ${token2}`);
  console.log(`   Tokens únicos: ${token1 !== token2 ? '✅' : '❌'}`);
  console.log(`   Formato válido: ${tokenService.validarFormatoToken(token1) ? '✅' : '❌'}`);
  
  const timestamp = tokenService.extrairTimestamp(token1);
  console.log(`   Timestamp extraído: ${timestamp ? '✅' : '❌'} (${timestamp})`);
  console.log(`   Token expirado: ${tokenService.tokenExpirou(token1) ? '❌' : '✅'}\n`);

  // 2. Testar conectividade com n8n
  console.log('2️⃣ Testando conectividade com n8n:');
  const conexaoOk = await webhookService.testarConexao();
  console.log(`   Conexão com n8n: ${conexaoOk ? '✅' : '❌'}\n`);

  // 3. Testar payload de convite curso completo
  console.log('3️⃣ Testando payload convite curso completo:');
  const dadosCursoCompleto = {
    email: 'teste@exemplo.com',
    curso_id: 'curso-123',
    curso_titulo: 'Curso de Teste',
    instrutor_nome: 'Professor Teste',
    instrutor_email: 'professor@exemplo.com',
    token: tokenService.gerarToken(),
    link_aceitar: 'https://app.com/convites/aceitar/token123',
    mensagem: 'Bem-vindo ao curso!'
  };

  try {
    const sucessoCurso = await webhookService.enviarConviteCursoCompleto(dadosCursoCompleto);
    console.log(`   Envio curso completo: ${sucessoCurso ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Envio curso completo: ❌ (${error.message})`);
  }

  // 4. Testar payload de convite aulas específicas
  console.log('\n4️⃣ Testando payload convite aulas específicas:');
  const dadosAulasEspecificas = {
    email: 'teste2@exemplo.com',
    curso_id: 'curso-456',
    curso_titulo: 'Curso Avançado',
    instrutor_nome: 'Professor Avançado',
    instrutor_email: 'avancado@exemplo.com',
    aulas: [
      { id: 'aula-1', titulo: 'Introdução', descricao: 'Aula inicial', duracao: 1800 },
      { id: 'aula-2', titulo: 'Conceitos Básicos', descricao: 'Fundamentos', duracao: 2400 }
    ],
    token: tokenService.gerarToken(),
    link_aceitar: 'https://app.com/convites/aceitar/token456',
    mensagem: 'Acesso às aulas selecionadas!'
  };

  try {
    const sucessoAulas = await webhookService.enviarConviteAulasEspecificas(dadosAulasEspecificas);
    console.log(`   Envio aulas específicas: ${sucessoAulas ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Envio aulas específicas: ❌ (${error.message})`);
  }

  console.log('\n🏁 Testes concluídos!');
  
  // 5. Mostrar exemplo de payload para n8n
  console.log('\n📋 Exemplo de payload que o n8n receberá:');
  console.log(JSON.stringify({
    tipo: 'convite_curso_completo',
    destinatario: {
      email: 'aluno@exemplo.com',
      nome: 'aluno'
    },
    curso: {
      id: 'curso-123',
      titulo: 'Curso de React',
      instrutor: 'Maria Santos',
      instrutor_email: 'maria@exemplo.com'
    },
    convite: {
      token: 'abc123_def456',
      link_aceitar: 'https://app.com/convites/aceitar/abc123_def456',
      mensagem_personalizada: 'Bem-vindo ao curso!',
      data_envio: new Date().toISOString(),
      data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }, null, 2));
}

// Executar testes se chamado diretamente
if (require.main === module) {
  testarSistemaConvites().catch(console.error);
}

module.exports = { testarSistemaConvites };
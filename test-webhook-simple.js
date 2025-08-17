/**
 * Teste simples do webhook n8n
 */

const webhookUrl = 'https://rarwhk.rardevops.com/webhook/36c89efa-2e4a-43b2-8666-143d2e2088ce';

async function testarWebhook() {
  console.log('🧪 Testando webhook n8n...\n');
  
  // 1. Teste de conexão
  console.log('1️⃣ Testando conectividade:');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'teste_conexao',
        timestamp: new Date().toISOString()
      })
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Conectividade: ${response.ok ? '✅' : '❌'}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`   Resposta: ${responseText || 'Vazia'}`);
    }
  } catch (error) {
    console.log(`   Erro: ❌ ${error.message}`);
  }

  // 2. Teste payload curso completo
  console.log('\n2️⃣ Testando payload curso completo:');
  const payloadCursoCompleto = {
    tipo: 'convite_curso_completo',
    destinatario: {
      email: 'teste@exemplo.com',
      nome: 'João Teste'
    },
    curso: {
      id: 'curso-123',
      titulo: 'Curso de Teste',
      instrutor: 'Professor Teste',
      instrutor_email: 'professor@exemplo.com'
    },
    convite: {
      token: 'abc123_def456',
      link_aceitar: 'https://saber365.app/convites/aceitar/abc123_def456',
      mensagem_personalizada: 'Bem-vindo ao curso!',
      data_envio: new Date().toISOString(),
      data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadCursoCompleto)
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Envio curso completo: ${response.ok ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Erro: ❌ ${error.message}`);
  }

  // 3. Teste payload aulas específicas
  console.log('\n3️⃣ Testando payload aulas específicas:');
  const payloadAulasEspecificas = {
    tipo: 'convite_aulas_especificas',
    destinatario: {
      email: 'teste2@exemplo.com',
      nome: 'Maria Teste'
    },
    curso: {
      id: 'curso-456',
      titulo: 'Curso Avançado',
      instrutor: 'Professor Avançado',
      instrutor_email: 'avancado@exemplo.com'
    },
    aulas: [
      {
        id: 'aula-1',
        titulo: 'Introdução',
        descricao: 'Aula inicial do curso',
        duracao: 1800
      },
      {
        id: 'aula-2',
        titulo: 'Conceitos Básicos',
        descricao: 'Fundamentos importantes',
        duracao: 2400
      }
    ],
    convite: {
      token: 'xyz789_ghi012',
      link_aceitar: 'https://saber365.app/convites/aceitar/xyz789_ghi012',
      mensagem_personalizada: 'Acesso às aulas selecionadas!',
      data_envio: new Date().toISOString(),
      data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadAulasEspecificas)
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Envio aulas específicas: ${response.ok ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Erro: ❌ ${error.message}`);
  }

  console.log('\n🏁 Teste concluído!');
  console.log('\n📋 Webhook configurado:');
  console.log(`   URL: ${webhookUrl}`);
  console.log('   Método: POST');
  console.log('   Content-Type: application/json');
}

testarWebhook().catch(console.error);
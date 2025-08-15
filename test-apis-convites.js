// Script para testar as APIs de convites
// Execute com: node test-apis-convites.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabase = createClient(
  'https://studio.rardevops.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ4MzY0MDAsCiAgImV4cCI6IDE4OTI2MDI4MDAKfQ.VmlSWOEpE77ZfOcQSjoP-1Ty4eWUgybz_K9AUvdsY70',
  {
    db: { schema: 'rarcursos' }
  }
);

// URL base da aplicação (ajuste conforme necessário)
const BASE_URL = 'http://localhost:3000';

async function testAPIs() {
  console.log('🧪 Testando APIs de Convites');
  console.log('=' * 50);

  try {
    // 1. Buscar dados para teste
    console.log('\n1️⃣ Buscando dados para teste...');
    
    const { data: cursos } = await supabase
      .from('cursos')
      .select('id, titulo, instrutor_id')
      .limit(1);

    if (!cursos || cursos.length === 0) {
      console.log('❌ Nenhum curso encontrado');
      return;
    }

    const curso = cursos[0];
    console.log(`📚 Curso: ${curso.titulo}`);
    console.log(`👨‍🏫 Instrutor: ${curso.instrutor_id.substring(0, 8)}...`);

    // 2. Testar API de convite para curso completo
    console.log('\n2️⃣ Testando API de convite para curso completo...');
    
    const conviteCursoCompleto = {
      email: 'teste-api-curso@exemplo.com',
      instrutor_id: curso.instrutor_id,
      mensagem: 'Teste via API - Convite para curso completo'
    };

    console.log('📤 Enviando requisição POST...');
    console.log(`URL: ${BASE_URL}/api/cursos/${curso.id}/convites/curso-completo`);
    console.log('Dados:', JSON.stringify(conviteCursoCompleto, null, 2));

    // Simular requisição (em um teste real, usaria fetch)
    console.log('💡 Para testar, execute:');
    console.log(`curl -X POST "${BASE_URL}/api/cursos/${curso.id}/convites/curso-completo" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '${JSON.stringify(conviteCursoCompleto)}'`);

    // 3. Buscar aulas para teste de convite específico
    console.log('\n3️⃣ Buscando aulas para teste de convite específico...');
    
    const { data: aulas } = await supabase
      .from('aulas')
      .select('id, titulo, privada')
      .eq('curso_id', curso.id)
      .limit(3);

    if (aulas && aulas.length > 0) {
      console.log(`🎬 Aulas encontradas: ${aulas.length}`);
      
      const conviteAulasEspecificas = {
        email: 'teste-api-aulas@exemplo.com',
        aula_ids: aulas.slice(0, 2).map(a => a.id),
        instrutor_id: curso.instrutor_id,
        mensagem: 'Teste via API - Convite para aulas específicas'
      };

      console.log('\n📤 Teste de convite para aulas específicas:');
      console.log(`URL: ${BASE_URL}/api/cursos/${curso.id}/convites/aulas-especificas`);
      console.log('Dados:', JSON.stringify(conviteAulasEspecificas, null, 2));

      console.log('💡 Para testar, execute:');
      console.log(`curl -X POST "${BASE_URL}/api/cursos/${curso.id}/convites/aulas-especificas" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '${JSON.stringify(conviteAulasEspecificas)}'`);
    }

    // 4. Testar API de verificação de acesso
    console.log('\n4️⃣ Testando API de verificação de acesso...');
    
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('aluno_id')
      .eq('curso_id', curso.id)
      .limit(1);

    if (matriculas && matriculas.length > 0) {
      const alunoId = matriculas[0].aluno_id;
      
      console.log(`👤 Aluno para teste: ${alunoId.substring(0, 8)}...`);
      console.log(`URL: ${BASE_URL}/api/cursos/${curso.id}/aulas/acesso?aluno_id=${alunoId}`);

      console.log('💡 Para testar, execute:');
      console.log(`curl "${BASE_URL}/api/cursos/${curso.id}/aulas/acesso?aluno_id=${alunoId}"`);
    }

    // 5. Testar API de alteração de tipo de acesso
    console.log('\n5️⃣ Testando API de alteração de tipo de acesso...');
    
    if (matriculas && matriculas.length > 0) {
      const alunoId = matriculas[0].aluno_id;
      
      const alteracaoTipo = {
        tipo_acesso: 'convidado_curso',
        instrutor_id: curso.instrutor_id
      };

      console.log(`URL: ${BASE_URL}/api/cursos/${curso.id}/alunos/${alunoId}/tipo-acesso`);
      console.log('Dados:', JSON.stringify(alteracaoTipo, null, 2));

      console.log('💡 Para testar, execute:');
      console.log(`curl -X PUT "${BASE_URL}/api/cursos/${curso.id}/alunos/${alunoId}/tipo-acesso" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '${JSON.stringify(alteracaoTipo)}'`);
    }

    // 6. Listar convites existentes para teste
    console.log('\n6️⃣ Verificando convites existentes...');
    
    const { data: convitesExistentes } = await supabase
      .from('convites_pendentes')
      .select('token, email, tipo_convite, aceito')
      .eq('curso_id', curso.id)
      .limit(3);

    if (convitesExistentes && convitesExistentes.length > 0) {
      console.log(`📋 Convites encontrados: ${convitesExistentes.length}`);
      
      convitesExistentes.forEach((convite, index) => {
        const tipoEmoji = convite.tipo_convite === 'curso_completo' ? '📚' : '🎯';
        const statusEmoji = convite.aceito ? '✅' : '⏳';
        console.log(`  ${index + 1}. ${tipoEmoji} ${statusEmoji} ${convite.email}`);
        
        if (!convite.aceito) {
          console.log(`     Token: ${convite.token.substring(0, 16)}...`);
          console.log(`     Link: ${BASE_URL}/api/convites/aceitar/${convite.token}`);
        }
      });
    } else {
      console.log('📋 Nenhum convite encontrado');
    }

    // 7. Exemplos de estruturas de resposta esperadas
    console.log('\n7️⃣ Estruturas de resposta esperadas...');
    
    console.log('\n📤 Resposta de sucesso (convite curso completo):');
    console.log(JSON.stringify({
      success: true,
      message: 'Convite enviado com sucesso',
      data: {
        token: 'abc123...',
        tipo_convite: 'curso_completo',
        email: 'aluno@exemplo.com',
        curso_id: curso.id
      }
    }, null, 2));

    console.log('\n📤 Resposta de erro (validação):');
    console.log(JSON.stringify({
      success: false,
      error: 'Dados inválidos',
      codigo: 'DADOS_INVALIDOS',
      detalhes: [
        {
          campo: 'email',
          mensagem: 'Email inválido'
        }
      ]
    }, null, 2));

    console.log('\n📤 Resposta de verificação de acesso:');
    console.log(JSON.stringify({
      success: true,
      data: {
        aluno_id: 'uuid-aluno',
        curso_id: curso.id,
        tipo_acesso: 'convidado_curso',
        estatisticas: {
          total_aulas: 10,
          aulas_acessiveis: 8,
          aulas_bloqueadas: 2,
          percentual_acesso: 80
        }
      }
    }, null, 2));

    console.log('\n' + '=' * 50);
    console.log('🎉 Guia de teste das APIs concluído!');
    console.log('✅ Use os comandos curl acima para testar as APIs');
    console.log('💡 Inicie o servidor Next.js com: npm run dev');

  } catch (error) {
    console.error('❌ Erro durante preparação dos testes:', error);
  }
}

// Executar testes
testAPIs();
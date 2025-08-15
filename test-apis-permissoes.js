// Script para testar as APIs de permissões de aulas
// Execute com: node test-apis-permissoes.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabase = createClient(
  'https://studio.rardevops.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ4MzY0MDAsCiAgImV4cCI6IDE4OTI2MDI4MDAKfQ.VmlSWOEpE77ZfOcQSjoP-1Ty4eWUgybz_K9AUvdsY70',
  {
    db: { schema: 'rarcursos' }
  }
);

// URL base da aplicação
const BASE_URL = 'http://localhost:3000';

async function testPermissoesAPIs() {
  console.log('🧪 Testando APIs de Permissões de Aulas');
  console.log('=' * 50);

  try {
    // 1. Buscar dados para teste
    console.log('\n1️⃣ Buscando dados para teste...');
    
    // Buscar curso com instrutor
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

    // Usar aula privada específica fornecida
    const aulaPrivadaId = '596cb650-9fc4-4053-af3e-fa3f78cb0d4c';
    
    // Buscar dados da aula privada específica
    const { data: aulaPrivada } = await supabase
      .from('aulas')
      .select('id, titulo, privada, curso_id')
      .eq('id', aulaPrivadaId)
      .single();

    if (!aulaPrivada) {
      console.log('❌ Aula privada específica não encontrada');
      return;
    }

    if (!aulaPrivada.privada) {
      console.log('⚠️ A aula especificada não é privada');
      return;
    }
    console.log(`🎬 Aula privada: ${aulaPrivada.titulo}`);

    // Buscar alunos matriculados
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('aluno_id, tipo_acesso, users:aluno_id(nome, email)')
      .eq('curso_id', curso.id)
      .eq('status', 'ativa')
      .eq('tipo_acesso', 'matriculado') // Apenas matriculados normais
      .limit(2);

    if (!matriculas || matriculas.length === 0) {
      console.log('❌ Nenhum aluno matriculado encontrado');
      return;
    }

    const aluno = matriculas[0];
    console.log(`👤 Aluno: ${aluno.users?.nome || 'Nome não encontrado'}`);
    console.log(`📧 Email: ${aluno.users?.email || 'Email não encontrado'}`);

    // 2. Testar API de concessão de permissão
    console.log('\n2️⃣ Testando API de concessão de permissão...');
    
    const concederPermissao = {
      aluno_id: aluno.aluno_id,
      instrutor_id: curso.instrutor_id
    };

    console.log('📤 Conceder permissão específica:');
    console.log(`URL: ${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes`);
    console.log('Dados:', JSON.stringify(concederPermissao, null, 2));

    console.log('💡 Para testar, execute:');
    console.log(`curl -X POST "${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '${JSON.stringify(concederPermissao)}'`);

    // 3. Testar API de listagem de permissões da aula
    console.log('\n3️⃣ Testando API de listagem de permissões da aula...');
    
    console.log(`URL: ${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes?instrutor_id=${curso.instrutor_id}`);
    
    console.log('💡 Para testar, execute:');
    console.log(`curl "${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes?instrutor_id=${curso.instrutor_id}"`);

    // 4. Testar API de verificação de permissão específica
    console.log('\n4️⃣ Testando API de verificação de permissão específica...');
    
    console.log(`URL: ${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes/${aluno.aluno_id}?instrutor_id=${curso.instrutor_id}`);
    
    console.log('💡 Para testar, execute:');
    console.log(`curl "${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes/${aluno.aluno_id}?instrutor_id=${curso.instrutor_id}"`);

    // 5. Testar API de listagem de permissões do aluno
    console.log('\n5️⃣ Testando API de listagem de permissões do aluno...');
    
    console.log(`URL: ${BASE_URL}/api/cursos/${curso.id}/alunos/${aluno.aluno_id}/permissoes?instrutor_id=${curso.instrutor_id}`);
    
    console.log('💡 Para testar, execute:');
    console.log(`curl "${BASE_URL}/api/cursos/${curso.id}/alunos/${aluno.aluno_id}/permissoes?instrutor_id=${curso.instrutor_id}"`);

    // 6. Testar API de concessão múltipla
    if (aulas.length > 1) {
      console.log('\n6️⃣ Testando API de concessão múltipla...');
      
      const concederMultiplas = {
        aula_ids: aulas.slice(0, 2).map(a => a.id),
        instrutor_id: curso.instrutor_id
      };

      console.log(`URL: ${BASE_URL}/api/cursos/${curso.id}/alunos/${aluno.aluno_id}/permissoes`);
      console.log('Dados:', JSON.stringify(concederMultiplas, null, 2));

      console.log('💡 Para testar, execute:');
      console.log(`curl -X POST "${BASE_URL}/api/cursos/${curso.id}/alunos/${aluno.aluno_id}/permissoes" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '${JSON.stringify(concederMultiplas)}'`);
    }

    // 7. Testar API de remoção de permissão
    console.log('\n7️⃣ Testando API de remoção de permissão...');
    
    const removerPermissao = {
      instrutor_id: curso.instrutor_id
    };

    console.log(`URL: ${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes/${aluno.aluno_id}`);
    console.log('Dados:', JSON.stringify(removerPermissao, null, 2));

    console.log('💡 Para testar, execute:');
    console.log(`curl -X DELETE "${BASE_URL}/api/aulas/${aulaPrivada.id}/permissoes/${aluno.aluno_id}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '${JSON.stringify(removerPermissao)}'`);

    // 8. Verificar permissões existentes
    console.log('\n8️⃣ Verificando permissões existentes...');
    
    const { data: permissoesExistentes } = await supabase
      .from('aula_permissoes')
      .select(`
        id,
        aula_id,
        aluno_id,
        tipo_permissao,
        criado_em,
        aulas:aula_id (
          titulo,
          curso_id
        ),
        users:aluno_id (
          nome,
          email
        )
      `)
      .limit(5);

    if (permissoesExistentes && permissoesExistentes.length > 0) {
      console.log(`📋 Permissões existentes: ${permissoesExistentes.length}`);
      
      permissoesExistentes.forEach((permissao, index) => {
        console.log(`  ${index + 1}. ${permissao.users?.nome || 'Nome não encontrado'} → ${permissao.aulas?.titulo || 'Aula não encontrada'}`);
        console.log(`     Tipo: ${permissao.tipo_permissao}`);
        console.log(`     Criado: ${new Date(permissao.criado_em).toLocaleDateString()}`);
      });
    } else {
      console.log('📋 Nenhuma permissão específica encontrada');
    }

    // 9. Exemplos de estruturas de resposta
    console.log('\n9️⃣ Estruturas de resposta esperadas...');
    
    console.log('\n📤 Resposta de concessão de permissão:');
    console.log(JSON.stringify({
      success: true,
      message: 'Permissão concedida com sucesso',
      data: {
        permissao: {
          id: 'uuid-permissao',
          aula_id: aulaPrivada.id,
          aluno_id: aluno.aluno_id,
          tipo_permissao: 'convite_especifico'
        },
        aula: {
          titulo: aulaPrivada.titulo
        },
        aluno: {
          nome: aluno.users?.nome
        }
      }
    }, null, 2));

    console.log('\n📤 Resposta de listagem de permissões da aula:');
    console.log(JSON.stringify({
      success: true,
      data: {
        aula: {
          id: aulaPrivada.id,
          titulo: aulaPrivada.titulo,
          privada: true
        },
        resumo: {
          total_com_acesso: 3,
          convidados_curso: 1,
          permissoes_especificas: 2,
          matriculados_sem_acesso: 5
        },
        convidados_curso: [],
        permissoes_especificas: [],
        matriculados_sem_acesso: []
      }
    }, null, 2));

    console.log('\n' + '=' * 50);
    console.log('🎉 Guia de teste das APIs de permissões concluído!');
    console.log('✅ Use os comandos curl acima para testar as APIs');
    console.log('💡 Inicie o servidor Next.js com: npm run dev');

  } catch (error) {
    console.error('❌ Erro durante preparação dos testes:', error);
  }
}

// Executar testes
testPermissoesAPIs();
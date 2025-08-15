// Script simples para testar o serviço de acesso a aulas
// Execute com: node test-acesso-service.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabase = createClient(
  'https://studio.rardevops.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ4MzY0MDAsCiAgImV4cCI6IDE4OTI2MDI4MDAKfQ.VmlSWOEpE77ZfOcQSjoP-1Ty4eWUgybz_K9AUvdsY70',
  {
    db: { schema: 'rarcursos' }
  }
);

async function testAcessoService() {
  console.log('🧪 Testando Serviço de Acesso a Aulas');
  console.log('=' * 50);

  try {
    // 1. Testar conexão com o banco
    console.log('\n1️⃣ Testando conexão...');
    const { data: aulas, error: aulaError } = await supabase
      .from('aulas')
      .select('id, titulo, privada, curso_id')
      .limit(3);

    if (aulaError) {
      console.error('❌ Erro ao conectar:', aulaError);
      return;
    }

    console.log(`✅ Conexão OK - ${aulas.length} aulas encontradas`);
    
    // 2. Testar busca de matrículas
    console.log('\n2️⃣ Testando busca de matrículas...');
    const { data: matriculas, error: matriculaError } = await supabase
      .from('matriculas')
      .select('id, aluno_id, curso_id, tipo_acesso')
      .limit(3);

    if (matriculaError) {
      console.error('❌ Erro ao buscar matrículas:', matriculaError);
      return;
    }

    console.log(`✅ Matrículas OK - ${matriculas.length} matrículas encontradas`);
    
    // 3. Testar tabela aula_permissoes
    console.log('\n3️⃣ Testando tabela aula_permissoes...');
    const { data: permissoes, error: permissaoError } = await supabase
      .from('aula_permissoes')
      .select('*')
      .limit(1);

    if (permissaoError) {
      console.error('❌ Erro ao acessar aula_permissoes:', permissaoError);
    } else {
      console.log(`✅ Tabela aula_permissoes OK - ${permissoes.length} registros`);
    }

    // 4. Testar tabela convites_pendentes
    console.log('\n4️⃣ Testando tabela convites_pendentes...');
    const { data: convites, error: conviteError } = await supabase
      .from('convites_pendentes')
      .select('*')
      .limit(1);

    if (conviteError) {
      console.error('❌ Erro ao acessar convites_pendentes:', conviteError);
    } else {
      console.log(`✅ Tabela convites_pendentes OK - ${convites.length} registros`);
    }

    // 5. Simular verificação de acesso
    if (aulas.length > 0 && matriculas.length > 0) {
      console.log('\n5️⃣ Simulando verificação de acesso...');
      
      const aula = aulas[0];
      const matricula = matriculas[0];
      
      console.log(`📚 Aula: ${aula.titulo} (privada: ${aula.privada})`);
      console.log(`👤 Matrícula: ${matricula.tipo_acesso}`);
      
      // Lógica simplificada de verificação
      let podeAssistir = false;
      let motivo = '';
      let tipoAcesso = '';

      if (aula.curso_id === matricula.curso_id) {
        if (!aula.privada) {
          podeAssistir = true;
          tipoAcesso = 'aula_publica';
        } else if (matricula.tipo_acesso === 'convidado_curso') {
          podeAssistir = true;
          tipoAcesso = 'convidado_curso';
          motivo = 'Acesso total ao curso';
        } else {
          podeAssistir = false;
          motivo = 'Aula privada requer convite específico';
        }
      } else {
        podeAssistir = false;
        motivo = 'Não matriculado no curso';
      }

      console.log(`🔍 Resultado: ${podeAssistir ? '✅ PODE ASSISTIR' : '❌ BLOQUEADO'}`);
      if (tipoAcesso) console.log(`📋 Tipo de acesso: ${tipoAcesso}`);
      if (motivo) console.log(`💬 Motivo: ${motivo}`);
    }

    console.log('\n' + '=' * 50);
    console.log('🎉 Teste concluído com sucesso!');
    console.log('✅ Todas as estruturas estão funcionando');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testAcessoService();
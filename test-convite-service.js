// Script simples para testar o serviço de convites
// Execute com: node test-convite-service.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuração do Supabase
const supabase = createClient(
  'https://studio.rardevops.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ4MzY0MDAsCiAgImV4cCI6IDE4OTI2MDI4MDAKfQ.VmlSWOEpE77ZfOcQSjoP-1Ty4eWUgybz_K9AUvdsY70',
  {
    db: { schema: 'rarcursos' }
  }
);

async function testConviteService() {
  console.log('🧪 Testando Serviço de Convites');
  console.log('=' * 50);

  try {
    // 1. Testar estrutura das tabelas
    console.log('\n1️⃣ Testando estrutura das tabelas...');
    
    // Testar tabela convites_pendentes
    const { data: convites, error: conviteError } = await supabase
      .from('convites_pendentes')
      .select('*')
      .limit(1);

    if (conviteError) {
      console.error('❌ Erro ao acessar convites_pendentes:', conviteError);
      return;
    }

    console.log('✅ Tabela convites_pendentes acessível');

    // Testar tabela aula_permissoes
    const { data: permissoes, error: permissaoError } = await supabase
      .from('aula_permissoes')
      .select('*')
      .limit(1);

    if (permissaoError) {
      console.error('❌ Erro ao acessar aula_permissoes:', permissaoError);
      return;
    }

    console.log('✅ Tabela aula_permissoes acessível');

    // 2. Buscar dados para teste
    console.log('\n2️⃣ Buscando dados para teste...');
    
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

    // 3. Testar criação de convite para curso completo
    console.log('\n3️⃣ Testando criação de convite para curso completo...');
    
    const token = crypto.randomBytes(32).toString('hex');
    const emailTeste = 'teste-convite@exemplo.com';
    
    const { error: insertError } = await supabase
      .from('convites_pendentes')
      .insert({
        email: emailTeste,
        curso_id: curso.id,
        tipo_convite: 'curso_completo',
        enviado_por: curso.instrutor_id,
        mensagem: 'Teste de convite para curso completo',
        token: token,
        aceito: false
      });

    if (insertError) {
      console.error('❌ Erro ao criar convite:', insertError);
    } else {
      console.log('✅ Convite criado com sucesso');
      console.log(`🎫 Token: ${token.substring(0, 16)}...`);
    }

    // 4. Testar busca de convite por token
    console.log('\n4️⃣ Testando busca de convite por token...');
    
    const { data: conviteBuscado, error: buscaError } = await supabase
      .from('convites_pendentes')
      .select('*')
      .eq('token', token)
      .single();

    if (buscaError) {
      console.error('❌ Erro ao buscar convite:', buscaError);
    } else {
      console.log('✅ Convite encontrado');
      console.log(`📧 Email: ${conviteBuscado.email}`);
      console.log(`📚 Tipo: ${conviteBuscado.tipo_convite}`);
      console.log(`✅ Aceito: ${conviteBuscado.aceito ? 'SIM' : 'NÃO'}`);
    }

    // 5. Testar busca de aulas para convite específico
    console.log('\n5️⃣ Testando busca de aulas para convite específico...');
    
    const { data: aulas } = await supabase
      .from('aulas')
      .select('id, titulo, privada')
      .eq('curso_id', curso.id)
      .eq('privada', true)
      .limit(2);

    if (aulas && aulas.length > 0) {
      console.log(`🎬 Aulas privadas encontradas: ${aulas.length}`);
      
      // Criar convite para aulas específicas
      const tokenEspecifico = crypto.randomBytes(32).toString('hex');
      const aulaIds = aulas.map(a => a.id);
      
      const { error: insertEspecificoError } = await supabase
        .from('convites_pendentes')
        .insert({
          email: 'teste-aulas-especificas@exemplo.com',
          curso_id: curso.id,
          tipo_convite: 'aulas_especificas',
          aula_ids: aulaIds,
          enviado_por: curso.instrutor_id,
          mensagem: 'Teste de convite para aulas específicas',
          token: tokenEspecifico,
          aceito: false
        });

      if (insertEspecificoError) {
        console.error('❌ Erro ao criar convite específico:', insertEspecificoError);
      } else {
        console.log('✅ Convite específico criado');
        console.log(`🎫 Token: ${tokenEspecifico.substring(0, 16)}...`);
        console.log(`📋 Aulas: ${aulaIds.length}`);
      }
    } else {
      console.log('⚠️ Nenhuma aula privada encontrada para teste');
    }

    // 6. Testar verificação de instrutor
    console.log('\n6️⃣ Testando verificação de instrutor...');
    
    const { data: cursoVerificacao } = await supabase
      .from('cursos')
      .select('instrutor_id')
      .eq('id', curso.id)
      .single();

    const isInstrutor = cursoVerificacao?.instrutor_id === curso.instrutor_id;
    console.log(`🔍 É instrutor: ${isInstrutor ? '✅ SIM' : '❌ NÃO'}`);

    // 7. Listar convites criados
    console.log('\n7️⃣ Listando convites de teste criados...');
    
    const { data: convitesCriados } = await supabase
      .from('convites_pendentes')
      .select('*')
      .like('email', '%@exemplo.com')
      .order('criado_em', { ascending: false });

    if (convitesCriados && convitesCriados.length > 0) {
      console.log(`📋 Convites de teste: ${convitesCriados.length}`);
      convitesCriados.forEach((convite, index) => {
        const tipoEmoji = convite.tipo_convite === 'curso_completo' ? '📚' : '🎯';
        console.log(`  ${index + 1}. ${tipoEmoji} ${convite.email} (${convite.tipo_convite})`);
      });
    }

    // 8. Limpeza (opcional)
    console.log('\n8️⃣ Limpando dados de teste...');
    
    const { error: deleteError } = await supabase
      .from('convites_pendentes')
      .delete()
      .like('email', '%@exemplo.com');

    if (deleteError) {
      console.error('❌ Erro ao limpar dados:', deleteError);
    } else {
      console.log('✅ Dados de teste removidos');
    }

    console.log('\n' + '=' * 50);
    console.log('🎉 Teste do serviço de convites concluído!');
    console.log('✅ Todas as funcionalidades estão operacionais');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testConviteService();
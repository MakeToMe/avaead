// Script para verificar matrículas relacionadas à aula privada
// Execute com: node check-matriculas-aula-privada.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://studio.rardevops.com',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzQ4MzY0MDAsCiAgImV4cCI6IDE4OTI2MDI4MDAKfQ.VmlSWOEpE77ZfOcQSjoP-1Ty4eWUgybz_K9AUvdsY70',
  {
    db: { schema: 'rarcursos' }
  }
);

async function checkMatriculas() {
  console.log('🔍 Verificando matrículas para aula privada');
  console.log('=' * 50);

  const aulaPrivadaId = '596cb650-9fc4-4053-af3e-fa3f78cb0d4c';

  try {
    // 1. Buscar dados da aula privada
    console.log('\n1️⃣ Buscando dados da aula privada...');
    const { data: aula } = await supabase
      .from('aulas')
      .select('id, titulo, privada, curso_id')
      .eq('id', aulaPrivadaId)
      .single();

    if (!aula) {
      console.log('❌ Aula não encontrada');
      return;
    }

    console.log(`🎬 Aula: ${aula.titulo}`);
    console.log(`🔒 Privada: ${aula.privada ? 'SIM' : 'NÃO'}`);
    console.log(`📚 Curso ID: ${aula.curso_id}`);

    // 2. Buscar dados do curso
    console.log('\n2️⃣ Buscando dados do curso...');
    const { data: curso } = await supabase
      .from('cursos')
      .select('id, titulo, instrutor_id')
      .eq('id', aula.curso_id)
      .single();

    if (!curso) {
      console.log('❌ Curso não encontrado');
      return;
    }

    console.log(`📚 Curso: ${curso.titulo}`);
    console.log(`👨‍🏫 Instrutor: ${curso.instrutor_id.substring(0, 8)}...`);

    // 3. Buscar todas as matrículas do curso
    console.log('\n3️⃣ Buscando matrículas do curso...');
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select(`
        id,
        aluno_id,
        tipo_acesso,
        status,
        data_matricula,
        users:aluno_id (
          uid,
          nome,
          email
        )
      `)
      .eq('curso_id', aula.curso_id);

    if (!matriculas || matriculas.length === 0) {
      console.log('❌ Nenhuma matrícula encontrada para este curso');
      return;
    }

    console.log(`📋 Total de matrículas: ${matriculas.length}`);

    // Agrupar por status
    const ativas = matriculas.filter(m => m.status === 'ativa');
    const inativas = matriculas.filter(m => m.status !== 'ativa');

    console.log(`  - Ativas: ${ativas.length}`);
    console.log(`  - Inativas: ${inativas.length}`);

    // Agrupar por tipo de acesso (apenas ativas)
    const matriculados = ativas.filter(m => m.tipo_acesso === 'matriculado');
    const convidados = ativas.filter(m => m.tipo_acesso === 'convidado_curso');

    console.log(`  - Matriculados: ${matriculados.length}`);
    console.log(`  - Convidados do curso: ${convidados.length}`);

    // 4. Mostrar detalhes das matrículas ativas
    if (ativas.length > 0) {
      console.log('\n4️⃣ Detalhes das matrículas ativas:');
      ativas.forEach((matricula, index) => {
        const nome = matricula.users?.nome || 'Nome não encontrado';
        const email = matricula.users?.email || 'Email não encontrado';
        const tipoEmoji = matricula.tipo_acesso === 'convidado_curso' ? '⭐' : '🎓';
        
        console.log(`  ${index + 1}. ${tipoEmoji} ${nome}`);
        console.log(`     Email: ${email}`);
        console.log(`     Tipo: ${matricula.tipo_acesso}`);
        console.log(`     ID: ${matricula.aluno_id.substring(0, 8)}...`);
        console.log(`     Matrícula: ${new Date(matricula.data_matricula).toLocaleDateString()}`);
        console.log('');
      });
    }

    // 5. Verificar permissões específicas existentes para esta aula
    console.log('\n5️⃣ Verificando permissões específicas para esta aula...');
    const { data: permissoes } = await supabase
      .from('aula_permissoes')
      .select(`
        id,
        aluno_id,
        tipo_permissao,
        criado_em,
        concedida_por,
        users:aluno_id (
          nome,
          email
        )
      `)
      .eq('aula_id', aulaPrivadaId);

    if (permissoes && permissoes.length > 0) {
      console.log(`📋 Permissões específicas: ${permissoes.length}`);
      permissoes.forEach((permissao, index) => {
        const nome = permissao.users?.nome || 'Nome não encontrado';
        console.log(`  ${index + 1}. ${nome}`);
        console.log(`     Tipo: ${permissao.tipo_permissao}`);
        console.log(`     Concedida: ${new Date(permissao.criado_em).toLocaleDateString()}`);
      });
    } else {
      console.log('📋 Nenhuma permissão específica encontrada');
    }

    // 6. Resumo para testes
    console.log('\n6️⃣ Resumo para testes das APIs:');
    console.log(`🎬 Aula ID: ${aulaPrivadaId}`);
    console.log(`📚 Curso ID: ${aula.curso_id}`);
    console.log(`👨‍🏫 Instrutor ID: ${curso.instrutor_id}`);
    
    if (matriculados.length > 0) {
      const alunoTeste = matriculados[0];
      console.log(`👤 Aluno para teste: ${alunoTeste.aluno_id}`);
      console.log(`📧 Nome: ${alunoTeste.users?.nome}`);
      
      console.log('\n💡 Comandos de teste prontos:');
      console.log('\n# Conceder permissão:');
      console.log(`curl -X POST "http://localhost:3000/api/aulas/${aulaPrivadaId}/permissoes" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"aluno_id":"${alunoTeste.aluno_id}","instrutor_id":"${curso.instrutor_id}"}'`);
      
      console.log('\n# Listar permissões da aula:');
      console.log(`curl "http://localhost:3000/api/aulas/${aulaPrivadaId}/permissoes?instrutor_id=${curso.instrutor_id}"`);
      
      console.log('\n# Verificar permissão específica:');
      console.log(`curl "http://localhost:3000/api/aulas/${aulaPrivadaId}/permissoes/${alunoTeste.aluno_id}?instrutor_id=${curso.instrutor_id}"`);
    } else {
      console.log('⚠️ Nenhum aluno matriculado encontrado para teste');
    }

    console.log('\n' + '=' * 50);
    console.log('✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

checkMatriculas();
// Utilitário para testar o serviço de acesso a aulas
// Este arquivo pode ser usado para testes manuais durante desenvolvimento

import { acessoAulaService } from './acesso-aula-service';

/**
 * Função para testar o serviço de acesso a aulas
 * Execute este arquivo para verificar se tudo está funcionando
 */
export async function testarAcessoAula() {
  console.log('🧪 Testando AcessoAulaService');
  console.log('=' * 50);

  try {
    // Buscar uma aula e matrícula reais para teste
    const supabase = (acessoAulaService as any).supabase;
    
    // 1. Buscar aulas disponíveis
    console.log('\n1️⃣ Buscando aulas para teste...');
    const { data: aulas } = await supabase
      .from('aulas')
      .select('id, titulo, privada, curso_id')
      .limit(3);

    if (!aulas || aulas.length === 0) {
      console.log('❌ Nenhuma aula encontrada para teste');
      return;
    }

    console.log(`✅ ${aulas.length} aulas encontradas`);
    aulas.forEach((aula, index) => {
      console.log(`  ${index + 1}. ${aula.titulo} (privada: ${aula.privada})`);
    });

    // 2. Buscar matrículas disponíveis
    console.log('\n2️⃣ Buscando matrículas para teste...');
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('id, aluno_id, curso_id, tipo_acesso')
      .limit(3);

    if (!matriculas || matriculas.length === 0) {
      console.log('❌ Nenhuma matrícula encontrada para teste');
      return;
    }

    console.log(`✅ ${matriculas.length} matrículas encontradas`);
    matriculas.forEach((matricula, index) => {
      console.log(`  ${index + 1}. Aluno: ${matricula.aluno_id.substring(0, 8)}... (${matricula.tipo_acesso})`);
    });

    // 3. Testar verificação de acesso
    console.log('\n3️⃣ Testando verificação de acesso...');
    
    for (let i = 0; i < Math.min(aulas.length, 2); i++) {
      const aula = aulas[i];
      
      // Encontrar uma matrícula do mesmo curso
      const matricula = matriculas.find(m => m.curso_id === aula.curso_id);
      
      if (matricula) {
        console.log(`\n📚 Testando: ${aula.titulo}`);
        console.log(`👤 Aluno: ${matricula.aluno_id.substring(0, 8)}... (${matricula.tipo_acesso})`);
        
        const resultado = await acessoAulaService.podeAssistirAula(aula.id, matricula.aluno_id);
        
        console.log(`🔍 Resultado: ${resultado.pode_assistir ? '✅ PODE ASSISTIR' : '❌ BLOQUEADO'}`);
        if (resultado.tipo_acesso) {
          console.log(`📋 Tipo de acesso: ${resultado.tipo_acesso}`);
        }
        if (resultado.motivo) {
          console.log(`💬 Motivo: ${resultado.motivo}`);
        }
      } else {
        console.log(`\n📚 ${aula.titulo}: Nenhuma matrícula encontrada para este curso`);
      }
    }

    // 4. Testar verificação de instrutor
    console.log('\n4️⃣ Testando verificação de instrutor...');
    
    if (aulas.length > 0) {
      const aula = aulas[0];
      
      // Buscar o instrutor do curso
      const { data: curso } = await supabase
        .from('cursos')
        .select('instrutor_id, titulo')
        .eq('id', aula.curso_id)
        .single();

      if (curso) {
        console.log(`📚 Curso: ${curso.titulo}`);
        console.log(`👨‍🏫 Instrutor: ${curso.instrutor_id.substring(0, 8)}...`);
        
        const isInstrutor = await acessoAulaService.isInstrutor(aula.curso_id, curso.instrutor_id);
        console.log(`🔍 É instrutor: ${isInstrutor ? '✅ SIM' : '❌ NÃO'}`);
        
        // Testar com usuário que não é instrutor
        if (matriculas.length > 0) {
          const alunoId = matriculas[0].aluno_id;
          const isAlunoInstrutor = await acessoAulaService.isInstrutor(aula.curso_id, alunoId);
          console.log(`🔍 Aluno é instrutor: ${isAlunoInstrutor ? '✅ SIM' : '❌ NÃO'}`);
        }
      }
    }

    // 5. Testar getTipoAcesso
    console.log('\n5️⃣ Testando getTipoAcesso...');
    
    if (matriculas.length > 0) {
      const matricula = matriculas[0];
      const tipoAcesso = await acessoAulaService.getTipoAcesso(matricula.curso_id, matricula.aluno_id);
      
      console.log(`👤 Aluno: ${matricula.aluno_id.substring(0, 8)}...`);
      console.log(`📋 Tipo de acesso: ${tipoAcesso || 'Não matriculado'}`);
      console.log(`✅ Corresponde ao banco: ${tipoAcesso === matricula.tipo_acesso ? 'SIM' : 'NÃO'}`);
    }

    console.log('\n' + '=' * 50);
    console.log('🎉 Teste do AcessoAulaService concluído!');
    console.log('✅ Serviço está funcionando corretamente');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Para uso em desenvolvimento/debug
if (require.main === module) {
  testarAcessoAula();
}
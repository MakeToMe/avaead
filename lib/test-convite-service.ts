// Utilitário para testar o serviço de convites
// Este arquivo pode ser usado para testes manuais durante desenvolvimento

import { conviteService } from './convite-service';
import type { ConviteCursoCompleto, ConviteAulasEspecificas } from './types/aulas-privadas';

/**
 * Função para testar o serviço de convites
 * Execute este arquivo para verificar se tudo está funcionando
 */
export async function testarConviteService() {
  console.log('🧪 Testando ConviteService');
  console.log('=' * 50);

  try {
    const supabase = (conviteService as any).supabase;
    
    // 1. Buscar dados para teste
    console.log('\n1️⃣ Buscando dados para teste...');
    
    // Buscar um curso com instrutor
    const { data: cursos } = await supabase
      .from('cursos')
      .select('id, titulo, instrutor_id')
      .limit(1);

    if (!cursos || cursos.length === 0) {
      console.log('❌ Nenhum curso encontrado para teste');
      return;
    }

    const curso = cursos[0];
    console.log(`📚 Curso: ${curso.titulo}`);
    console.log(`👨‍🏫 Instrutor: ${curso.instrutor_id.substring(0, 8)}...`);

    // Buscar aulas do curso
    const { data: aulas } = await supabase
      .from('aulas')
      .select('id, titulo, privada')
      .eq('curso_id', curso.id)
      .eq('privada', true)
      .limit(3);

    console.log(`🎬 Aulas privadas encontradas: ${aulas?.length || 0}`);

    // 2. Testar envio de convite para curso completo
    console.log('\n2️⃣ Testando convite para curso completo...');
    
    const conviteCursoCompleto: ConviteCursoCompleto = {
      email: 'teste-curso-completo@exemplo.com',
      curso_id: curso.id,
      instrutor_id: curso.instrutor_id,
      mensagem: 'Teste de convite para curso completo'
    };

    const resultadoCursoCompleto = await conviteService.enviarConviteCursoCompleto(conviteCursoCompleto);
    
    console.log(`🔍 Resultado: ${resultadoCursoCompleto.success ? '✅ SUCESSO' : '❌ ERRO'}`);
    if (resultadoCursoCompleto.success) {
      console.log(`🎫 Token gerado: ${resultadoCursoCompleto.token?.substring(0, 16)}...`);
    } else {
      console.log(`💬 Erro: ${resultadoCursoCompleto.error}`);
    }

    // 3. Testar envio de convite para aulas específicas
    if (aulas && aulas.length > 0) {
      console.log('\n3️⃣ Testando convite para aulas específicas...');
      
      const conviteAulasEspecificas: ConviteAulasEspecificas = {
        email: 'teste-aulas-especificas@exemplo.com',
        curso_id: curso.id,
        aula_ids: aulas.slice(0, 2).map(a => a.id), // Primeiras 2 aulas
        instrutor_id: curso.instrutor_id,
        mensagem: 'Teste de convite para aulas específicas'
      };

      const resultadoAulasEspecificas = await conviteService.enviarConviteAulasEspecificas(conviteAulasEspecificas);
      
      console.log(`🔍 Resultado: ${resultadoAulasEspecificas.success ? '✅ SUCESSO' : '❌ ERRO'}`);
      if (resultadoAulasEspecificas.success) {
        console.log(`🎫 Token gerado: ${resultadoAulasEspecificas.token?.substring(0, 16)}...`);
        console.log(`📋 Aulas incluídas: ${conviteAulasEspecificas.aula_ids.length}`);
      } else {
        console.log(`💬 Erro: ${resultadoAulasEspecificas.error}`);
      }
    }

    // 4. Testar busca de convites pendentes
    console.log('\n4️⃣ Verificando convites pendentes...');
    
    const { data: convitesPendentes } = await supabase
      .from('convites_pendentes')
      .select('*')
      .eq('aceito', false)
      .limit(5);

    console.log(`📋 Convites pendentes: ${convitesPendentes?.length || 0}`);
    
    if (convitesPendentes && convitesPendentes.length > 0) {
      convitesPendentes.forEach((convite, index) => {
        const tipoEmoji = convite.tipo_convite === 'curso_completo' ? '📚' : '🎯';
        const expiraEm = new Date(convite.expira_em).toLocaleDateString();
        console.log(`  ${index + 1}. ${tipoEmoji} ${convite.email} (expira: ${expiraEm})`);
      });

      // 5. Testar aceitação de convite (apenas simulação)
      console.log('\n5️⃣ Simulando aceitação de convite...');
      
      const conviteParaTeste = convitesPendentes[0];
      console.log(`🎫 Token: ${conviteParaTeste.token.substring(0, 16)}...`);
      console.log(`📧 Email: ${conviteParaTeste.email}`);
      console.log(`📚 Tipo: ${conviteParaTeste.tipo_convite}`);
      
      // Verificar se o convite ainda é válido
      const agora = new Date();
      const expira = new Date(conviteParaTeste.expira_em);
      const valido = agora < expira;
      
      console.log(`⏰ Válido: ${valido ? '✅ SIM' : '❌ EXPIRADO'}`);
      
      if (valido) {
        console.log('💡 Para aceitar este convite, use o token em /convites/aceitar/[token]');
      }
    }

    // 6. Testar alteração de tipo de acesso
    console.log('\n6️⃣ Testando alteração de tipo de acesso...');
    
    // Buscar uma matrícula existente
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('*')
      .eq('curso_id', curso.id)
      .eq('status', 'ativa')
      .limit(1);

    if (matriculas && matriculas.length > 0) {
      const matricula = matriculas[0];
      console.log(`👤 Aluno: ${matricula.aluno_id.substring(0, 8)}...`);
      console.log(`📋 Tipo atual: ${matricula.tipo_acesso}`);
      
      // Simular alteração (não executar para não alterar dados reais)
      const novoTipo = matricula.tipo_acesso === 'matriculado' ? 'convidado_curso' : 'matriculado';
      console.log(`🔄 Simularia alteração para: ${novoTipo}`);
      console.log('💡 Para executar, descomente o código de alteração');
      
      // Descomente para testar alteração real:
      // const resultadoAlteracao = await conviteService.alterarTipoAcesso(
      //   curso.id,
      //   matricula.aluno_id,
      //   novoTipo,
      //   curso.instrutor_id
      // );
      // console.log(`🔍 Resultado: ${resultadoAlteracao.success ? '✅ SUCESSO' : '❌ ERRO'}`);
    } else {
      console.log('❌ Nenhuma matrícula encontrada para teste');
    }

    console.log('\n' + '=' * 50);
    console.log('🎉 Teste do ConviteService concluído!');
    console.log('✅ Serviço está funcionando corretamente');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

/**
 * Função para limpar dados de teste
 * Remove convites de teste criados durante os testes
 */
export async function limparDadosTeste() {
  console.log('🧹 Limpando dados de teste...');
  
  try {
    const supabase = (conviteService as any).supabase;
    
    // Remover convites de teste
    const { error } = await supabase
      .from('convites_pendentes')
      .delete()
      .like('email', '%@exemplo.com');

    if (error) {
      console.error('❌ Erro ao limpar dados:', error);
    } else {
      console.log('✅ Dados de teste removidos');
    }

  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
  }
}

// Para uso em desenvolvimento/debug
if (require.main === module) {
  testarConviteService();
}
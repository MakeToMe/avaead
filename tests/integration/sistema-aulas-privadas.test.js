/**
 * Testes de integração para o sistema híbrido de aulas privadas
 * 
 * Estes testes validam os fluxos completos do sistema:
 * 1. Convite para curso completo
 * 2. Convite para aulas específicas
 * 3. Verificação de acesso em diferentes cenários
 * 4. Gerenciamento de permissões por instrutores
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase para testes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Dados de teste
const testData = {
  instrutor: {
    id: 'test-instrutor-id',
    nome: 'Professor Teste',
    email: 'instrutor@teste.com'
  },
  curso: {
    id: 'test-curso-id',
    titulo: 'Curso de Teste',
    instrutor_id: 'test-instrutor-id'
  },
  aluno: {
    id: 'test-aluno-id',
    nome: 'Aluno Teste',
    email: 'aluno@teste.com'
  },
  aulas: [
    {
      id: 'test-aula-publica-id',
      titulo: 'Aula Pública',
      privada: false,
      curso_id: 'test-curso-id'
    },
    {
      id: 'test-aula-privada-1-id',
      titulo: 'Aula Privada 1',
      privada: true,
      curso_id: 'test-curso-id'
    },
    {
      id: 'test-aula-privada-2-id',
      titulo: 'Aula Privada 2',
      privada: true,
      curso_id: 'test-curso-id'
    }
  ]
};

describe('Sistema Híbrido de Aulas Privadas - Testes de Integração', () => {
  
  beforeAll(async () => {
    // Limpar dados de teste anteriores
    await limparDadosTeste();
    
    // Criar dados de teste
    await criarDadosTeste();
  });

  afterAll(async () => {
    // Limpar dados de teste
    await limparDadosTeste();
  });

  describe('Fluxo 1: Convite para Curso Completo', () => {
    let tokenConvite;

    test('1.1 - Instrutor envia convite para curso completo', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/cursos/${testData.curso.id}/convites/curso-completo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testData.aluno.email,
          mensagem: 'Bem-vindo ao curso!',
          instrutor_id: testData.instrutor.id
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      
      tokenConvite = data.token;

      // Verificar se convite foi salvo no banco
      const { data: convite } = await supabase
        .from('convites_pendentes')
        .select('*')
        .eq('token', tokenConvite)
        .single();

      expect(convite).toBeDefined();
      expect(convite.tipo_convite).toBe('curso_completo');
      expect(convite.email).toBe(testData.aluno.email);
    });

    test('1.2 - Aluno aceita convite para curso completo', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/convites/aceitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenConvite
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.sucesso).toBe(true);
      expect(data.curso_id).toBe(testData.curso.id);

      // Verificar se matrícula foi criada com tipo correto
      const { data: matricula } = await supabase
        .from('matriculas')
        .select('*')
        .eq('curso_id', testData.curso.id)
        .eq('aluno_id', testData.aluno.id)
        .single();

      expect(matricula).toBeDefined();
      expect(matricula.tipo_acesso).toBe('convidado_curso');
    });

    test('1.3 - Aluno com acesso total pode acessar todas as aulas', async () => {
      // Testar acesso a aula pública
      const responsePublica = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[0].id}/verificar-acesso?usuario_id=${testData.aluno.id}`
      );
      const dataPublica = await responsePublica.json();
      
      expect(dataPublica.permitido).toBe(true);
      expect(dataPublica.tipo_acesso).toBe('aula_publica');

      // Testar acesso a aulas privadas
      for (let i = 1; i < testData.aulas.length; i++) {
        const responsePrivada = await fetch(
          `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[i].id}/verificar-acesso?usuario_id=${testData.aluno.id}`
        );
        const dataPrivada = await responsePrivada.json();
        
        expect(dataPrivada.permitido).toBe(true);
        expect(dataPrivada.tipo_acesso).toBe('convidado_curso');
      }
    });
  });

  describe('Fluxo 2: Convite para Aulas Específicas', () => {
    let novoAlunoId = 'test-aluno-especifico-id';
    let tokenConviteEspecifico;

    beforeAll(async () => {
      // Criar novo aluno para teste de convite específico
      await supabase.from('users').insert({
        id: novoAlunoId,
        nome: 'Aluno Específico',
        email: 'aluno.especifico@teste.com'
      });

      // Criar matrícula básica
      await supabase.from('matriculas').insert({
        aluno_id: novoAlunoId,
        curso_id: testData.curso.id,
        tipo_acesso: 'matriculado',
        status: 'ativa'
      });
    });

    test('2.1 - Instrutor envia convite para aulas específicas', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/cursos/${testData.curso.id}/convites/aulas-especificas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'aluno.especifico@teste.com',
          aula_ids: [testData.aulas[1].id], // Apenas primeira aula privada
          mensagem: 'Acesso à aula específica',
          instrutor_id: testData.instrutor.id
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      
      tokenConviteEspecifico = data.token;
    });

    test('2.2 - Aluno aceita convite para aulas específicas', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/convites/aceitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenConviteEspecifico
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.sucesso).toBe(true);

      // Verificar se permissão específica foi criada
      const { data: permissao } = await supabase
        .from('aula_permissoes')
        .select('*')
        .eq('aula_id', testData.aulas[1].id)
        .eq('aluno_id', novoAlunoId)
        .single();

      expect(permissao).toBeDefined();
      expect(permissao.tipo_permissao).toBe('convite_especifico');
    });

    test('2.3 - Aluno tem acesso apenas às aulas específicas', async () => {
      // Deve ter acesso à aula pública
      const responsePublica = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[0].id}/verificar-acesso?usuario_id=${novoAlunoId}`
      );
      const dataPublica = await responsePublica.json();
      expect(dataPublica.permitido).toBe(true);

      // Deve ter acesso à aula privada específica
      const responsePrivada1 = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[1].id}/verificar-acesso?usuario_id=${novoAlunoId}`
      );
      const dataPrivada1 = await responsePrivada1.json();
      expect(dataPrivada1.permitido).toBe(true);
      expect(dataPrivada1.tipo_acesso).toBe('convite_especifico');

      // NÃO deve ter acesso à segunda aula privada
      const responsePrivada2 = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[2].id}/verificar-acesso?usuario_id=${novoAlunoId}`
      );
      const dataPrivada2 = await responsePrivada2.json();
      expect(dataPrivada2.permitido).toBe(false);
      expect(dataPrivada2.motivo).toContain('convite específico');
    });
  });

  describe('Fluxo 3: Gerenciamento de Permissões por Instrutores', () => {
    let alunoMatriculadoId = 'test-aluno-matriculado-id';

    beforeAll(async () => {
      // Criar aluno matriculado básico
      await supabase.from('users').insert({
        id: alunoMatriculadoId,
        nome: 'Aluno Matriculado',
        email: 'aluno.matriculado@teste.com'
      });

      await supabase.from('matriculas').insert({
        aluno_id: alunoMatriculadoId,
        curso_id: testData.curso.id,
        tipo_acesso: 'matriculado',
        status: 'ativa'
      });
    });

    test('3.1 - Instrutor concede permissão específica para aula', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[1].id}/permissoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aluno_id: alunoMatriculadoId,
          tipo_permissao: 'convite_especifico'
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verificar se aluno agora tem acesso
      const responseAcesso = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[1].id}/verificar-acesso?usuario_id=${alunoMatriculadoId}`
      );
      const dataAcesso = await responseAcesso.json();
      expect(dataAcesso.permitido).toBe(true);
      expect(dataAcesso.tipo_acesso).toBe('convite_especifico');
    });

    test('3.2 - Instrutor promove aluno para convidado do curso', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/cursos/${testData.curso.id}/alunos/${alunoMatriculadoId}/tipo-acesso`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo_acesso: 'convidado_curso'
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verificar se aluno agora tem acesso total
      const responseAcesso = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[2].id}/verificar-acesso?usuario_id=${alunoMatriculadoId}`
      );
      const dataAcesso = await responseAcesso.json();
      expect(dataAcesso.permitido).toBe(true);
      expect(dataAcesso.tipo_acesso).toBe('convidado_curso');
    });

    test('3.3 - Instrutor remove permissão específica', async () => {
      // Primeiro, rebaixar para matriculado
      await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/cursos/${testData.curso.id}/alunos/${alunoMatriculadoId}/tipo-acesso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_acesso: 'matriculado' })
      });

      // Remover permissão específica
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[1].id}/permissoes/${alunoMatriculadoId}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);

      // Verificar se aluno perdeu acesso
      const responseAcesso = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[1].id}/verificar-acesso?usuario_id=${alunoMatriculadoId}`
      );
      const dataAcesso = await responseAcesso.json();
      expect(dataAcesso.permitido).toBe(false);
    });
  });

  describe('Fluxo 4: Cenários de Erro e Validação', () => {
    test('4.1 - Convite com email inválido deve falhar', async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/cursos/${testData.curso.id}/convites/curso-completo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'email-invalido',
          instrutor_id: testData.instrutor.id
        })
      });

      expect(response.status).toBe(400);
    });

    test('4.2 - Acesso com token expirado deve falhar', async () => {
      // Criar convite com data de expiração no passado
      const { data: conviteExpirado } = await supabase
        .from('convites_pendentes')
        .insert({
          email: 'teste@expirado.com',
          curso_id: testData.curso.id,
          tipo_convite: 'curso_completo',
          enviado_por: testData.instrutor.id,
          token: 'token-expirado-123',
          expira_em: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 dia atrás
        })
        .select()
        .single();

      const response = await fetch(`${process.env.NEXT_PUBLIC_URL_BASE}/api/convites/aceitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'token-expirado-123' })
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.sucesso).toBe(false);
      expect(data.erro).toContain('expirado');
    });

    test('4.3 - Usuário não matriculado não deve ter acesso', async () => {
      const usuarioNaoMatriculado = 'usuario-nao-matriculado-id';
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL_BASE}/api/aulas/${testData.aulas[0].id}/verificar-acesso?usuario_id=${usuarioNaoMatriculado}`
      );
      
      const data = await response.json();
      expect(data.permitido).toBe(false);
      expect(data.motivo).toContain('não está matriculado');
    });
  });
});

// Funções auxiliares para setup e cleanup dos testes

async function criarDadosTeste() {
  try {
    // Criar usuário instrutor
    await supabase.from('users').upsert({
      id: testData.instrutor.id,
      nome: testData.instrutor.nome,
      email: testData.instrutor.email
    });

    // Criar usuário aluno
    await supabase.from('users').upsert({
      id: testData.aluno.id,
      nome: testData.aluno.nome,
      email: testData.aluno.email
    });

    // Criar curso
    await supabase.from('cursos').upsert({
      id: testData.curso.id,
      titulo: testData.curso.titulo,
      instrutor_id: testData.curso.instrutor_id,
      ativo: true
    });

    // Criar aulas
    for (const aula of testData.aulas) {
      await supabase.from('aulas').upsert({
        id: aula.id,
        titulo: aula.titulo,
        privada: aula.privada,
        curso_id: aula.curso_id,
        ativo: true
      });
    }

    console.log('✅ Dados de teste criados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
    throw error;
  }
}

async function limparDadosTeste() {
  try {
    // Limpar na ordem correta devido às foreign keys
    await supabase.from('aula_permissoes').delete().in('aula_id', testData.aulas.map(a => a.id));
    await supabase.from('convites_pendentes').delete().eq('curso_id', testData.curso.id);
    await supabase.from('matriculas').delete().eq('curso_id', testData.curso.id);
    await supabase.from('aulas').delete().in('id', testData.aulas.map(a => a.id));
    await supabase.from('cursos').delete().eq('id', testData.curso.id);
    await supabase.from('users').delete().in('id', [
      testData.instrutor.id, 
      testData.aluno.id,
      'test-aluno-especifico-id',
      'test-aluno-matriculado-id'
    ]);

    console.log('🧹 Dados de teste limpos com sucesso');
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error);
  }
}

module.exports = {
  criarDadosTeste,
  limparDadosTeste,
  testData
};
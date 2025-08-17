/**
 * Testes End-to-End para o Sistema Híbrido de Aulas Privadas
 * 
 * Estes testes simulam fluxos completos de usuário real:
 * - Instrutor gerenciando alunos e enviando convites
 * - Aluno recebendo e aceitando convites
 * - Navegação e acesso a aulas
 * - Verificação de permissões em tempo real
 */

const { test, expect } = require('@playwright/test');

// Configuração de dados de teste
const testConfig = {
  baseURL: process.env.NEXT_PUBLIC_URL_BASE || 'http://localhost:3000',
  instrutor: {
    email: 'instrutor.e2e@teste.com',
    senha: 'senha123',
    nome: 'Professor E2E'
  },
  aluno: {
    email: 'aluno.e2e@teste.com',
    nome: 'Aluno E2E'
  },
  curso: {
    titulo: 'Curso E2E Test',
    id: 'curso-e2e-test-id'
  }
};

test.describe('Sistema Híbrido de Aulas Privadas - E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Configurar interceptadores para APIs
    await page.route('**/api/**', async (route) => {
      // Log de todas as chamadas API para debug
      console.log(`API Call: ${route.request().method()} ${route.request().url()}`);
      await route.continue();
    });
  });

  test.describe('Fluxo Completo: Instrutor → Aluno', () => {
    
    test('Deve permitir instrutor enviar convite e aluno aceitar', async ({ page, context }) => {
      // === PARTE 1: INSTRUTOR ENVIA CONVITE ===
      
      // 1. Login como instrutor
      await page.goto('/login');
      await page.fill('[data-testid="email"]', testConfig.instrutor.email);
      await page.fill('[data-testid="senha"]', testConfig.instrutor.senha);
      await page.click('[data-testid="login-button"]');
      
      // Aguardar redirecionamento
      await page.waitForURL('/dashboard');
      
      // 2. Navegar para gerenciamento de alunos
      await page.goto(`/dashboard/cursos/${testConfig.curso.id}/alunos`);
      
      // Verificar se página carregou
      await expect(page.locator('h1')).toContainText('Gerenciar Alunos');
      
      // 3. Abrir modal de convite para curso completo
      await page.click('[data-testid="convidar-curso-completo"]');
      
      // Aguardar modal aparecer
      await expect(page.locator('[data-testid="modal-convite-curso"]')).toBeVisible();
      
      // 4. Preencher dados do convite
      await page.fill('[data-testid="email-aluno"]', testConfig.aluno.email);
      await page.fill('[data-testid="mensagem-convite"]', 'Bem-vindo ao curso de teste E2E!');
      
      // 5. Enviar convite
      await page.click('[data-testid="enviar-convite"]');
      
      // Aguardar confirmação
      await expect(page.locator('[data-testid="sucesso-convite"]')).toBeVisible();
      await expect(page.locator('[data-testid="sucesso-convite"]')).toContainText('Convite enviado');
      
      // Capturar token do convite (se disponível na UI)
      const tokenElement = page.locator('[data-testid="token-convite"]');
      let tokenConvite = '';
      if (await tokenElement.isVisible()) {
        tokenConvite = await tokenElement.textContent();
      }
      
      // === PARTE 2: ALUNO ACEITA CONVITE ===
      
      // 6. Simular clique no link do email (nova aba/contexto)
      const novaAba = await context.newPage();
      
      // Se temos o token, usar diretamente, senão simular
      if (tokenConvite) {
        await novaAba.goto(`/convites/aceitar/${tokenConvite}`);
      } else {
        // Simular acesso via link de email
        await novaAba.goto('/convites/aceitar/token-simulado-e2e');
      }
      
      // 7. Verificar página de aceitação
      await expect(novaAba.locator('h1')).toContainText('Convite aceito');
      
      // 8. Clicar para acessar curso
      await novaAba.click('[data-testid="acessar-curso"]');
      
      // 9. Verificar redirecionamento para curso
      await novaAba.waitForURL(`/cursos/${testConfig.curso.id}`);
      
      // 10. Verificar badge de acesso total
      await expect(novaAba.locator('[data-testid="badge-acesso"]')).toContainText('Convidado do Curso');
      
      // === PARTE 3: VERIFICAR PERMISSÕES ===
      
      // 11. Verificar acesso a aulas privadas
      const aulasPrivadas = novaAba.locator('[data-testid="aula-privada"]');
      const count = await aulasPrivadas.count();
      
      for (let i = 0; i < count; i++) {
        const aula = aulasPrivadas.nth(i);
        await expect(aula.locator('[data-testid="botao-assistir"]')).toBeVisible();
        await expect(aula.locator('[data-testid="badge-acesso-total"]')).toBeVisible();
      }
      
      // 12. Tentar acessar uma aula privada
      if (count > 0) {
        await aulasPrivadas.first().locator('[data-testid="botao-assistir"]').click();
        
        // Verificar se conseguiu acessar (não foi redirecionado para acesso negado)
        await expect(novaAba).not.toHaveURL(/acesso-negado/);
      }
      
      await novaAba.close();
    });
    
    test('Deve permitir convite para aulas específicas', async ({ page }) => {
      // Login como instrutor
      await page.goto('/login');
      await page.fill('[data-testid="email"]', testConfig.instrutor.email);
      await page.fill('[data-testid="senha"]', testConfig.instrutor.senha);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('/dashboard');
      
      // Navegar para gerenciamento
      await page.goto(`/dashboard/cursos/${testConfig.curso.id}/alunos`);
      
      // Abrir modal de convite específico
      await page.click('[data-testid="convidar-aulas-especificas"]');
      
      await expect(page.locator('[data-testid="modal-convite-aulas"]')).toBeVisible();
      
      // Preencher email
      await page.fill('[data-testid="email-aluno"]', 'aluno.especifico@teste.com');
      
      // Selecionar algumas aulas
      const checkboxes = page.locator('[data-testid="checkbox-aula"]');
      const count = await checkboxes.count();
      
      if (count > 0) {
        // Selecionar primeira aula
        await checkboxes.first().check();
        
        // Verificar se foi selecionada
        await expect(checkboxes.first()).toBeChecked();
      }
      
      // Enviar convite
      await page.click('[data-testid="enviar-convite-especifico"]');
      
      // Verificar sucesso
      await expect(page.locator('[data-testid="sucesso-convite"]')).toBeVisible();
    });
  });

  test.describe('Gerenciamento de Permissões', () => {
    
    test('Deve permitir gerenciar permissões de aula específica', async ({ page }) => {
      // Login como instrutor
      await page.goto('/login');
      await page.fill('[data-testid="email"]', testConfig.instrutor.email);
      await page.fill('[data-testid="senha"]', testConfig.instrutor.senha);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('/dashboard');
      
      // Navegar para uma aula privada específica
      await page.goto('/dashboard/aulas/aula-privada-test/permissoes');
      
      // Verificar se página carregou
      await expect(page.locator('h1')).toContainText('Gerenciar Permissões');
      
      // Verificar seções de alunos
      await expect(page.locator('[data-testid="alunos-com-acesso"]')).toBeVisible();
      await expect(page.locator('[data-testid="alunos-sem-acesso"]')).toBeVisible();
      
      // Tentar conceder permissão a um aluno
      const botoesPermissao = page.locator('[data-testid="dar-acesso"]');
      const count = await botoesPermissao.count();
      
      if (count > 0) {
        await botoesPermissao.first().click();
        
        // Aguardar processamento
        await expect(page.locator('[data-testid="processando"]')).toBeVisible();
        await expect(page.locator('[data-testid="processando"]')).not.toBeVisible();
        
        // Verificar se aluno foi movido para seção "com acesso"
        // (implementação específica dependeria da estrutura da página)
      }
    });
    
    test('Deve permitir promover/rebaixar alunos', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email"]', testConfig.instrutor.email);
      await page.fill('[data-testid="senha"]', testConfig.instrutor.senha);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('/dashboard');
      
      await page.goto(`/dashboard/cursos/${testConfig.curso.id}/alunos`);
      
      // Procurar aluno matriculado para promover
      const botoesPromover = page.locator('[data-testid="promover-aluno"]');
      const count = await botoesPromover.count();
      
      if (count > 0) {
        // Promover primeiro aluno
        await botoesPromover.first().click();
        
        // Aguardar processamento
        await page.waitForTimeout(1000);
        
        // Verificar se aluno foi movido para seção de convidados
        await expect(page.locator('[data-testid="convidados-curso"]')).toContainText('1');
      }
    });
  });

  test.describe('Interface do Aluno', () => {
    
    test('Deve mostrar badges de acesso corretos', async ({ page }) => {
      // Simular login como aluno
      await page.goto('/login');
      await page.fill('[data-testid="email"]', testConfig.aluno.email);
      await page.fill('[data-testid="senha"]', 'senha123');
      await page.click('[data-testid="login-button"]');
      
      // Navegar para curso
      await page.goto(`/cursos/${testConfig.curso.id}`);
      
      // Verificar resumo de acesso
      await expect(page.locator('[data-testid="resumo-acesso"]')).toBeVisible();
      
      // Verificar badges nas aulas
      const aulas = page.locator('[data-testid="aula-item"]');
      const count = await aulas.count();
      
      for (let i = 0; i < count; i++) {
        const aula = aulas.nth(i);
        
        // Cada aula deve ter um badge de status
        await expect(aula.locator('[data-testid="badge-status"]')).toBeVisible();
        
        // Verificar se badge corresponde ao botão de ação
        const badge = await aula.locator('[data-testid="badge-status"]').textContent();
        
        if (badge?.includes('Pública') || badge?.includes('Acesso Total')) {
          await expect(aula.locator('[data-testid="botao-assistir"]')).toBeVisible();
        } else if (badge?.includes('Bloqueada')) {
          await expect(aula.locator('[data-testid="botao-bloqueado"]')).toBeVisible();
        }
      }
    });
    
    test('Deve bloquear acesso a aulas sem permissão', async ({ page }) => {
      // Login como aluno com acesso limitado
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'aluno.limitado@teste.com');
      await page.fill('[data-testid="senha"]', 'senha123');
      await page.click('[data-testid="login-button"]');
      
      // Tentar acessar aula privada diretamente via URL
      await page.goto('/cursos/curso-test/aulas/aula-privada-restrita');
      
      // Deve ser redirecionado para página de acesso negado
      await expect(page).toHaveURL(/acesso-negado/);
      
      // Verificar mensagem de erro
      await expect(page.locator('h1')).toContainText('Acesso Restrito');
      await expect(page.locator('[data-testid="motivo-bloqueio"]')).toContainText('convite específico');
    });
  });

  test.describe('Sistema de Auditoria', () => {
    
    test('Deve registrar eventos de auditoria', async ({ page }) => {
      // Login como admin
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'admin@teste.com');
      await page.fill('[data-testid="senha"]', 'admin123');
      await page.click('[data-testid="login-button"]');
      
      // Acessar dashboard de auditoria
      await page.goto('/admin/auditoria');
      
      // Verificar se página carregou
      await expect(page.locator('h1')).toContainText('Dashboard de Auditoria');
      
      // Verificar métricas
      await expect(page.locator('[data-testid="eventos-hoje"]')).toBeVisible();
      await expect(page.locator('[data-testid="usuarios-ativos"]')).toBeVisible();
      
      // Verificar lista de eventos
      await expect(page.locator('[data-testid="lista-eventos"]')).toBeVisible();
      
      // Testar filtros
      await page.selectOption('[data-testid="filtro-tipo-evento"]', 'convite_enviado');
      await page.click('[data-testid="aplicar-filtros"]');
      
      // Aguardar atualização
      await page.waitForTimeout(1000);
      
      // Verificar se filtro foi aplicado
      const eventos = page.locator('[data-testid="evento-item"]');
      const count = await eventos.count();
      
      if (count > 0) {
        // Todos os eventos visíveis devem ser do tipo selecionado
        for (let i = 0; i < count; i++) {
          await expect(eventos.nth(i)).toContainText('CONVITE_ENVIADO');
        }
      }
    });
  });

  test.describe('Validação de Segurança', () => {
    
    test('Deve impedir acesso não autorizado a APIs', async ({ page }) => {
      // Tentar acessar API sem autenticação
      const response = await page.request.get('/api/cursos/curso-test/alunos');
      expect(response.status()).toBe(401);
    });
    
    test('Deve validar permissões de instrutor', async ({ page }) => {
      // Login como aluno (não instrutor)
      await page.goto('/login');
      await page.fill('[data-testid="email"]', testConfig.aluno.email);
      await page.fill('[data-testid="senha"]', 'senha123');
      await page.click('[data-testid="login-button"]');
      
      // Tentar acessar página de gerenciamento (deve ser bloqueado)
      await page.goto(`/dashboard/cursos/${testConfig.curso.id}/alunos`);
      
      // Deve ser redirecionado ou mostrar erro
      await expect(page).toHaveURL(/acesso-negado|login|dashboard/);
    });
  });

  test.describe('Performance e Usabilidade', () => {
    
    test('Deve carregar páginas rapidamente', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`/cursos/${testConfig.curso.id}`);
      
      // Aguardar carregamento completo
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Página deve carregar em menos de 3 segundos
      expect(loadTime).toBeLessThan(3000);
    });
    
    test('Deve ser responsivo em dispositivos móveis', async ({ page }) => {
      // Simular dispositivo móvel
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`/cursos/${testConfig.curso.id}`);
      
      // Verificar se elementos principais estão visíveis
      await expect(page.locator('[data-testid="resumo-acesso"]')).toBeVisible();
      await expect(page.locator('[data-testid="lista-aulas"]')).toBeVisible();
      
      // Verificar se botões são clicáveis em mobile
      const botoes = page.locator('button');
      const count = await botoes.count();
      
      if (count > 0) {
        const botao = botoes.first();
        const box = await botao.boundingBox();
        
        // Botões devem ter tamanho mínimo para touch
        expect(box?.height).toBeGreaterThan(44);
      }
    });
  });
});

// Utilitários para testes E2E
class E2ETestUtils {
  
  static async criarDadosTeste(page) {
    // Criar dados de teste via API ou interface
    await page.evaluate(() => {
      // Código para criar dados de teste
      console.log('Criando dados de teste...');
    });
  }
  
  static async limparDadosTeste(page) {
    // Limpar dados de teste
    await page.evaluate(() => {
      console.log('Limpando dados de teste...');
    });
  }
  
  static async aguardarCarregamento(page, seletor) {
    await page.waitForSelector(seletor, { state: 'visible' });
    await page.waitForLoadState('networkidle');
  }
  
  static async capturarScreenshot(page, nome) {
    await page.screenshot({ 
      path: `tests/screenshots/${nome}-${Date.now()}.png`,
      fullPage: true 
    });
  }
}

module.exports = { E2ETestUtils };
# Implementation Plan

- [x] 1. Criar utilitário de upload com progresso
  - Implementar função `uploadWithProgress` usando XMLHttpRequest
  - Adicionar cálculo de velocidade e tempo estimado em tempo real
  - Implementar tratamento de erros e timeouts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Criar hook personalizado para gerenciar estado de upload
  - Implementar hook `useUpload` com estados reativo
  - Adicionar controle de ciclo de vida do upload (idle, uploading, success, error)
  - Implementar callbacks para sucesso e erro
  - Adicionar função de reset do estado
  - _Requirements: 1.1, 2.4, 4.1, 4.2, 4.3_

- [x] 3. Criar componentes visuais de progresso
  - Implementar componente `UploadProgressInline` com barra verde translúcida
  - Adicionar exibição de porcentagem, velocidade e tempo estimado
  - Implementar componente `UploadSuccessCard` para confirmação final
  - Adicionar responsividade e acessibilidade (ARIA labels)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Integrar componentes na página de adicionar aulas
  - Substituir upload atual pelo hook `useUpload`
  - Adicionar componente de progresso logo acima dos botões de ação
  - Implementar travamento de campos durante upload
  - Adicionar lógica de exibição do card de sucesso
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.3, 5.3_

- [x] 5. Implementar controle de estado dos campos do formulário
  - Desabilitar todos os campos durante upload
  - Desabilitar botão "Cancelar" durante upload
  - Alterar texto do botão "Criar Aula" para "Enviando..." durante upload
  - Reabilitar campos após sucesso ou erro
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Implementar navegação e persistência de sessão
  - Garantir que a sessão do usuário seja mantida durante upload
  - Implementar navegação para `/minhas-aulas` após sucesso
  - Adicionar botão "Voltar para Minhas Aulas" no card de sucesso
  - Testar que o usuário não seja deslogado automaticamente
  - _Requirements: 3.2, 3.4, 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Adicionar tratamento de erros e feedback visual
  - Implementar exibição de erros de upload na interface
  - Adicionar toasts informativos para diferentes estágios
  - Implementar retry automático para erros de rede
  - Adicionar validação de arquivo antes do upload
  - _Requirements: 2.5, 4.3_

- [ ] 8. Implementar testes unitários para componentes
  - Criar testes para o utilitário `uploadWithProgress`
  - Criar testes para o hook `useUpload`
  - Criar testes para componentes de progresso
  - Testar cálculos de velocidade e tempo estimado
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 9. Implementar testes de integração
  - Testar fluxo completo de upload com progresso
  - Testar travamento e destravamento de campos
  - Testar navegação após sucesso
  - Testar comportamento em caso de erro
  - _Requirements: 2.1, 2.4, 3.4, 4.4_

- [ ] 10. Otimizar performance e acessibilidade
  - Implementar throttling de updates de progresso (100ms)
  - Adicionar suporte a prefers-reduced-motion
  - Otimizar re-renders com useMemo e useCallback
  - Adicionar cleanup de event listeners
  - _Requirements: 5.1, 5.2, 5.5_
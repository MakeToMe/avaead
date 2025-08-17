# Implementation Plan

- [x] 1. Executar migração do banco de dados





  - Criar script de migração para adicionar coluna `tipo_acesso` à tabela `matriculas`
  - Criar tabela `aula_permissoes` com todas as constraints e índices
  - Criar tabela `convites_pendentes` para gerenciar convites por email
  - Executar migração no banco de dados de desenvolvimento
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implementar serviço de verificação de acesso a aulas



  - Criar classe `AcessoAulaService` com método `podeAssistirAula`
  - Implementar lógica de verificação para aulas públicas e privadas
  - Implementar verificação de tipos de acesso (matriculado, convidado_curso, convite_específico)
  - Criar testes unitários para todas as regras de acesso
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3. Implementar serviço de gerenciamento de convites



  - Criar classe `ConviteService` com métodos para enviar convites
  - Implementar `enviarConviteCursoCompleto` para convites de acesso total
  - Implementar `enviarConviteAulasEspecificas` para convites granulares
  - Implementar `aceitarConvite` para processar aceitação de convites
  - Criar testes unitários para todos os métodos de convite
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 4. Criar APIs para gerenciamento de convites



  - Implementar endpoint `POST /api/cursos/[id]/convites/curso-completo`
  - Implementar endpoint `POST /api/cursos/[id]/convites/aulas-especificas`
  - Implementar endpoint `PUT /api/cursos/[id]/alunos/[aluno_id]/tipo-acesso`
  - Implementar endpoint `GET /api/cursos/[id]/aulas/acesso` para verificação de permissões
  - Adicionar validação de dados com schemas Zod
  - Implementar middleware de tratamento de erros
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 5. Criar APIs para gerenciamento de permissões de aulas



  - Implementar endpoint `POST /api/aulas/[id]/permissoes` para conceder permissões específicas
  - Implementar endpoint `DELETE /api/aulas/[id]/permissoes/[aluno_id]` para remover permissões
  - Implementar endpoint `GET /api/aulas/[id]/permissoes` para listar permissões de uma aula
  - Adicionar validação de autorização (apenas instrutores podem gerenciar)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Implementar sistema de templates de email



  - Criar serviço webhook para integração com n8n
  - Implementar payload estruturado para convite de curso completo
  - Implementar payload estruturado para convite de aulas específicas
  - Criar sistema de tokens únicos para links de convite
  - Implementar página de aceitação de convites
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Criar dashboard do instrutor para gerenciamento de alunos



  - Implementar componente `GerenciarAlunos` com listagem por tipo de acesso
  - Criar interface para promover alunos matriculados para convidados do curso
  - Criar interface para rebaixar convidados do curso para matriculados
  - Implementar modal para envio de convites de curso completo
  - Implementar modal para envio de convites de aulas específicas
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Criar interface de gerenciamento de aulas privadas



  - Implementar componente para visualizar alunos com acesso a uma aula específica
  - Criar interface para conceder permissões específicas a alunos matriculados
  - Criar interface para remover permissões específicas de alunos
  - Implementar filtros e busca para facilitar gerenciamento
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Atualizar interface do aluno com badges de acesso



  - Implementar componente `ListaAulas` com indicadores visuais de acesso
  - Criar badges para diferentes tipos de acesso (Matriculado, Convidado do Curso, Convite Específico)
  - Implementar bloqueio visual para aulas privadas sem permissão
  - Adicionar explicações claras sobre motivos de bloqueio/acesso
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 10. Implementar middleware de verificação de acesso em aulas


  - Criar middleware para verificar permissões antes de exibir conteúdo de aulas
  - Integrar verificação de acesso no player de vídeo
  - Implementar redirecionamento para página de erro quando acesso negado
  - Adicionar logs de auditoria para tentativas de acesso
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.1, 10.2, 10.3, 10.4_

- [x] 11. Criar testes de integração para fluxos completos


  - Implementar testes para fluxo completo de convite para curso
  - Implementar testes para fluxo completo de convite para aulas específicas
  - Criar testes para verificação de acesso em diferentes cenários
  - Implementar testes para gerenciamento de permissões por instrutores
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 12. Implementar sistema de auditoria e logs


  - Criar logs para todas as operações de concessão/remoção de permissões
  - Implementar rastreamento de quem concedeu cada permissão e quando
  - Criar logs para aceitação de convites e alterações de tipo de acesso
  - Implementar dashboard de auditoria para administradores
  - _Requirements: 10.1, 10.2, 10.3, 10.4_



- [ ] 13. Criar documentação e guias de uso
  - Escrever documentação técnica das APIs implementadas
  - Criar guia de uso para instrutores sobre como gerenciar convites
  - Criar guia de uso para alunos sobre tipos de acesso
  - Documentar processo de migração e rollback



  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 14. Executar testes end-to-end e validação final
  - Executar suite completa de testes automatizados
  - Realizar testes manuais de todos os fluxos de usuário
  - Validar performance com dados de teste em volume
  - Verificar compatibilidade com sistema existente
  - Executar testes de rollback da migração
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1_
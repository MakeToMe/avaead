# Requirements Document

## Introduction

A funcionalidade de barra de progresso de upload na página `/minhas-aulas/adicionar` foi perdida durante atualizações recentes. Esta funcionalidade era essencial para fornecer feedback visual detalhado durante o upload de arquivos de mídia (vídeos e PDFs), incluindo progresso em tempo real, velocidade de upload, tempo estimado e travamento de campos durante o processo. Quando o upload era concluído, aparecia um card resumo com botão para voltar. Atualmente, o upload funciona mas sem feedback visual, e o usuário é deslogado ao final do processo.

## Requirements

### Requirement 1

**User Story:** Como um instrutor fazendo upload de um arquivo de mídia, eu quero ver uma barra de progresso detalhada em tempo real, para que eu possa acompanhar o status do upload e saber quanto tempo falta para concluir.

#### Acceptance Criteria

1. WHEN eu seleciono um arquivo e clico em "Criar Aula" THEN o sistema SHALL exibir uma barra de progresso verde translúcida logo acima dos botões "Cancelar" e "Criar Aula"
2. WHEN o upload está em progresso THEN o sistema SHALL mostrar a porcentagem exata (ex: 45.2%)
3. WHEN o upload está em progresso THEN o sistema SHALL mostrar os bytes enviados vs total (ex: 550.5 MB / 1.22 GB)
4. WHEN o upload está em progresso THEN o sistema SHALL mostrar a velocidade de upload em tempo real
5. WHEN o upload está em progresso THEN o sistema SHALL mostrar o tempo estimado restante
6. WHEN o upload está em progresso THEN o sistema SHALL mostrar o estágio atual (ex: "Enviando arquivo...")

### Requirement 2

**User Story:** Como um instrutor durante o processo de upload, eu quero que todos os campos do formulário sejam travados, para que eu não possa fazer edições indevidas que possam interferir no processo.

#### Acceptance Criteria

1. WHEN o upload está em progresso THEN o sistema SHALL desabilitar todos os campos do formulário
2. WHEN o upload está em progresso THEN o sistema SHALL desabilitar o botão "Cancelar"
3. WHEN o upload está em progresso THEN o sistema SHALL manter apenas o botão "Criar Aula" visível com texto "Enviando..."
4. WHEN o upload é concluído THEN o sistema SHALL reabilitar os campos do formulário
5. WHEN há erro no upload THEN o sistema SHALL reabilitar os campos do formulário

### Requirement 3

**User Story:** Como um instrutor que concluiu o upload com sucesso, eu quero ver um card de resumo com as informações da aula criada e um botão para voltar, para que eu tenha confirmação visual do sucesso e possa navegar facilmente.

#### Acceptance Criteria

1. WHEN o upload e criação da aula são concluídos com sucesso THEN o sistema SHALL exibir um card de resumo
2. WHEN o card de resumo é exibido THEN o sistema SHALL mostrar o título da aula criada
3. WHEN o card de resumo é exibido THEN o sistema SHALL mostrar um botão "Voltar para Minhas Aulas"
4. WHEN eu clico no botão "Voltar" THEN o sistema SHALL navegar para `/minhas-aulas`
5. WHEN o card de resumo é exibido THEN o sistema SHALL ocultar o formulário de criação

### Requirement 4

**User Story:** Como um instrutor, eu quero que o sistema mantenha minha sessão ativa durante todo o processo de upload, para que eu não seja deslogado automaticamente ao final do processo.

#### Acceptance Criteria

1. WHEN o upload está em progresso THEN o sistema SHALL manter a sessão do usuário ativa
2. WHEN o upload é concluído THEN o sistema SHALL manter o usuário logado
3. WHEN há erro no upload THEN o sistema SHALL manter o usuário logado
4. WHEN a aula é criada com sucesso THEN o sistema SHALL manter o usuário logado

### Requirement 5

**User Story:** Como um instrutor, eu quero que a barra de progresso seja visualmente atrativa e consistente com o design da aplicação, para que a experiência seja profissional e agradável.

#### Acceptance Criteria

1. WHEN a barra de progresso é exibida THEN o sistema SHALL usar cor verde translúcida
2. WHEN a barra de progresso é exibida THEN o sistema SHALL ter animação suave de preenchimento
3. WHEN a barra de progresso é exibida THEN o sistema SHALL estar posicionada logo acima dos botões de ação
4. WHEN a barra de progresso é exibida THEN o sistema SHALL ter texto legível com informações detalhadas
5. WHEN a barra de progresso é exibida THEN o sistema SHALL ser responsiva em diferentes tamanhos de tela
# Requirements Document

## Introduction

Este documento define os requisitos para implementar um sistema híbrido de aulas privadas que permite aos instrutores convidar alunos de duas formas distintas: convite para curso completo (acesso a todas as aulas) ou convite para aulas específicas (controle granular). O sistema deve integrar-se com a arquitetura existente do Supabase e fornecer interfaces intuitivas tanto para instrutores quanto para alunos.

## Requirements

### Requirement 1

**User Story:** Como instrutor, eu quero convidar alunos para ter acesso completo ao meu curso, para que eles possam assistir todas as aulas (públicas e privadas) sem restrições.

#### Acceptance Criteria

1. WHEN o instrutor seleciona "Convidar para Curso Completo" THEN o sistema SHALL apresentar um formulário com campo de email e mensagem personalizada opcional
2. WHEN o instrutor envia o convite THEN o sistema SHALL criar um registro na tabela `curso_alunos` com `tipo_acesso = 'convidado_curso'`
3. WHEN o convite é enviado THEN o sistema SHALL enviar um email com template específico para convite de curso completo
4. WHEN o aluno aceita o convite THEN o sistema SHALL dar acesso a todas as aulas públicas e privadas do curso

### Requirement 2

**User Story:** Como instrutor, eu quero convidar alunos para aulas específicas do meu curso, para que eu tenha controle granular sobre qual conteúdo cada aluno pode acessar.

#### Acceptance Criteria

1. WHEN o instrutor seleciona "Convidar para Aulas Específicas" THEN o sistema SHALL apresentar uma interface com lista de aulas privadas para seleção
2. WHEN o instrutor seleciona aulas específicas THEN o sistema SHALL mostrar um resumo das aulas selecionadas
3. WHEN o convite é enviado THEN o sistema SHALL criar registros na tabela `aula_permissoes` para cada aula selecionada
4. WHEN o aluno aceita o convite THEN o sistema SHALL dar acesso apenas às aulas especificamente selecionadas pelo instrutor

### Requirement 3

**User Story:** Como aluno, eu quero ver claramente qual tipo de acesso tenho a um curso, para que eu entenda quais aulas posso assistir e por que motivo.

#### Acceptance Criteria

1. WHEN o aluno visualiza um curso THEN o sistema SHALL exibir um badge indicando seu tipo de acesso (Matriculado, Convidado do Curso, ou Convite Específico)
2. WHEN o aluno visualiza uma aula privada sem permissão THEN o sistema SHALL mostrar um ícone de bloqueio e explicação clara
3. WHEN o aluno visualiza uma aula privada com permissão THEN o sistema SHALL mostrar o motivo do acesso (convite específico ou acesso total)
4. WHEN o aluno tenta assistir uma aula bloqueada THEN o sistema SHALL exibir mensagem explicativa sobre como obter acesso

### Requirement 4

**User Story:** Como instrutor, eu quero gerenciar todos os alunos do meu curso em uma interface centralizada, para que eu possa facilmente alterar tipos de acesso e visualizar permissões.

#### Acceptance Criteria

1. WHEN o instrutor acessa o gerenciamento de alunos THEN o sistema SHALL exibir alunos agrupados por tipo de acesso (Matriculados, Convidados do Curso, Convites Específicos)
2. WHEN o instrutor seleciona "Promover para Convidado" THEN o sistema SHALL alterar o `tipo_acesso` de `matriculado` para `convidado_curso`
3. WHEN o instrutor seleciona "Rebaixar para Matriculado" THEN o sistema SHALL alterar o `tipo_acesso` de `convidado_curso` para `matriculado`
4. WHEN o instrutor visualiza alunos com convites específicos THEN o sistema SHALL permitir ver quais aulas cada aluno pode acessar

### Requirement 5

**User Story:** Como instrutor, eu quero gerenciar permissões de uma aula privada específica, para que eu possa ver quem tem acesso e conceder/remover permissões individuais.

#### Acceptance Criteria

1. WHEN o instrutor acessa uma aula privada THEN o sistema SHALL mostrar todos os alunos com acesso (convidados do curso + convites específicos)
2. WHEN o instrutor visualiza alunos matriculados sem acesso THEN o sistema SHALL permitir conceder permissão específica para a aula
3. WHEN o instrutor seleciona "Dar Permissão" THEN o sistema SHALL criar um registro em `aula_permissoes` com `tipo_permissao = 'convite_especifico'`
4. WHEN o instrutor seleciona "Remover Permissão" THEN o sistema SHALL deletar o registro correspondente em `aula_permissoes`

### Requirement 6

**User Story:** Como sistema, eu preciso verificar corretamente se um aluno pode assistir uma aula, para que as regras de acesso sejam aplicadas consistentemente.

#### Acceptance Criteria

1. WHEN uma aula é pública THEN o sistema SHALL permitir acesso a qualquer aluno matriculado no curso
2. WHEN uma aula é privada E o aluno tem `tipo_acesso = 'convidado_curso'` THEN o sistema SHALL permitir acesso
3. WHEN uma aula é privada E existe registro em `aula_permissoes` para o aluno THEN o sistema SHALL permitir acesso
4. WHEN uma aula é privada E o aluno não tem permissão específica nem acesso total THEN o sistema SHALL bloquear o acesso

### Requirement 7

**User Story:** Como sistema, eu preciso migrar os dados existentes sem perder informações, para que a implementação seja transparente aos usuários atuais.

#### Acceptance Criteria

1. WHEN a migração é executada THEN o sistema SHALL adicionar a coluna `tipo_acesso` à tabela `curso_alunos` existente
2. WHEN a migração é executada THEN o sistema SHALL definir todos os registros existentes como `tipo_acesso = 'matriculado'`
3. WHEN a migração é executada THEN o sistema SHALL criar a nova tabela `aula_permissoes` com todas as constraints necessárias
4. WHEN a migração é executada THEN o sistema SHALL criar a tabela `convites_pendentes` para gerenciar convites por email

### Requirement 8

**User Story:** Como aluno, eu quero receber convites por email com informações claras, para que eu entenda o que estou recebendo e possa aceitar facilmente.

#### Acceptance Criteria

1. WHEN um convite para curso completo é enviado THEN o sistema SHALL usar template específico destacando acesso total
2. WHEN um convite para aulas específicas é enviado THEN o sistema SHALL listar as aulas incluídas no convite
3. WHEN qualquer convite é enviado THEN o sistema SHALL incluir mensagem personalizada do instrutor se fornecida
4. WHEN o aluno clica no link do convite THEN o sistema SHALL processar automaticamente a aceitação e redirecionar para o curso

### Requirement 9

**User Story:** Como desenvolvedor, eu preciso de APIs bem estruturadas para gerenciar convites e permissões, para que a integração frontend seja eficiente e consistente.

#### Acceptance Criteria

1. WHEN uma API de convite é chamada THEN o sistema SHALL validar se o usuário é instrutor do curso
2. WHEN uma API de gerenciamento de permissões é chamada THEN o sistema SHALL retornar dados estruturados com tipos de acesso
3. WHEN uma API de verificação de acesso é chamada THEN o sistema SHALL retornar informações detalhadas sobre permissões e motivos
4. WHEN qualquer API falha THEN o sistema SHALL retornar códigos de erro HTTP apropriados com mensagens descritivas

### Requirement 10

**User Story:** Como administrador do sistema, eu quero que todas as operações sejam auditáveis, para que eu possa rastrear mudanças de permissões e identificar problemas.

#### Acceptance Criteria

1. WHEN uma permissão é concedida THEN o sistema SHALL registrar quem concedeu e quando
2. WHEN um tipo de acesso é alterado THEN o sistema SHALL manter histórico da alteração
3. WHEN um convite é enviado THEN o sistema SHALL registrar o token, data de envio e expiração
4. WHEN um convite é aceito THEN o sistema SHALL marcar como aceito e registrar a data de aceitação
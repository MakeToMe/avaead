// Tipos para o sistema de aulas privadas híbrido

export interface Matricula {
  id: string;
  aluno_id: string;
  curso_id: string;
  data_matricula: Date;
  status: 'ativa' | 'inativa' | 'concluida';
  tipo_acesso: 'matriculado' | 'convidado_curso';
  adicionado_por?: string;
  progresso_percentual: number;
  data_conclusao?: Date;
  criado_em: Date;
  atualizado_em: Date;
}

export interface AulaPermissao {
  id: string;
  aula_id: string;
  aluno_id: string;
  concedida_por: string;
  tipo_permissao: 'convite_especifico' | 'acesso_curso';
  criado_em: Date;
}

export interface ConvitePendente {
  id: string;
  email: string;
  curso_id: string;
  tipo_convite: 'curso_completo' | 'aulas_especificas';
  aula_ids?: string[];
  enviado_por: string;
  mensagem?: string;
  token: string;
  aceito: boolean;
  criado_em: Date;
  expira_em: Date;
}

export interface Aula {
  id: string;
  curso_id: string;
  modulo_id: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  conteudo?: string;
  media_url?: string;
  duracao?: number;
  ativo?: boolean;
  privada?: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface AcessoAulaResult {
  pode_assistir: boolean;
  motivo?: string;
  tipo_acesso?: 'aula_publica' | 'convidado_curso' | 'convite_especifico';
}

export interface Usuario {
  uid: string;
  perfis: string;
  nome: string;
  email: string;
  criado_em: Date;
}

export interface Curso {
  id: string;
  titulo: string;
  descricao?: string;
  instrutor_id: string;
  ativo: boolean;
  criado_em: Date;
}

// Tipos para convites
export interface ConviteCursoCompleto {
  email: string;
  curso_id: string;
  instrutor_id: string;
  mensagem?: string;
}

export interface ConviteAulasEspecificas {
  email: string;
  curso_id: string;
  aula_ids: string[];
  instrutor_id: string;
  mensagem?: string;
}

export interface ConviteResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AulaDetalhes {
  id: string;
  titulo: string;
  descricao?: string;
  modulo_titulo?: string;
}

// Tipos para emails
export interface EmailConviteCursoCompleto {
  email: string;
  curso_titulo: string;
  instrutor_nome: string;
  mensagem?: string;
  token: string;
  link_aceitar: string;
}

export interface EmailConviteAulasEspecificas {
  email: string;
  curso_titulo: string;
  instrutor_nome: string;
  aulas: AulaDetalhes[];
  mensagem?: string;
  token: string;
  link_aceitar: string;
}
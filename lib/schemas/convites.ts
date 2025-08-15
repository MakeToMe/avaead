import { z } from 'zod';

// Schema para convite de curso completo
export const ConviteCursoCompletoSchema = z.object({
  email: z.string().email('Email inválido'),
  curso_id: z.string().uuid('ID do curso inválido'),
  instrutor_id: z.string().uuid('ID do instrutor inválido'),
  mensagem: z.string().optional()
});

// Schema para convite de aulas específicas
export const ConviteAulasEspecificasSchema = z.object({
  email: z.string().email('Email inválido'),
  curso_id: z.string().uuid('ID do curso inválido'),
  aula_ids: z.array(z.string().uuid()).min(1, 'Selecione pelo menos uma aula'),
  instrutor_id: z.string().uuid('ID do instrutor inválido'),
  mensagem: z.string().optional()
});

// Schema para alteração de tipo de acesso
export const AlterarTipoAcessoSchema = z.object({
  tipo_acesso: z.enum(['matriculado', 'convidado_curso'], {
    errorMap: () => ({ message: 'Tipo de acesso deve ser "matriculado" ou "convidado_curso"' })
  }),
  instrutor_id: z.string().uuid('ID do instrutor inválido')
});

// Schema para aceitação de convite
export const AceitarConviteSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório')
});

// Schema para conceder permissão específica
export const ConcederPermissaoSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  instrutor_id: z.string().uuid('ID do instrutor inválido')
});

// Schema para remover permissão específica
export const RemoverPermissaoSchema = z.object({
  instrutor_id: z.string().uuid('ID do instrutor inválido')
});

// Schema para listar permissões
export const ListarPermissoesSchema = z.object({
  instrutor_id: z.string().uuid('ID do instrutor inválido')
});

// Tipos inferidos dos schemas
export type ConviteCursoCompletoInput = z.infer<typeof ConviteCursoCompletoSchema>;
export type ConviteAulasEspecificasInput = z.infer<typeof ConviteAulasEspecificasSchema>;
export type AlterarTipoAcessoInput = z.infer<typeof AlterarTipoAcessoSchema>;
export type AceitarConviteInput = z.infer<typeof AceitarConviteSchema>;
export type ConcederPermissaoInput = z.infer<typeof ConcederPermissaoSchema>;
export type RemoverPermissaoInput = z.infer<typeof RemoverPermissaoSchema>;
export type ListarPermissoesInput = z.infer<typeof ListarPermissoesSchema>;
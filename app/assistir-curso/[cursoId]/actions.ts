"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { emitirCertificado } from "@/app/certificados/actions"

export interface AulaDetalhada {
  id: string
  titulo: string
  descricao: string
  resumo?: string
  tipo: string
  media_url: string | null
  duracao: number
  modulo_id: string
  modulo_titulo: string
  criado_em: string
  privada: boolean
  ao_vivo: boolean
  tipo_acesso: 'publica' | 'privada' // Campo derivado para compatibilidade
}

export interface ModuloComAulas {
  id: string
  titulo: string
  descricao: string
  aulas: AulaDetalhada[]
}

export interface CursoCompleto {
  id: string
  titulo: string
  descricao: string
  imagem_url: string | null
  instrutor_nome: string
  duracao_total: number
  modulos: ModuloComAulas[]
}

export interface ProgressoUsuario {
  progresso_percentual: number
  status: string
  aulas_assistidas: string[]
}

// Função para verificar acesso a uma aula específica (server-side)
async function verificarAcessoAulaServidor(
  aulaId: string, 
  userId: string, 
  supabase: any,
  isInstrutor: boolean,
  temAcessoTotal: boolean,
  aulasComPermissao: Set<string>
) {
  try {
    // Buscar dados da aula
    const { data: aula } = await supabase
      .from("aulas")
      .select("privada, ao_vivo")
      .eq("id", aulaId)
      .single()

    if (!aula) {
      return { permitido: false, motivo: 'Aula não encontrada' }
    }

    // Instrutor sempre tem acesso
    if (isInstrutor) {
      return { permitido: true, motivo: 'Você é o instrutor' }
    }

    // Acesso total sempre tem acesso
    if (temAcessoTotal) {
      return { permitido: true, motivo: 'Você tem acesso total ao curso' }
    }

    // Aulas públicas sempre permitidas
    if (!aula.privada && !aula.ao_vivo) {
      return { permitido: true, motivo: 'Aula pública' }
    }

    // Aulas privadas ou ao vivo precisam de permissão específica
    if (aula.privada || aula.ao_vivo) {
      if (aulasComPermissao.has(aulaId)) {
        return { permitido: true, motivo: 'Você tem permissão específica' }
      } else {
        const tipo = aula.ao_vivo ? 'ao vivo' : 'privada'
        return { 
          permitido: false, 
          motivo: `Esta é uma aula ${tipo}. Entre em contato com o instrutor para solicitar acesso.` 
        }
      }
    }

    return { permitido: true, motivo: 'Acesso liberado' }
  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return {
      permitido: false,
      motivo: 'Erro ao verificar acesso. Tente novamente.'
    }
  }
}

// Função para verificar acesso do lado do cliente (quando necessário)
export async function verificarAcessoAula(aulaId: string, userId: string) {
  try {
    const response = await fetch(`/api/aulas/${aulaId}/verificar-acesso?usuario_id=${userId}`)
    const result = await response.json()
    
    return {
      permitido: result.permitido || false,
      motivo: result.motivo || 'Acesso não verificado',
      tipo_acesso: result.tipo_acesso || 'desconhecido'
    }
  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return {
      permitido: false,
      motivo: 'Erro ao verificar acesso. Tente novamente.',
      tipo_acesso: 'erro'
    }
  }
}

// Função helper para registrar atividade
async function registrarAtividade(
  userId: string,
  tipo: string,
  titulo: string,
  descricao: string,
  icone: string,
  corIcone: string,
  entidadeTipo: string,
  entidadeId: string,
  url: string,
  metadados: any = {},
) {
  const supabase = createServerSupabaseClient()

  try {
    // Dados para inserção
    const atividadeData = {
      usuario_uid: userId,
      tipo_atividade: tipo,
      titulo,
      descricao,
      icone,
      cor_icone: corIcone,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      url,
      metadados,
    }

    // Tentativa de inserção
    const { error } = await supabase.from("atividades_recentes").insert(atividadeData)

    if (error) {
      console.error("Erro ao registrar atividade:", error)
    }
  } catch (error) {
    console.error("Erro ao registrar atividade:", error)
  }
}

// Buscar dados completos do curso
export async function buscarCursoCompleto(cursoId: string, userId: string) {
  try {
    if (!cursoId || !userId) {
      return { success: false, error: "Dados obrigatórios não fornecidos" }
    }

    const supabase = createServerSupabaseClient()

    // Verificar se o usuário está matriculado
    const { data: matricula, error: matriculaError } = await supabase
      .from("matriculas")
      .select("id, progresso_percentual, status")
      .eq("aluno_id", userId)
      .eq("curso_id", cursoId)
      .single()

    if (matriculaError || !matricula) {
      return { success: false, error: "Você não está matriculado neste curso" }
    }

    // Buscar dados do curso
    const { data: curso, error: cursoError } = await supabase
      .from("cursos")
      .select(`
        id,
        titulo,
        descricao,
        imagem_url,
        duracao_total,
        instrutor_id
      `)
      .eq("id", cursoId)
      .single()

    if (cursoError || !curso) {
      return { success: false, error: "Curso não encontrado" }
    }

    // Buscar nome do instrutor
    const { data: instrutor } = await supabase.from("users").select("nome").eq("uid", curso.instrutor_id).single()

    // Buscar módulos do curso
    const { data: modulos, error: modulosError } = await supabase
      .from("modulos")
      .select("id, titulo, descricao")
      .eq("curso_id", cursoId)
      .order("criado_em", { ascending: true })

    if (modulosError) {
      console.error("Erro ao buscar módulos:", modulosError)
      return { success: false, error: "Erro ao buscar módulos" }
    }

    // Buscar permissões específicas do usuário para aulas ao vivo e privadas
    const { data: permissoesUsuario } = await supabase
      .from("aula_permissoes")
      .select("aula_id, tipo_permissao")
      .eq("aluno_id", userId)

    const aulasComPermissao = new Set(permissoesUsuario?.map(p => p.aula_id) || [])

    // Verificar se é instrutor do curso
    const isInstrutor = curso.instrutor_id === userId

    // Verificar se tem acesso total (convidado_curso)
    const temAcessoTotal = matricula.tipo_acesso === 'convidado_curso'

    // Buscar aulas de todos os módulos
    const modulosComAulas: ModuloComAulas[] = []

    for (const modulo of modulos || []) {
      const { data: aulas, error: aulasError } = await supabase
        .from("aulas")
        .select(`
          id,
          titulo,
          descricao,
          conteudo,
          tipo,
          media_url,
          duracao,
          privada,
          ao_vivo,
          criado_em
        `)
        .eq("modulo_id", modulo.id)
        .order("criado_em", { ascending: true })

      if (aulasError) {
        console.error("Erro ao buscar aulas:", aulasError)
        continue
      }

      // Filtrar aulas baseado nas permissões
      const aulasPermitidas = (aulas || []).filter((aula) => {
        // Instrutor sempre vê todas as aulas
        if (isInstrutor) return true
        
        // Acesso total vê todas as aulas
        if (temAcessoTotal) return true
        
        // Aulas públicas sempre são visíveis para alunos matriculados
        if (!aula.privada && !aula.ao_vivo) return true
        
        // Aulas privadas aparecem para todos, mas acesso é controlado na visualização
        if (aula.privada && !aula.ao_vivo) return true
        
        // Aulas ao vivo só aparecem se tiver permissão específica
        if (aula.ao_vivo) {
          return aulasComPermissao.has(aula.id)
        }
        
        return true
      })

      const aulasDetalhadas: AulaDetalhada[] = aulasPermitidas.map((aula) => ({
        id: aula.id,
        titulo: aula.titulo,
        descricao: aula.descricao || "",
        resumo: aula.conteudo || "",
        tipo: aula.tipo,
        media_url: aula.media_url,
        duracao: aula.duracao || 0,
        modulo_id: modulo.id,
        modulo_titulo: modulo.titulo,
        criado_em: aula.criado_em,
        privada: aula.privada || false,
        ao_vivo: aula.ao_vivo || false,
        tipo_acesso: aula.privada ? 'privada' : 'publica', // Campo derivado
      }))

      if (aulasDetalhadas.length > 0) {
        modulosComAulas.push({
          id: modulo.id,
          titulo: modulo.titulo,
          descricao: modulo.descricao || "",
          aulas: aulasDetalhadas,
        })
      }
    }

    // Buscar aulas assistidas
    const { data: progressoAulas, error: progressoError } = await supabase
      .from("progresso_aulas")
      .select("aula_id")
      .eq("matricula_id", matricula.id)
      .eq("assistida", true)

    if (progressoError) {
      console.error("Erro ao buscar progresso das aulas:", progressoError)
    }

    // Extrair IDs das aulas assistidas
    const aulasAssistidas = progressoAulas ? progressoAulas.map((item) => item.aula_id) : []

    const cursoCompleto: CursoCompleto = {
      id: curso.id,
      titulo: curso.titulo,
      descricao: curso.descricao || "",
      imagem_url: curso.imagem_url,
      instrutor_nome: instrutor?.nome || "Instrutor",
      duracao_total: curso.duracao_total || 0,
      modulos: modulosComAulas,
    }

    const progresso: ProgressoUsuario = {
      progresso_percentual: matricula.progresso_percentual,
      status: matricula.status,
      aulas_assistidas: aulasAssistidas,
    }

    return { success: true, data: { curso: cursoCompleto, progresso } }
  } catch (error) {
    console.error("Erro ao buscar curso completo:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Marcar aula como assistida
export async function marcarAulaAssistida(aulaId: string, cursoId: string, userId: string) {
  try {
    if (!aulaId || !cursoId || !userId) {
      return { success: false, error: "Dados obrigatórios não fornecidos" }
    }

    const supabase = createServerSupabaseClient()

    // Buscar dados da aula para a atividade
    const { data: aula, error: aulaError } = await supabase
      .from("aulas")
      .select("titulo, modulo_id, ao_vivo")
      .eq("id", aulaId)
      .single()

    if (aulaError) {
      console.error("Erro ao buscar aula:", aulaError)
    }

    // Buscar dados do curso para a atividade
    const { data: curso, error: cursoError } = await supabase.from("cursos").select("titulo").eq("id", cursoId).single()

    if (cursoError) {
      console.error("Erro ao buscar curso:", cursoError)
    }

    // Buscar matrícula
    const { data: matricula, error: matriculaError } = await supabase
      .from("matriculas")
      .select("id")
      .eq("aluno_id", userId)
      .eq("curso_id", cursoId)
      .single()

    if (matriculaError || !matricula) {
      return { success: false, error: "Matrícula não encontrada" }
    }

    // Verificar se já existe registro de progresso para esta aula
    const { data: progressoExistente } = await supabase
      .from("progresso_aulas")
      .select("id, assistida")
      .eq("matricula_id", matricula.id)
      .eq("aula_id", aulaId)
      .single()

    let jaAssistida = false

    if (progressoExistente) {
      jaAssistida = progressoExistente.assistida
      // Atualizar progresso existente
      const { error: updateError } = await supabase
        .from("progresso_aulas")
        .update({
          assistida: true,
          concluida: true,
          data_ultima_visualizacao: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", progressoExistente.id)

      if (updateError) {
        console.error("Erro ao atualizar progresso:", updateError)
        return { success: false, error: "Erro ao atualizar progresso" }
      }
    } else {
      // Criar novo registro de progresso
      const { error: insertError } = await supabase.from("progresso_aulas").insert({
        matricula_id: matricula.id,
        aula_id: aulaId,
        assistida: true,
        concluida: true,
        data_primeira_visualizacao: new Date().toISOString(),
        data_ultima_visualizacao: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Erro ao criar progresso:", insertError)
        return { success: false, error: "Erro ao criar progresso" }
      }
    }

    // Registrar atividade apenas se não tinha assistido antes
    if (!jaAssistida && aula && curso) {
      await registrarAtividade(
        userId,
        "assistiu_aula",
        "Assistiu uma aula",
        `Você assistiu a aula "${aula.titulo}" do curso "${curso.titulo}"`,
        "play-circle",
        "indigo",
        "aula",
        aulaId,
        `/assistir-curso/${cursoId}`,
        {
          aula_titulo: aula.titulo,
          curso_titulo: curso.titulo,
          modulo_id: aula.modulo_id,
        },
      )
    }

    // Calcular novo progresso do curso (excluindo aulas ao vivo)
    const { count: totalAulas } = await supabase
      .from("aulas")
      .select("*", { count: "exact", head: true })
      .eq("curso_id", cursoId)
      .eq("ao_vivo", false) // Excluir aulas ao vivo do cálculo de progresso

    const { count: aulasAssistidas } = await supabase
      .from("progresso_aulas")
      .select("*", { count: "exact", head: true })
      .eq("matricula_id", matricula.id)
      .eq("assistida", true)

    const novoProgresso = totalAulas ? Math.round(((aulasAssistidas || 0) / totalAulas) * 100) : 0

    // Atualizar progresso na matrícula
    const { error: matriculaUpdateError } = await supabase
      .from("matriculas")
      .update({
        progresso_percentual: novoProgresso,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", matricula.id)

    if (matriculaUpdateError) {
      console.error("Erro ao atualizar matrícula:", matriculaUpdateError)
    }

    // Se completou o curso (100%), registrar atividade de conclusão E emitir certificado
    if (novoProgresso === 100 && curso) {
      await registrarAtividade(
        userId,
        "concluiu_curso",
        "Concluiu um curso",
        `Parabéns! Você concluiu o curso "${curso.titulo}"`,
        "check-circle",
        "green",
        "curso",
        cursoId,
        `/meus-cursos`,
        {
          curso_titulo: curso.titulo,
          progresso_final: novoProgresso,
        },
      )

      // Emitir certificado automaticamente
      try {
        const resultadoCertificado = await emitirCertificado(cursoId, userId)
        if (resultadoCertificado.success) {
          console.log("✅ Certificado emitido automaticamente:", resultadoCertificado.certificado?.numero_certificado)

          // Registrar atividade de certificado emitido
          await registrarAtividade(
            userId,
            "certificado_emitido",
            "Certificado emitido",
            `Seu certificado do curso "${curso.titulo}" foi emitido com sucesso!`,
            "award",
            "amber",
            "certificado",
            resultadoCertificado.certificado?.id || "",
            `/certificados`,
            {
              curso_titulo: curso.titulo,
              numero_certificado: resultadoCertificado.certificado?.numero_certificado,
            },
          )
        } else {
          console.log("⚠️ Não foi possível emitir certificado:", resultadoCertificado.message)
        }
      } catch (error) {
        console.error("❌ Erro ao emitir certificado automaticamente:", error)
      }
    }

    return { success: true, progresso: novoProgresso }
  } catch (error) {
    console.error("Erro ao marcar aula como assistida:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

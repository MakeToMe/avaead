"use server"

import { Pool } from 'pg'
import { emitirCertificado } from "@/app/certificados/actions"

// Pool Postgres (mesma config utilizada no projeto)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

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
  isInstrutor: boolean,
  temAcessoTotal: boolean,
  aulasComPermissao: Set<string>
) {
  try {
    // Buscar dados da aula via Postgres
    const client = await pool.connect()
    let aula: { privada: boolean; ao_vivo: boolean } | null = null
    try {
      const res = await client.query(
        `SELECT privada, ao_vivo FROM rarcursos.aulas WHERE id = $1 LIMIT 1`,
        [aulaId]
      )
      aula = res.rows?.[0] || null
    } finally {
      client.release()
    }

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

// Função helper para registrar atividade (Postgres direto)
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
  const client = await pool.connect()
  try {
    const insertQuery = `
      INSERT INTO rarcursos.atividades_recentes
        (usuario_uid, tipo_atividade, titulo, descricao, icone, cor_icone, entidade_tipo, entidade_id, url, metadados, criado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `
    await client.query(insertQuery, [
      userId,
      tipo,
      titulo,
      descricao,
      icone,
      corIcone,
      entidadeTipo,
      entidadeId,
      url,
      metadados,
    ])
  } catch (error) {
    console.error("Erro ao registrar atividade (PG):", error)
  } finally {
    client.release()
  }
}

// Buscar dados completos do curso
export async function buscarCursoCompleto(cursoId: string, userId: string) {
  try {
    if (!cursoId || !userId) {
      return { success: false, error: "Dados obrigatórios não fornecidos" }
    }
    const client = await pool.connect()
    try {
      // Verificar matrícula
      const matRes = await client.query(
        `SELECT id, progresso_percentual, status, tipo_acesso
         FROM rarcursos.matriculas
         WHERE aluno_id = $1 AND curso_id = $2
         LIMIT 1`,
        [userId, cursoId]
      )
      const matricula = matRes.rows?.[0]
      if (!matricula) {
        return { success: false, error: "Você não está matriculado neste curso" }
      }

      // Curso
      const cursoRes = await client.query(
        `SELECT id, titulo, descricao, imagem_url, duracao_total, instrutor_id
         FROM rarcursos.cursos WHERE id = $1 LIMIT 1`,
        [cursoId]
      )
      const curso = cursoRes.rows?.[0]
      if (!curso) return { success: false, error: "Curso não encontrado" }

      // Instrutor
      const instRes = await client.query(
        `SELECT nome FROM rarcursos.users WHERE uid = $1 LIMIT 1`,
        [curso.instrutor_id]
      )
      const instrutor = instRes.rows?.[0]

      // Módulos
      const modRes = await client.query(
        `SELECT id, titulo, descricao
         FROM rarcursos.modulos
         WHERE curso_id = $1
         ORDER BY criado_em ASC`,
        [cursoId]
      )
      const modulos = modRes.rows || []

      // Permissões usuário
      const permRes = await client.query(
        `SELECT aula_id FROM rarcursos.aula_permissoes WHERE aluno_id = $1`,
        [userId]
      )
      const aulasComPermissao = new Set<string>((permRes.rows || []).map(r => r.aula_id))

      const isInstrutor = curso.instrutor_id === userId
      const temAcessoTotal = (matricula.tipo_acesso === 'convidado_curso')

      const modulosComAulas: ModuloComAulas[] = []
      for (const modulo of modulos) {
        const aulasRes = await client.query(
          `SELECT id, titulo, descricao, conteudo, tipo, media_url, duracao, privada, ao_vivo, criado_em
           FROM rarcursos.aulas
           WHERE modulo_id = $1
           ORDER BY criado_em ASC`,
          [modulo.id]
        )
        const aulas = aulasRes.rows || []

        const aulasPermitidas = aulas.filter((aula: any) => {
          if (isInstrutor) return true
          if (temAcessoTotal) return true
          if (!aula.privada && !aula.ao_vivo) return true
          if (aula.privada && !aula.ao_vivo) return true
          if (aula.ao_vivo) return aulasComPermissao.has(aula.id)
          return true
        })

        const aulasDetalhadas: AulaDetalhada[] = aulasPermitidas.map((aula: any) => ({
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
          tipo_acesso: aula.privada ? 'privada' : 'publica',
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

      // Aulas assistidas
      const progRes = await client.query(
        `SELECT aula_id FROM rarcursos.progresso_aulas WHERE matricula_id = $1 AND assistida = true`,
        [matricula.id]
      )
      const aulasAssistidas = (progRes.rows || []).map((r: any) => r.aula_id)

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
    } finally {
      client.release()
    }
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
    const client = await pool.connect()
    try {
      // Aula
      const aulaRes = await client.query(
        `SELECT titulo, modulo_id, ao_vivo FROM rarcursos.aulas WHERE id = $1 LIMIT 1`,
        [aulaId]
      )
      const aula = aulaRes.rows?.[0]

      // Curso
      const cursoRes = await client.query(
        `SELECT titulo FROM rarcursos.cursos WHERE id = $1 LIMIT 1`,
        [cursoId]
      )
      const curso = cursoRes.rows?.[0]

      // Matrícula
      const matRes = await client.query(
        `SELECT id FROM rarcursos.matriculas WHERE aluno_id = $1 AND curso_id = $2 LIMIT 1`,
        [userId, cursoId]
      )
      const matricula = matRes.rows?.[0]
      if (!matricula) return { success: false, error: "Matrícula não encontrada" }

      // Progresso existente
      const progRes = await client.query(
        `SELECT id, assistida FROM rarcursos.progresso_aulas WHERE matricula_id = $1 AND aula_id = $2 LIMIT 1`,
        [matricula.id, aulaId]
      )
      const progressoExistente = progRes.rows?.[0]
      let jaAssistida = false

      if (progressoExistente) {
        jaAssistida = !!progressoExistente.assistida
        await client.query(
          `UPDATE rarcursos.progresso_aulas
             SET assistida = true,
                 concluida = true,
                 data_ultima_visualizacao = NOW(),
                 atualizado_em = NOW()
           WHERE id = $1`,
          [progressoExistente.id]
        )
      } else {
        await client.query(
          `INSERT INTO rarcursos.progresso_aulas
             (matricula_id, aula_id, assistida, concluida, data_primeira_visualizacao, data_ultima_visualizacao)
           VALUES ($1, $2, true, true, NOW(), NOW())`,
          [matricula.id, aulaId]
        )
      }

      // Atividade
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

      // Progresso do curso
      const totalAulasRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM rarcursos.aulas WHERE curso_id = $1 AND ao_vivo = false`,
        [cursoId]
      )
      const totalAulas: number = totalAulasRes.rows?.[0]?.total || 0

      const aulasAssistidasRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM rarcursos.progresso_aulas WHERE matricula_id = $1 AND assistida = true`,
        [matricula.id]
      )
      const aulasAssistidasCount: number = aulasAssistidasRes.rows?.[0]?.total || 0

      const novoProgresso = totalAulas ? Math.round((aulasAssistidasCount / totalAulas) * 100) : 0

      await client.query(
        `UPDATE rarcursos.matriculas SET progresso_percentual = $1, atualizado_em = NOW() WHERE id = $2`,
        [novoProgresso, matricula.id]
      )

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
          { curso_titulo: curso.titulo, progresso_final: novoProgresso },
        )

        try {
          const resultadoCertificado = await emitirCertificado(cursoId, userId)
          if (resultadoCertificado.success) {
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
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao marcar aula como assistida:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

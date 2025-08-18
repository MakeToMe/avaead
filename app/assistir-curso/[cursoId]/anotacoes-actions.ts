"use server"

import { Pool } from 'pg'
import { revalidatePath } from "next/cache"
import { registrarAtividade } from "@/app/dashboard/actions"

export interface AnotacaoUsuario {
  id: string
  usuario_uid: string // UUID como string
  curso_id: string
  aula_id: string
  titulo?: string
  conteudo: string
  timestamp_video?: number
  tipo: "nota" | "duvida" | "importante" | "resumo"
  cor: "azul" | "verde" | "amarelo" | "vermelho" | "roxo"
  privada: boolean
  favorita: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface CriarAnotacaoData {
  curso_id: string
  aula_id: string
  titulo?: string
  conteudo: string
  timestamp_video?: number
  tipo?: "nota" | "duvida" | "importante" | "resumo"
  cor?: "azul" | "verde" | "amarelo" | "vermelho" | "roxo"
  privada?: boolean
}

// Pool Postgres
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

// Criar nova anotação
export async function criarAnotacao(data: CriarAnotacaoData, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const client = await pool.connect()
    let anotacao: any
    try {
      const insertQuery = `
        INSERT INTO rarcursos.anotacoes_usuario
          (usuario_uid, curso_id, aula_id, titulo, conteudo, timestamp_video, tipo, cor, privada, favorita, ativo, criado_em, atualizado_em)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,true, NOW(), NOW())
        RETURNING *
      `
      const params = [
        userId,
        data.curso_id,
        data.aula_id,
        data.titulo ?? null,
        data.conteudo,
        typeof data.timestamp_video === 'number' ? data.timestamp_video : null,
        data.tipo || 'nota',
        data.cor || 'azul',
        data.privada ?? true,
      ]
      const res = await client.query(insertQuery, params)
      anotacao = res.rows?.[0]
    } finally {
      client.release()
    }

    // Registrar atividade
    await registrarAtividade(
      userId,
      "anotacao_criada",
      "Nova anotação criada",
      `Criou uma anotação do tipo "${data.tipo}" ${data.titulo ? `"${data.titulo}"` : ""}`,
      "FileText",
      "text-blue-400",
      "anotacao",
      anotacao.id,
      `/assistir-curso/${data.curso_id}`,
      {
        tipo: data.tipo,
        titulo: data.titulo,
        curso_id: data.curso_id,
        aula_id: data.aula_id,
      },
    )

    revalidatePath(`/assistir-curso/${data.curso_id}`)
    return { success: true, data: anotacao }
  } catch (error) {
    console.error("Erro ao criar anotação:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Buscar anotações de uma aula
export async function buscarAnotacoesAula(aulaId: string, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const client = await pool.connect()
    try {
      const query = `
        SELECT *
        FROM rarcursos.anotacoes_usuario
        WHERE aula_id = $1 AND usuario_uid = $2 AND ativo = true
        ORDER BY timestamp_video NULLS LAST, criado_em DESC
      `
      const res = await client.query(query, [aulaId, userId])
      return { success: true, data: res.rows as AnotacaoUsuario[] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao buscar anotações:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Buscar anotações de um curso
export async function buscarAnotacoesCurso(
  cursoId: string,
  userId: string,
  filtros?: {
    tipo?: string
    favoritas?: boolean
    busca?: string
  },
) {
  try {
    if (!userId) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const client = await pool.connect()
    try {
      const params: any[] = [cursoId, userId]
      const whereClauses = [
        `au.curso_id = $1`,
        `au.usuario_uid = $2`,
        `au.ativo = true`,
      ]

      if (filtros?.tipo && filtros.tipo !== 'todos') {
        params.push(filtros.tipo)
        whereClauses.push(`au.tipo = $${params.length}`)
      }
      if (filtros?.favoritas) {
        whereClauses.push(`au.favorita = true`)
      }
      if (filtros?.busca) {
        params.push(`%${filtros.busca}%`)
        params.push(`%${filtros.busca}%`)
        whereClauses.push(`(au.titulo ILIKE $${params.length-1} OR au.conteudo ILIKE $${params.length})`)
      }

      const sql = `
        SELECT au.*, a.titulo AS aula_titulo, a.ordem AS aula_ordem
        FROM rarcursos.anotacoes_usuario au
        LEFT JOIN rarcursos.aulas a ON a.id = au.aula_id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY au.criado_em DESC
      `
      const res = await client.query(sql, params)
      return { success: true, data: res.rows }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao buscar anotações do curso:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Atualizar anotação
export async function atualizarAnotacao(id: string, data: Partial<CriarAnotacaoData>, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const client = await pool.connect()
    let anotacao: any
    try {
      const fields: string[] = []
      const params: any[] = []
      let idx = 1
      if (data.titulo !== undefined) { fields.push(`titulo = $${idx++}`); params.push(data.titulo) }
      if (data.conteudo !== undefined) { fields.push(`conteudo = $${idx++}`); params.push(data.conteudo) }
      if (data.timestamp_video !== undefined) { fields.push(`timestamp_video = $${idx++}`); params.push(data.timestamp_video) }
      if (data.tipo !== undefined) { fields.push(`tipo = $${idx++}`); params.push(data.tipo) }
      if (data.cor !== undefined) { fields.push(`cor = $${idx++}`); params.push(data.cor) }
      if (data.privada !== undefined) { fields.push(`privada = $${idx++}`); params.push(data.privada) }
      fields.push(`atualizado_em = NOW()`)
      params.push(id)
      params.push(userId)

      const sql = `
        UPDATE rarcursos.anotacoes_usuario
        SET ${fields.join(', ')}
        WHERE id = $${idx++} AND usuario_uid = $${idx}
        RETURNING *
      `
      const res = await client.query(sql, params)
      anotacao = res.rows?.[0]
      if (!anotacao) return { success: false, error: "Anotação não encontrada" }
    } finally {
      client.release()
    }

    // Registrar atividade
    await registrarAtividade(
      userId,
      "anotacao_editada",
      "Anotação editada",
      `Editou uma anotação ${anotacao.titulo ? `"${anotacao.titulo}"` : ""}`,
      "Edit",
      "text-yellow-400",
      "anotacao",
      anotacao.id,
      `/assistir-curso/${anotacao.curso_id}`,
      {
        tipo: anotacao.tipo,
        titulo: anotacao.titulo,
      },
    )

    revalidatePath(`/assistir-curso/${anotacao.curso_id}`)
    return { success: true, data: anotacao }
  } catch (error) {
    console.error("Erro ao atualizar anotação:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Alternar favorito
export async function alternarFavorito(id: string, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const client = await pool.connect()
    try {
      const curRes = await client.query(
        `SELECT favorita, curso_id FROM rarcursos.anotacoes_usuario WHERE id = $1 AND usuario_uid = $2 LIMIT 1`,
        [id, userId]
      )
      const atual = curRes.rows?.[0]
      if (!atual) return { success: false, error: "Anotação não encontrada" }

      const updRes = await client.query(
        `UPDATE rarcursos.anotacoes_usuario
           SET favorita = $1, atualizado_em = NOW()
         WHERE id = $2 AND usuario_uid = $3
         RETURNING *`,
        [!atual.favorita, id, userId]
      )
      const anotacao = updRes.rows?.[0]
      revalidatePath(`/assistir-curso/${atual.curso_id}`)
      return { success: true, data: anotacao }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao alternar favorito:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Excluir anotação (soft delete)
export async function excluirAnotacao(id: string, userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "Usuário não autenticado" }
    }

    const client = await pool.connect()
    try {
      const atualRes = await client.query(
        `SELECT curso_id, titulo, tipo FROM rarcursos.anotacoes_usuario WHERE id = $1 AND usuario_uid = $2 LIMIT 1`,
        [id, userId]
      )
      const atual = atualRes.rows?.[0]
      if (!atual) return { success: false, error: "Anotação não encontrada" }

      await client.query(
        `UPDATE rarcursos.anotacoes_usuario
           SET ativo = false, atualizado_em = NOW()
         WHERE id = $1 AND usuario_uid = $2`,
        [id, userId]
      )

      await registrarAtividade(
        userId,
        "anotacao_excluida",
        "Anotação excluída",
        `Excluiu uma anotação ${atual?.titulo ? `"${atual.titulo}"` : ""}`,
        "Trash2",
        "text-red-400",
        "anotacao",
        id,
        `/assistir-curso/${atual.curso_id}`,
        {
          tipo: atual?.tipo,
          titulo: atual?.titulo,
        },
      )

      revalidatePath(`/assistir-curso/${atual.curso_id}`)
      return { success: true }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao excluir anotação:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Pool } from 'pg'

// Pool Postgres (mesma config usada em sidebar-actions)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
})

export interface CursoData {
  titulo: string
  descricao: string
  nivel: "iniciante" | "intermediario" | "avancado"
  ativo: boolean
  imagem_url?: string
  duracao_total?: number // em minutos
  instrutor_id: string // Adicionado para passar o ID do instrutor
}

export async function criarCurso(cursoData: CursoData) {
  try {
    if (!cursoData.instrutor_id) {
      return { success: false, message: "ID do instrutor é obrigatório" }
    }

    const client = await pool.connect()
    try {
      const insertQuery = `
        INSERT INTO rarcursos.cursos
          (titulo, descricao, nivel, ativo, imagem_url, duracao_total, instrutor_id, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, titulo, descricao, nivel, ativo, imagem_url, duracao_total, criado_em, atualizado_em, instrutor_id
      `
      const params = [
        cursoData.titulo,
        cursoData.descricao,
        cursoData.nivel,
        cursoData.ativo,
        cursoData.imagem_url ?? null,
        typeof cursoData.duracao_total === 'number' ? cursoData.duracao_total : null,
        cursoData.instrutor_id
      ]
      const res = await client.query(insertQuery, params)
      const data = res.rows?.[0]
      return { success: true, message: "Curso criado com sucesso!", data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao criar curso (PG):", error)
    return { success: false, message: "Erro inesperado ao criar curso" }
  }
}

export async function buscarCursosDoInstrutor(instrutorId: string, pagina = 1, itensPorPagina = 12) {
  try {
    const client = await pool.connect()
    try {
      const offset = (pagina - 1) * itensPorPagina

      // Total de cursos
      const countQuery = `
        SELECT COUNT(*)::int AS total
        FROM rarcursos.cursos
        WHERE instrutor_id = $1
      `
      const countResult = await client.query(countQuery, [instrutorId])
      const totalCursos = countResult.rows?.[0]?.total ?? 0

      // Lista paginada
      const listQuery = `
        SELECT id, titulo, descricao, nivel, ativo, imagem_url, duracao_total, criado_em, atualizado_em
        FROM rarcursos.cursos
        WHERE instrutor_id = $1
        ORDER BY criado_em DESC
        LIMIT $2 OFFSET $3
      `
      const listResult = await client.query(listQuery, [instrutorId, itensPorPagina, offset])

      return { success: true, data: listResult.rows || [], totalCursos }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao buscar cursos (PG):", error)
    return { success: false, message: "Erro ao buscar cursos", data: [], totalCursos: 0 }
  }
}

export async function atualizarStatusCurso(cursoId: string, ativo: boolean, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      // Verificar posse do curso
      const checkQuery = `SELECT instrutor_id FROM rarcursos.cursos WHERE id = $1 LIMIT 1`
      const checkRes = await client.query(checkQuery, [cursoId])
      const curso = checkRes.rows?.[0]
      if (!curso) {
        return { success: false, message: "Curso não encontrado" }
      }
      if (curso.instrutor_id !== instrutorId) {
        return { success: false, message: "Sem permissão para atualizar este curso" }
      }

      // Atualizar status
      const updQuery = `UPDATE rarcursos.cursos SET ativo = $1, atualizado_em = NOW() WHERE id = $2`
      await client.query(updQuery, [ativo, cursoId])
      return { success: true, message: "Status atualizado com sucesso!" }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao atualizar status (PG):", error)
    return { success: false, message: "Erro inesperado ao atualizar status" }
  }
}

export async function uploadImagemMinio(
  file: File,
  userId: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    console.log("🚀 UPLOAD IMAGEM NOVA ESTRUTURA - Iniciando upload:", {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      userId: userId,
      newStructure: true,
    })

    // Gerar nome único SEM UID (já está na estrutura da pasta)
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${cleanFileName}`

    // Importar funções da nova estrutura
    const { getMinioUserUploadUrl, getMinioUserFileUrl } = await import("@/lib/minio-config")

    // Usar nova estrutura baseada em UID: rarcursos/[uid]/imagens/[arquivo]
    const uploadUrl = getMinioUserUploadUrl(userId, "imagem", fileName)

    console.log("📤 Fazendo upload de imagem com nova estrutura:", {
      structure: `${userId}/imagens/${fileName}`,
      success: true
    })

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
      body: file,
    })

    if (!response.ok) {
      console.error("Upload response:", response.status, response.statusText)
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    // URL final da imagem com nova estrutura
    const imageUrl = getMinioUserFileUrl(userId, "imagem", fileName)

    console.log("✅ Upload de imagem com nova estrutura bem-sucedido")

    return {
      success: true,
      url: imageUrl,
      message: "Upload realizado com sucesso",
    }
  } catch (error) {
    console.error("Erro no upload:", error)
    return {
      success: false,
      message: "Erro ao fazer upload da imagem. Verifique a conexão e tente novamente.",
    }
  }
}

// Função para upload de vídeos com nova estrutura
export async function uploadVideoMinio(
  file: File,
  userId: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    console.log("🚀 UPLOAD VÍDEO NOVA ESTRUTURA - Iniciando upload:", {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      userId: userId,
      newStructure: true,
    })

    // Gerar nome único SEM UID (já está na estrutura da pasta)
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${cleanFileName}`

    // Importar funções da nova estrutura
    const { getMinioUserUploadUrl, getMinioUserFileUrl } = await import("@/lib/minio-config")

    // Usar nova estrutura baseada em UID: rarcursos/[uid]/videos/[arquivo]
    const uploadUrl = getMinioUserUploadUrl(userId, "video", fileName)

    console.log("📤 Fazendo upload de vídeo com nova estrutura:", {
      structure: `${userId}/videos/${fileName}`,
      success: true
    })

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
      body: file,
    })

    if (!response.ok) {
      console.error("Upload response:", response.status, response.statusText)
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    // URL final do vídeo com nova estrutura
    const videoUrl = getMinioUserFileUrl(userId, "video", fileName)

    console.log("✅ Upload de vídeo com nova estrutura bem-sucedido")

    return {
      success: true,
      url: videoUrl,
      message: "Upload de vídeo realizado com sucesso",
    }
  } catch (error) {
    console.error("Erro no upload de vídeo:", error)
    return {
      success: false,
      message: "Erro ao fazer upload do vídeo. Verifique a conexão e tente novamente.",
    }
  }
}

export async function buscarCursoPorId(cursoId: string, instrutorId: string) {
  console.log("🚀 FUNÇÃO CHAMADA - buscarCursoPorId:", { cursoId, instrutorId });

  try {
    const client = await pool.connect()
    try {
      const query = `
        SELECT id, titulo, descricao, nivel, ativo, imagem_url, duracao_total, criado_em, atualizado_em, instrutor_id
        FROM rarcursos.cursos
        WHERE id = $1 AND instrutor_id = $2
        LIMIT 1
      `
      const result = await client.query(query, [cursoId, instrutorId])
      const data = result.rows?.[0] || null

      if (!data) {
        return { success: false, message: "Curso não encontrado", data: null }
      }

      return { success: true, data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("💥 Erro inesperado ao buscar curso (PG):", error)
    return { success: false, message: "Erro inesperado ao buscar curso", data: null }
  }
}

export async function editarCurso(cursoId: string, cursoData: CursoData) {
  try {
    // Verificar se o instrutor_id foi fornecido
    if (!cursoData.instrutor_id) {
      return { success: false, message: "ID do instrutor é obrigatório" }
    }

    const client = await pool.connect()
    try {
      // Verificar se o curso existe e pertence ao instrutor
      const checkQuery = `
        SELECT instrutor_id FROM rarcursos.cursos WHERE id = $1 LIMIT 1
      `
      const checkRes = await client.query(checkQuery, [cursoId])
      const cursoExistente = checkRes.rows?.[0]

      if (!cursoExistente) {
        return { success: false, message: "Curso não encontrado" }
      }

      if (cursoExistente.instrutor_id !== cursoData.instrutor_id) {
        return { success: false, message: "Sem permissão para editar este curso" }
      }

      // Atualizar curso
      const updateQuery = `
        UPDATE rarcursos.cursos
        SET titulo = $1,
            descricao = $2,
            nivel = $3,
            ativo = $4,
            imagem_url = $5,
            duracao_total = $6,
            atualizado_em = NOW()
        WHERE id = $7
        RETURNING id, titulo, descricao, nivel, ativo, imagem_url, duracao_total, criado_em, atualizado_em, instrutor_id
      `
      const params = [
        cursoData.titulo,
        cursoData.descricao,
        cursoData.nivel,
        cursoData.ativo,
        cursoData.imagem_url ?? null,
        typeof cursoData.duracao_total === 'number' ? cursoData.duracao_total : null,
        cursoId
      ]
      const updateRes = await client.query(updateQuery, params)
      const data = updateRes.rows?.[0]

      return { success: true, message: "Curso editado com sucesso!", data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado:", error)
    return { success: false, message: "Erro inesperado ao editar curso" }
  }
}

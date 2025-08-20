"use server"

import { getMinioClientFileUrl, getMinioUserUploadUrl, getMinioUserPath } from "@/lib/minio-config"
import { Pool } from "pg"

// Configuração do banco PostgreSQL (mesma usada no dashboard/admin)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

export async function getUserFreshData(userId: string) {
  try {
    console.log("Buscando dados frescos do perfil para usuário:", userId)
    const client = await pool.connect()
    try {
      const query = `SELECT * FROM rarcursos.users WHERE uid = $1`
      const result = await client.query(query, [userId])
      const userData = result.rows[0] || null
      console.log("Dados do perfil encontrados:", userData)
      return userData
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro na função getUserFreshData do perfil:", error)
    return null
  }
}

export async function updateUserProfile(userId: string, profileData: any) {
  try {
    const client = await pool.connect()
    try {
      // Permitimos apenas campos seguros
      const allowed: Record<string, any> = {}
      if (typeof profileData?.nome === "string") allowed.nome = profileData.nome
      if (typeof profileData?.whatsapp === "string") allowed.whatsapp = profileData.whatsapp
      if (typeof profileData?.bio === "string") allowed.bio = profileData.bio

      const keys = Object.keys(allowed)
      if (keys.length === 0) return { success: true, data: null }

      const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ")
      const values = [userId, ...keys.map((k) => allowed[k])]
      const query = `UPDATE rarcursos.users SET ${setClauses} WHERE uid = $1 RETURNING *`
      const result = await client.query(query, values)
      return { success: true, data: result.rows[0] }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error)
    return { success: false, error: error.message }
  }
}

export async function uploadProfilePhoto(userId: string, file: File) {
  try {
    if (!userId || !file) return { success: false, error: "Parâmetros inválidos" }

    // Gerar nome único e caminho relativo na nova estrutura
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `profile-${timestamp}-${cleanFileName}`
    const key = getMinioUserPath(userId, "imagem", fileName)

    // URL de upload direto para o MinIO
    const uploadUrl = getMinioUserUploadUrl(userId, "imagem", fileName)

    // Enviar via HTTP PUT (payload não assinado)
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "image/jpeg",
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Falha no upload: ${response.status} ${response.statusText}`)
    }

    // Atualizar no banco o caminho relativo
    const client = await pool.connect()
    try {
      await client.query(`UPDATE rarcursos.users SET url_foto = $1 WHERE uid = $2`, [key, userId])
    } finally {
      client.release()
    }

    return { success: true, url: key }
  } catch (error: any) {
    console.error("Erro no upload da foto:", error)
    return { success: false, error: error.message }
  }
}

export async function getSignedPhotoUrl(filePath: string) {
  try {
    if (!filePath) return null

    // Se já é uma URL completa (http/https), retornar como está
    if (/^https?:\/\//i.test(filePath)) {
      return filePath
    }

    // Se veio no formato público do Supabase, extrair apenas o caminho após o bucket
    let cleanPath = filePath
    if (filePath.includes("storage/v1/object/public/ead/")) {
      cleanPath = filePath.split("storage/v1/object/public/ead/")[1]
    }

    // Gerar URL pública via MinIO (bucket público)
    const publicUrl = getMinioClientFileUrl(cleanPath)
    return publicUrl
  } catch (error) {
    console.error("Erro na função getSignedPhotoUrl (MinIO):", error)
    return null
  }
}

// Função para migrar URLs antigas para caminhos
export async function migratePhotoUrls() {
  try {
    console.log("Iniciando migração de URLs de fotos...")
    const client = await pool.connect()
    try {
      const selectQuery = `SELECT uid, url_foto FROM rarcursos.users WHERE url_foto LIKE '%storage/v1/object/public/ead/%'`
      const { rows } = await client.query(selectQuery)
      console.log(`Encontrados ${rows.length} usuários para migrar`)

      for (const user of rows) {
        if (user.url_foto) {
          const cleanPath = String(user.url_foto).split("storage/v1/object/public/ead/")[1]
          console.log(`Migrando usuário ${user.uid}: ${user.url_foto} -> ${cleanPath}`)
          await client.query(`UPDATE rarcursos.users SET url_foto = $1 WHERE uid = $2`, [cleanPath, user.uid])
        }
      }

      console.log("Migração concluída!")
      return { success: true, migrated: rows.length }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Erro na migração:", error)
    return { success: false, error: error.message }
  }
}

// Função para enviar solicitação de verificação
export async function sendVerificationRequest(
  userId: string,
  action: "confirmar_email" | "confirmar_whatsapp",
  contact: string,
) {
  try {
    console.log(`Enviando solicitação de verificação: ${action} para usuário ${userId}`)

    const response = await fetch("https://rarwhk.rardevops.com/webhook/confirmar-dados", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        acao: action,
        user: userId,
        [action === "confirmar_email" ? "email" : "whatsapp"]: contact,
      }),
    })

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    console.log("Solicitação de verificação enviada com sucesso")
    return { success: true }
  } catch (error: any) {
    console.error("Erro ao enviar solicitação de verificação:", error)
    return { success: false, error: error.message }
  }
}

// Função para verificar token
export async function verifyToken(userId: string, token: string, type: "email" | "whatsapp") {
  try {
    console.log(`Verificando token ${type} para usuário ${userId}`)
    const client = await pool.connect()
    try {
      const selectQuery = `SELECT mail_token, wpp_token FROM rarcursos.users WHERE uid = $1`
      const result = await client.query(selectQuery, [userId])
      const userData = result.rows[0]
      if (!userData) return { success: false, error: "Usuário não encontrado" }
      const storedToken = type === "email" ? userData.mail_token : userData.wpp_token

      if (!storedToken) {
        return { success: false, error: "Token não encontrado. Solicite um novo token." }
      }

      if (storedToken !== token) {
        return { success: false, error: "Token incorreto. Tente novamente." }
      }

      // Token correto - atualizar status de validação
      if (type === "email") {
        await client.query(`UPDATE rarcursos.users SET mail_valid = true, mail_token = NULL WHERE uid = $1`, [userId])
      } else {
        await client.query(`UPDATE rarcursos.users SET wpp_valid = true, wpp_token = NULL WHERE uid = $1`, [userId])
      }

      console.log(`${type} validado com sucesso para usuário ${userId}`)
      return { success: true }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Erro na verificação do token:", error)
    return { success: false, error: error.message }
  }
}

// Função para atualizar email após verificação
export async function updateEmailAfterVerification(userId: string, newEmail: string, token: string) {
  try {
    console.log(`Atualizando email para usuário ${userId}`)
    const client = await pool.connect()
    try {
      const result = await client.query(`SELECT mail_token FROM rarcursos.users WHERE uid = $1`, [userId])
      const row = result.rows[0]
      if (!row || !row.mail_token || row.mail_token !== token) {
        return { success: false, error: "Token inválido" }
      }

      await client.query(
        `UPDATE rarcursos.users SET email = $1, mail_valid = true, mail_token = NULL WHERE uid = $2`,
        [newEmail, userId]
      )
      return { success: true }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Erro ao atualizar email:", error)
    return { success: false, error: error.message }
  }
}

// Função para atualizar WhatsApp após verificação
export async function updateWhatsAppAfterVerification(userId: string, newWhatsApp: string, token: string) {
  try {
    console.log(`Atualizando WhatsApp para usuário ${userId}`)
    const client = await pool.connect()
    try {
      const result = await client.query(`SELECT wpp_token FROM rarcursos.users WHERE uid = $1`, [userId])
      const row = result.rows[0]
      if (!row || !row.wpp_token || row.wpp_token !== token) {
        return { success: false, error: "Token inválido" }
      }

      await client.query(
        `UPDATE rarcursos.users SET whatsapp = $1, wpp_valid = true, wpp_token = NULL WHERE uid = $2`,
        [newWhatsApp, userId]
      )
      return { success: true }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error("Erro ao atualizar WhatsApp:", error)
    return { success: false, error: error.message }
  }
}

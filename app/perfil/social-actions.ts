"use server"

import { Pool } from "pg"

interface ActionResult {
  success: boolean
  error?: string
}

// Pool compartilhado (mesma config das outras rotas)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

export async function addSocialLink(userId: string, key: string, url: string): Promise<ActionResult> {
  try {
    const client = await pool.connect()
    try {
      const select = await client.query(
        `SELECT social_links FROM rarcursos.users WHERE uid = $1`,
        [userId]
      )
      const current = (select.rows[0]?.social_links as Record<string, string>) || {}
      const updated = { ...current, [key]: url }
      await client.query(
        `UPDATE rarcursos.users SET social_links = $1 WHERE uid = $2`,
        [updated, userId]
      )
      return { success: true }
    } finally {
      client.release()
    }
  } catch (err: unknown) {
    console.error("addSocialLink error", err)
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}

export async function removeSocialLink(userId: string, removeKey: string): Promise<ActionResult> {
  try {
    const client = await pool.connect()
    try {
      const select = await client.query(
        `SELECT social_links FROM rarcursos.users WHERE uid = $1`,
        [userId]
      )
      const current = (select.rows[0]?.social_links as Record<string, string>) || {}
      if (!(removeKey in current)) return { success: true }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete current[removeKey]
      await client.query(
        `UPDATE rarcursos.users SET social_links = $1 WHERE uid = $2`,
        [current, userId]
      )
      return { success: true }
    } finally {
      client.release()
    }
  } catch (err: unknown) {
    console.error("removeSocialLink error", err)
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}

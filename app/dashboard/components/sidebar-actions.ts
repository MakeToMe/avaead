"use server"

import { Pool } from 'pg'
import type { User as AuthUser } from "@/lib/auth-client"
import { getMinioClientFileUrl } from "@/lib/minio-config"

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

export async function getUserFresh(email: string): Promise<AuthUser | null> {
  const client = await pool.connect();
  
  try {
    const userQuery = 'SELECT * FROM rarcursos.users WHERE email = $1';
    const result = await client.query(userQuery, [email]);

    if (result.rows.length === 0) {
      console.error("Usuário não encontrado:", email)
      return null
    }

    // console.debug("Dados frescos do usuário carregados:", result.rows[0].nome)
    return result.rows[0] as AuthUser
  } catch (error) {
    console.error("Erro ao buscar usuário fresco:", error)
    return null
  } finally {
    client.release();
  }
}

export async function getSignedPhotoUrl(filePath: string) {
  try {
    const trimmed = (filePath || '').trim()
    if (!trimmed) return '/placeholder-user.jpg'

    // URL absoluta (http/https) permanece como está
    if (/^https?:\/\//i.test(trimmed)) return trimmed

    // Normalizar e montar URL pública do MinIO
    const relative = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
    const safeRelative = relative.replace(/\\/g, '/').replace(/\.{2}\//g, '')
    return getMinioClientFileUrl(safeRelative)
  } catch (error) {
    console.error("Erro na função getSignedPhotoUrl:", error)
    return '/placeholder-user.jpg'
  }
}

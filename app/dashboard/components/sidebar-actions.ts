"use server"

import { Pool } from 'pg'
import type { User as AuthUser } from "@/lib/auth-client"
import fs from 'fs'
import path from 'path'

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
    // TODO: Implementar geração de URL assinada com PostgreSQL/Storage
    // Enquanto isso, normalizamos o caminho e usamos placeholder se não existir
    const trimmed = (filePath || '').trim()
    if (!trimmed) {
      return '/placeholder-user.jpg'
    }

    // Se for URL absoluta (http/https), retornar como está
    const isExternal = /^https?:\/\//i.test(trimmed)
    if (isExternal) return trimmed

    // Normalizar caminho relativo ao public/
    const relative = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
    const safeRelative = relative.replace(/\\/g, '/').replace(/\.\.\//g, '')
    const publicFile = path.resolve(process.cwd(), 'public', safeRelative)

    // Verificar existência do arquivo em public/
    if (fs.existsSync(publicFile)) {
      return `/${safeRelative}`
    }

    // Fallback para placeholder se não existir
    return '/placeholder-user.jpg'
  } catch (error) {
    console.error("Erro na função getSignedPhotoUrl:", error)
    return null
  }
}

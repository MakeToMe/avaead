import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { pool } from "./db-pool"
import { verifyJwt } from "./auth-jwt"

export interface User {
  uid: string
  perfis: string
  nome: string
  email: string
  whatsapp?: string
  cpf?: string
  nascimento?: string
  bio?: string
  criado_em: string
  atualizado_em: string
  url_foto?: string
}

// Função para hash da senha
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Função para verificar senha
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Função para criar sessão
export async function createSession(userId: string) {
  const sessionToken = crypto.randomUUID()
  const cookieStore = await cookies()

  // Cookie HTTP-only que expira em 7 dias
  cookieStore.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  })

  // Aqui você pode armazenar o token de sessão no banco se quiser
  // Por simplicidade, vamos usar apenas o userId no token
  cookieStore.set("userId", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  })
}

// Função para obter usuário da sessão
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()

  // 1. Tenta via JWT HTTP-only (cookie "session")
  const jwtToken = cookieStore.get("session")?.value
  let userId: string | undefined
  if (jwtToken) {
    const payload = verifyJwt(jwtToken)
    if (payload) {
      userId = payload.uid
    }
  }

  // 2. Fallback para cookie "userId" (legacy)
  if (!userId) {
    userId = cookieStore.get("userId")?.value
  }

  if (!userId) {
    return null
  }

  const client = await pool.connect()
  try {
    const query = 'SELECT * FROM rarcursos.users WHERE uid = $1'
    const result = await client.query(query, [userId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0] as User
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  } finally {
    client.release()
  }
}

// Função para fazer logout
export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  cookieStore.delete("userId")
}

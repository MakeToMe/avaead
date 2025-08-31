import { NextRequest, NextResponse } from "next/server"
import { verifyJwt, createJwt } from "@/lib/auth-jwt"
import { cookies } from "next/headers"
import { Pool } from 'pg'

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

// Rate limiting simples (em produção usar Redis)
const renewalAttempts = new Map<string, { count: number, lastAttempt: number }>()
const MAX_RENEWALS_PER_HOUR = 10
const HOUR_IN_MS = 60 * 60 * 1000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userAttempts = renewalAttempts.get(userId)
  
  if (!userAttempts) {
    renewalAttempts.set(userId, { count: 1, lastAttempt: now })
    return true
  }
  
  // Reset contador se passou mais de 1 hora
  if (now - userAttempts.lastAttempt > HOUR_IN_MS) {
    renewalAttempts.set(userId, { count: 1, lastAttempt: now })
    return true
  }
  
  // Verificar se excedeu limite
  if (userAttempts.count >= MAX_RENEWALS_PER_HOUR) {
    return false
  }
  
  // Incrementar contador
  userAttempts.count++
  userAttempts.lastAttempt = now
  return true
}

export async function POST(_: NextRequest) {
  console.log("🔄 /api/auth/refresh-session - Iniciando renovação de sessão")
  
  const client = await pool.connect()
  
  try {
    const cookieStore = await cookies()
    const currentToken = cookieStore.get("session")?.value
    
    if (!currentToken) {
      console.log("❌ Token atual não encontrado")
      return NextResponse.json({ 
        success: false,
        message: "No current session to refresh" 
      }, { status: 401 })
    }

    const payload = verifyJwt(currentToken)
    
    if (!payload) {
      console.log("❌ Token atual inválido")
      return NextResponse.json({ 
        success: false,
        message: "Invalid current session" 
      }, { status: 401 })
    }

    // Verificar rate limiting
    if (!checkRateLimit(payload.uid)) {
      console.log("❌ Rate limit excedido para usuário:", payload.uid)
      return NextResponse.json({ 
        success: false,
        message: "Too many renewal attempts. Try again later." 
      }, { status: 429 })
    }

    // Verificar se usuário ainda existe no banco
    console.log("🔍 Verificando usuário no banco:", payload.uid)
    const userQuery = `
      SELECT uid, nome, email, perfis 
      FROM rarcursos.users 
      WHERE uid = $1
    `
    
    const result = await client.query(userQuery, [payload.uid])
    
    if (result.rows.length === 0) {
      console.log("❌ Usuário não encontrado no banco")
      return NextResponse.json({ 
        success: false,
        message: "User not found" 
      }, { status: 404 })
    }
    
    const user = result.rows[0]
    
    // Criar novo token JWT com expiração estendida (2 horas)
    const newToken = createJwt({ 
      uid: user.uid, 
      email: user.email,
      perfis: user.perfis 
    })
    
    // Atualizar cookie com novo token
    const response = NextResponse.json({
      success: true,
      message: "Session renewed successfully",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
      user: {
        uid: user.uid,
        nome: user.nome,
        email: user.email,
        perfis: user.perfis
      }
    })
    
    response.cookies.set("session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60, // 2 horas em segundos
      path: "/"
    })
    
    console.log("✅ Sessão renovada com sucesso para usuário:", user.email)
    return response
    
  } catch (error) {
    console.error("❌ Erro ao renovar sessão:", error)
    return NextResponse.json({ 
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    client.release()
  }
}
import { NextRequest, NextResponse } from "next/server"
import { verifyJwt } from "@/lib/auth-jwt"
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

export async function GET(_: NextRequest) {
  console.log("🔍 /api/auth/me - Iniciando verificação de sessão")
  
  const client = await pool.connect();
  
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    
    console.log("🍪 Token encontrado:", token ? "✅ Sim" : "❌ Não")
    
    if (!token) {
      console.log("❌ Token não encontrado, retornando 401")
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const payload = verifyJwt(token)
    console.log("🔐 JWT payload:", payload ? "✅ Válido" : "❌ Inválido")
    
    if (!payload) {
      console.log("❌ JWT inválido, limpando cookie")
      cookieStore.delete("session")
      return NextResponse.json({ message: "Invalid session" }, { status: 401 })
    }

    console.log("🔍 Buscando usuário no PostgreSQL, UID:", payload.uid)
    const userQuery = `
      SELECT uid, nome, email, perfis, criado_em, atualizado_em, url_foto 
      FROM rarcursos.users 
      WHERE uid = $1
    `;
    
    const result = await client.query(userQuery, [payload.uid]);
    
    if (result.rows.length === 0) {
      console.log("❌ Usuário não encontrado")
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }
    
    const user = result.rows[0];
    console.log("✅ Usuário encontrado:", user.email)
    return NextResponse.json({ user })
    
  } catch (error) {
    console.error("❌ Erro crítico em /api/auth/me:", error)
    return NextResponse.json({ 
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    client.release();
  }
}

import { NextRequest, NextResponse } from "next/server"
import { verifyJwt } from "@/lib/auth-jwt"
import { cookies } from "next/headers"

export async function GET(_: NextRequest) {
  console.log("🔍 /api/auth/session-status - Verificando status da sessão")
  
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    
    if (!token) {
      console.log("❌ Token não encontrado")
      return NextResponse.json({ 
        isActive: false,
        message: "No session token found" 
      }, { status: 401 })
    }

    const payload = verifyJwt(token)
    
    if (!payload) {
      console.log("❌ JWT inválido")
      return NextResponse.json({ 
        isActive: false,
        message: "Invalid session token" 
      }, { status: 401 })
    }

    // Calcular tempo restante em minutos
    const now = Math.floor(Date.now() / 1000)
    const timeRemaining = Math.max(0, payload.exp - now)
    const timeRemainingMinutes = Math.floor(timeRemaining / 60)
    
    // Considerar próximo do vencimento se restam menos de 10 minutos
    const isNearExpiry = timeRemainingMinutes < 10
    
    console.log(`✅ Sessão ativa. Tempo restante: ${timeRemainingMinutes} minutos`)
    
    return NextResponse.json({
      isActive: true,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      timeRemainingMinutes,
      isNearExpiry,
      userId: payload.uid
    })
    
  } catch (error) {
    console.error("❌ Erro ao verificar status da sessão:", error)
    return NextResponse.json({ 
      isActive: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
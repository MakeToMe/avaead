import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/auth-jwt";
import { Pool } from 'pg';
import { verifyPassword } from "@/lib/auth";

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

export async function POST(req: NextRequest) {
  console.log("🔐 /api/auth/signin - Iniciando processo de login")
  
  const client = await pool.connect();
  
  try {
    const { email, password } = (await req.json()) as { email: string; password: string };
    console.log("📧 Email recebido:", email)

    if (!email || !password) {
      console.log("❌ Email ou senha não fornecidos")
      return NextResponse.json({ message: "Email e senha são obrigatórios" }, { status: 400 });
    }

    console.log("🔍 Conectando ao PostgreSQL...")

    console.log("🔍 Buscando usuário por email...")
    const userQuery = `
      SELECT uid, email, senha, nome, perfis, criado_em, url_foto 
      FROM rarcursos.users 
      WHERE email = $1
    `;
    
    const result = await client.query(userQuery, [email]);

    if (result.rows.length === 0) {
      console.log("❌ Usuário não encontrado para email:", email)
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 401 });
    }
    
    const user = result.rows[0];
    console.log("✅ Usuário encontrado:", user.email)

    const isValid = await verifyPassword(password, user.senha);
    if (!isValid) {
            return NextResponse.json({ message: "Senha inválida" }, { status: 401 });
    }

    const { senha, ...userWithoutPassword } = user;

    // Gerar JWT e definir cookie HTTP-only
    const token = signJwt({ uid: user.uid });
    const res = NextResponse.json({ user: userWithoutPassword });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  } finally {
    client.release();
  }
}

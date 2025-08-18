import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/auth-jwt";
import { Pool } from 'pg';
import { hashPassword } from "@/lib/auth";

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
  const client = await pool.connect();
  
  try {
    const { name, email, password } = (await req.json()) as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    // Verificar se email já existe
    const existingQuery = 'SELECT uid FROM rarcursos.users WHERE email = $1';
    const existingResult = await client.query(existingQuery, [email]);
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ message: "Email já cadastrado" }, { status: 409 });
    }

    const hashed = await hashPassword(password);

    // Inserir novo usuário
    const insertQuery = `
      INSERT INTO rarcursos.users (nome, email, senha, perfis, criado_em) 
      VALUES ($1, $2, $3, $4, NOW()) 
      RETURNING uid, nome, email, perfis, criado_em, url_foto
    `;
    
    const insertResult = await client.query(insertQuery, [name, email, hashed, 'aluno']);
    
    if (insertResult.rows.length === 0) {
      return NextResponse.json({ message: "Erro ao criar usuário" }, { status: 500 });
    }
    
    const newUser = insertResult.rows[0];

    // Gerar JWT e definir cookie de sessão
    const token = signJwt({ uid: newUser.uid });
    const res = NextResponse.json({ user: newUser });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
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

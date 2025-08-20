"use server"

import { getSignedPhotoUrl } from "@/app/perfil/actions"
import { Pool } from "pg"

// Pool Postgres (seguir a mesma configuração usada em outras ações)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

export async function getAllUsers(page = 1, limit = 20, search = "", currentInstrutorId = "") {
  const offset = (page - 1) * limit

  try {
    const client = await pool.connect()
    try {
      // Filtros dinâmicos (busca)
      const filters: string[] = []
      const filterParams: any[] = []

      if (search.trim()) {
        const like = `%${search}%`
        filterParams.push(like, like, like)
        filters.push(`(u.nome ILIKE $${filterParams.length - 2} OR u.email ILIKE $${filterParams.length - 1} OR u.cpf ILIKE $${filterParams.length})`)
      }

      // Consulta base: usuários matriculados em cursos do instrutor
      if (!currentInstrutorId) {
        // Sem instrutor, nada a listar
        return { users: [], total: 0 }
      }

      // COUNT DISTINCT usuários
      const countSql = `
        SELECT COUNT(DISTINCT u.uid)::int AS total
        FROM rarcursos.users u
        JOIN rarcursos.matriculas m ON m.aluno_id = u.uid
        JOIN rarcursos.cursos c ON c.id = m.curso_id
        WHERE c.instrutor_id = $1
        ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
      `
      const countRes = await client.query(countSql, [currentInstrutorId, ...filterParams])
      const total = countRes.rows?.[0]?.total ?? 0

      // Lista paginada
      const listParams = [currentInstrutorId, ...filterParams, limit, offset]
      const listSql = `
        SELECT DISTINCT ON (u.uid) u.*
        FROM rarcursos.users u
        JOIN rarcursos.matriculas m ON m.aluno_id = u.uid
        JOIN rarcursos.cursos c ON c.id = m.curso_id
        WHERE c.instrutor_id = $1
        ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
        ORDER BY u.uid, u.criado_em DESC
        LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
      `
      const listRes = await client.query(listSql, listParams)
      const users = listRes.rows || []

      // Processar URLs das fotos
      const usersWithPhotos = await Promise.all(
        users.map(async (user: any) => {
          let photoUrl: string | null = null
          if (user.url_foto) {
            photoUrl = await getSignedPhotoUrl(user.url_foto)
          }
          return { ...user, photoUrl }
        }),
      )

      return { users: usersWithPhotos, total }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao buscar usuários (PG):", error)
    return { users: [], total: 0 }
  }
}

export async function updateUserProfile(userId: string, newProfile: string) {
  try {
    const client = await pool.connect()
    try {
      const upd = await client.query(
        `UPDATE rarcursos.users
         SET perfis = $1, atualizado_em = NOW()
         WHERE uid = $2
         RETURNING *`,
        [newProfile, userId],
      )
      const data = upd.rows?.[0]
      if (!data) return { success: false, error: "Usuário não encontrado" }
      return { success: true, data }
    } finally {
      client.release()
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro inesperado ao atualizar perfil"
    console.error("Erro ao atualizar perfil (PG):", error)
    return { success: false, error: msg }
  }
}

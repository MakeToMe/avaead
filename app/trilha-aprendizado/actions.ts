"use server"

import { Pool } from "pg"

export interface CursoDisponivel {
  id: string
  titulo: string
  descricao: string
  imagem_url: string | null
  instrutor_nome: string
  duracao_total: number
  total_aulas: number
  criado_em: string
  matriculado: boolean
}

export interface CursoMatriculado {
  id: string
  titulo: string
  descricao: string
  imagem_url: string | null
  instrutor_nome: string
  duracao_total: number
  total_aulas: number
  progresso_percentual: number
  status: string
  data_matricula: string
}

// Função helper para registrar atividade
async function registrarAtividade(
  userId: string,
  tipo: string,
  titulo: string,
  descricao: string,
  icone: string,
  corIcone: string,
  entidadeTipo: string,
  entidadeId: string,
  url: string,
  metadados: any = {},
) {
  try {
    console.log("=== REGISTRANDO ATIVIDADE ===")
    console.log("userId:", userId)
    console.log("tipo:", tipo)
    console.log("titulo:", titulo)
    console.log("descricao:", descricao)

    const client = await pool.connect()
    try {
      const insertQuery = `
        INSERT INTO rarcursos.atividades_recentes 
          (usuario_uid, tipo_atividade, titulo, descricao, icone, cor_icone, entidade_tipo, entidade_id, url, metadados)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `
      const params = [
        userId,
        tipo,
        titulo,
        descricao,
        icone,
        corIcone,
        entidadeTipo,
        entidadeId,
        url,
        metadados ?? {},
      ]
      const res = await client.query(insertQuery, params)
      console.log("Atividade registrada com sucesso:", res.rows?.[0])
      return { success: true, data: res.rows?.[0] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao registrar atividade:", error)
    return { success: false, error }
  }
}

// Buscar cursos disponíveis para matrícula (apenas com aulas)
export async function buscarCursosDisponiveis(userId: string) {
  try {
    if (!userId) {
      return { success: false, error: "ID do usuário é obrigatório" }
    }

    const client = await pool.connect()
    try {
      // Buscar cursos ativos com contagem de aulas
      const cursosQuery = `
        SELECT 
          c.id,
          c.titulo,
          c.descricao,
          c.imagem_url,
          COALESCE(c.duracao_total, 0) AS duracao_total,
          c.criado_em,
          c.instrutor_id,
          COUNT(a.id)::int AS total_aulas
        FROM rarcursos.cursos c
        LEFT JOIN rarcursos.aulas a ON a.curso_id = c.id
        WHERE c.ativo = TRUE
        GROUP BY c.id
        ORDER BY c.criado_em DESC
      `
      const cursosRes = await client.query(cursosQuery)
      const cursos = (cursosRes.rows || []).filter((c: any) => c.total_aulas > 0)

      if (cursos.length === 0) {
        return { success: true, data: [] }
      }

      // Buscar matrículas do usuário
      const matQuery = `
        SELECT curso_id FROM rarcursos.matriculas WHERE aluno_id = $1
      `
      const matRes = await client.query(matQuery, [userId])
      const cursosMatriculados = new Set((matRes.rows || []).map((m: any) => m.curso_id))

      // Buscar nomes dos instrutores
      const instrutorIds = [...new Set(cursos.map((c: any) => c.instrutor_id))]
      let instrutoresMap = new Map<string, string>()
      if (instrutorIds.length > 0) {
        const instrutoresRes = await client.query(
          `SELECT uid, nome FROM rarcursos.users WHERE uid = ANY($1::uuid[])`,
          [instrutorIds],
        )
        instrutoresMap = new Map((instrutoresRes.rows || []).map((i: any) => [i.uid, i.nome]))
      }

      const data: CursoDisponivel[] = cursos.map((curso: any) => ({
        id: curso.id,
        titulo: curso.titulo,
        descricao: curso.descricao || "",
        imagem_url: curso.imagem_url,
        instrutor_nome: instrutoresMap.get(curso.instrutor_id) || "Instrutor",
        duracao_total: Number(curso.duracao_total) || 0,
        total_aulas: Number(curso.total_aulas) || 0,
        criado_em: curso.criado_em,
        matriculado: cursosMatriculados.has(curso.id),
      }))

      return { success: true, data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao buscar cursos disponíveis:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Buscar cursos matriculados do usuário (apenas com aulas)
export async function buscarCursosMatriculados(userId: string) {
  console.log("=== DEBUG buscarCursosMatriculados ===")
  console.log("userId:", userId)
  try {
    if (!userId) {
      return { success: false, error: "ID do usuário é obrigatório" }
    }

    const client = await pool.connect()
    try {
      // Buscar matrículas do usuário
      const matQuery = `
        SELECT id, progresso_percentual, status, data_matricula, curso_id
        FROM rarcursos.matriculas
        WHERE aluno_id = $1
        ORDER BY data_matricula DESC
      `
      const matRes = await client.query(matQuery, [userId])
      const matriculas = matRes.rows || []
      if (matriculas.length === 0) {
        return { success: true, data: [] }
      }

      // Buscar cursos
      const cursoIds = matriculas.map((m: any) => m.curso_id)
      const cursosRes = await client.query(
        `SELECT id, titulo, descricao, imagem_url, COALESCE(duracao_total, 0) AS duracao_total, instrutor_id 
         FROM rarcursos.cursos WHERE id = ANY($1::uuid[])`,
        [cursoIds],
      )
      const cursos = cursosRes.rows || []
      if (cursos.length === 0) {
        return { success: true, data: [] }
      }

      // Contagem de aulas por curso
      const aulasCountRes = await client.query(
        `SELECT curso_id, COUNT(*)::int AS total_aulas 
         FROM rarcursos.aulas 
         WHERE curso_id = ANY($1::uuid[]) 
         GROUP BY curso_id`,
        [cursoIds],
      )
      const aulasCountMap = new Map<string, number>(
        (aulasCountRes.rows || []).map((r: any) => [r.curso_id, Number(r.total_aulas)]),
      )

      // Nomes dos instrutores
      const instrutorIds = [...new Set(cursos.map((c: any) => c.instrutor_id))]
      let instrutoresMap = new Map<string, string>()
      if (instrutorIds.length > 0) {
        const instrutoresRes = await client.query(
          `SELECT uid, nome FROM rarcursos.users WHERE uid = ANY($1::uuid[])`,
          [instrutorIds],
        )
        instrutoresMap = new Map((instrutoresRes.rows || []).map((i: any) => [i.uid, i.nome]))
      }

      const cursosMap = new Map<string, any>(cursos.map((c: any) => [c.id, c]))

      const data: CursoMatriculado[] = matriculas.map((m: any) => {
        const curso = cursosMap.get(m.curso_id)
        if (!curso) return null
        return {
          id: curso.id,
          titulo: curso.titulo,
          descricao: curso.descricao || "",
          imagem_url: curso.imagem_url,
          instrutor_nome: instrutoresMap.get(curso.instrutor_id) || "Instrutor",
          duracao_total: Number(curso.duracao_total) || 0,
          total_aulas: aulasCountMap.get(curso.id) || 0,
          progresso_percentual: Number(m.progresso_percentual) || 0,
          status: m.status,
          data_matricula: m.data_matricula,
        }
      }).filter(Boolean) as CursoMatriculado[]

      return { success: true, data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao buscar cursos matriculados:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Fazer matrícula em um curso (com validação de aulas)
export async function matricularEmCurso(cursoId: string, userId: string) {
  try {
    console.log("=== INICIANDO MATRÍCULA ===")
    console.log("cursoId:", cursoId)
    console.log("userId:", userId)

    if (!userId || !cursoId) {
      return { success: false, error: "Dados obrigatórios não fornecidos" }
    }

    const client = await pool.connect()
    try {
      // Verificar curso
      const cursoRes = await client.query(
        `SELECT id, titulo, ativo FROM rarcursos.cursos WHERE id = $1 LIMIT 1`,
        [cursoId],
      )
      const curso = cursoRes.rows?.[0]
      if (!curso) {
        return { success: false, error: "Curso não encontrado" }
      }
      if (!curso.ativo) {
        return { success: false, error: "Este curso não está mais disponível" }
      }

      // Verificar aulas
      const aulasRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM rarcursos.aulas WHERE curso_id = $1`,
        [cursoId],
      )
      const totalAulas = Number(aulasRes.rows?.[0]?.total || 0)
      if (totalAulas === 0) {
        return { success: false, error: "Este curso ainda não possui aulas disponíveis" }
      }

      // Verificar matrícula existente
      const matExistsRes = await client.query(
        `SELECT id FROM rarcursos.matriculas WHERE aluno_id = $1 AND curso_id = $2 LIMIT 1`,
        [userId, cursoId],
      )
      if (matExistsRes.rows?.[0]) {
        return { success: false, error: "Você já está matriculado neste curso" }
      }

      // Criar matrícula
      await client.query(
        `INSERT INTO rarcursos.matriculas (aluno_id, curso_id, status, progresso_percentual, data_matricula)
         VALUES ($1, $2, 'ativa', 0, NOW())`,
        [userId, cursoId],
      )

      console.log("Matrícula criada com sucesso!")

      // Registrar atividade
      const resultadoAtividade = await registrarAtividade(
        userId,
        "matricula_curso",
        "Nova matrícula realizada",
        `Você se matriculou no curso "${curso.titulo}"`,
        "book-open",
        "indigo",
        "curso",
        cursoId,
        `/assistir-curso/${cursoId}`,
        {
          curso_titulo: curso.titulo,
          total_aulas: totalAulas,
        },
      )
      if (!resultadoAtividade.success) {
        console.error("Erro ao registrar atividade:", resultadoAtividade.error)
      }

      return { success: true, message: `Matrícula realizada com sucesso no curso "${curso.titulo}"!` }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro ao matricular em curso:", error)
    return { success: false, error: "Erro interno do servidor" }
  }
}

// Pool Postgres (config centralizada)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

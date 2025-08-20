"use server"

import { Pool } from 'pg'
import { registrarAtividade } from "./actions"

// Configuração do banco PostgreSQL
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false
});

// Buscar estatísticas para admin/instrutor
export async function getAdminStats(userId: string, userProfile: string) {
  const client = await pool.connect()

  try {
    if (userProfile === "admin") {
      // Admin vê estatísticas globais
      const cursosQuery = "SELECT COUNT(*) as count FROM rarcursos.cursos"
      const aulasQuery = "SELECT COUNT(*) as count FROM rarcursos.aulas"
      const alunosQuery = `
        SELECT COUNT(DISTINCT aluno_id) as count 
        FROM rarcursos.matriculas 
        WHERE status = 'ativa'
      `

      const [cursosResult, aulasResult, alunosResult] = await Promise.all([
        client.query(cursosQuery),
        client.query(aulasQuery),
        client.query(alunosQuery)
      ])

      return {
        cursosCount: parseInt(cursosResult.rows[0].count) || 0,
        aulasCount: parseInt(aulasResult.rows[0].count) || 0,
        alunosCount: parseInt(alunosResult.rows[0].count) || 0,
      }
    } else {
      // Instrutor vê apenas suas estatísticas
      const cursosQuery = `
        SELECT COUNT(*) as count 
        FROM rarcursos.cursos 
        WHERE instrutor_id = $1
      `
      
      const aulasQuery = `
        SELECT COUNT(DISTINCT a.id) as count
        FROM rarcursos.aulas a
        JOIN rarcursos.modulos m ON a.modulo_id = m.id
        JOIN rarcursos.cursos c ON m.curso_id = c.id
        WHERE c.instrutor_id = $1
      `
      
      const alunosQuery = `
        SELECT COUNT(DISTINCT m.aluno_id) as count
        FROM rarcursos.matriculas m
        JOIN rarcursos.cursos c ON m.curso_id = c.id
        WHERE m.status = 'ativa' AND c.instrutor_id = $1
      `

      const [cursosResult, aulasResult, alunosResult] = await Promise.all([
        client.query(cursosQuery, [userId]),
        client.query(aulasQuery, [userId]),
        client.query(alunosQuery, [userId])
      ])

      return {
        cursosCount: parseInt(cursosResult.rows[0].count) || 0,
        aulasCount: parseInt(aulasResult.rows[0].count) || 0,
        alunosCount: parseInt(alunosResult.rows[0].count) || 0,
      }
    }
  } catch (error) {
    console.error("Erro ao buscar estatísticas admin:", error)
    return {
      cursosCount: 0,
      aulasCount: 0,
      alunosCount: 0,
    }
  } finally {
    client.release()
  }
}

// Buscar alunos com paginação e filtro
export async function getAlunos(userId: string, userProfile: string, page = 1, limit = 10, search = "") {
  const client = await pool.connect()
  const offset = (page - 1) * limit

  try {
    // Query base para buscar matrículas com dados do usuário e curso
    let matriculasQuery = `
      SELECT 
        m.id as matricula_id,
        m.aluno_id,
        m.curso_id,
        m.criado_em,
        u.uid,
        u.nome,
        u.email,
        u.whatsapp,
        u.mail_valid,
        u.wpp_valid,
        u.url_foto,
        c.id as curso_id,
        c.titulo as curso_titulo
      FROM rarcursos.matriculas m
      JOIN rarcursos.users u ON m.aluno_id = u.uid
      JOIN rarcursos.cursos c ON m.curso_id = c.id
      WHERE m.status = 'ativa'
    `

    const queryParams: any[] = []
    let paramIndex = 1

    // Filtrar por instrutor se não for admin
    if (userProfile !== "admin") {
      matriculasQuery += ` AND c.instrutor_id = $${paramIndex}`
      queryParams.push(userId)
      paramIndex++
    }

    // Aplicar filtro de busca se fornecido
    if (search.trim()) {
      matriculasQuery += ` AND (u.nome ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    matriculasQuery += ` ORDER BY m.criado_em DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(limit, offset)

    const matriculasResult = await client.query(matriculasQuery, queryParams)
    const matriculas = matriculasResult.rows

    if (matriculas.length === 0) {
      return { alunos: [], total: 0 }
    }

    // Agrupar por aluno e seus cursos
    const alunosMap = new Map()

    matriculas.forEach((matricula: any) => {
      const alunoId = matricula.aluno_id

      if (!alunosMap.has(alunoId)) {
        alunosMap.set(alunoId, {
          uid: matricula.uid,
          nome: matricula.nome,
          email: matricula.email,
          whatsapp: matricula.whatsapp,
          email_verificado: matricula.mail_valid,
          whatsapp_verificado: matricula.wpp_valid,
          url_foto: matricula.url_foto,
          cursos: [],
          primeira_matricula: matricula.criado_em,
        })
      }

      const aluno = alunosMap.get(alunoId)
      aluno.cursos.push({
        id: matricula.curso_id,
        titulo: matricula.curso_titulo,
        matricula_id: matricula.matricula_id,
      })

      // Manter a data da primeira matrícula
      if (new Date(matricula.criado_em) < new Date(aluno.primeira_matricula)) {
        aluno.primeira_matricula = matricula.criado_em
      }
    })

    // Buscar progresso para cada curso de cada aluno
    const alunosComProgresso = await Promise.all(
      Array.from(alunosMap.values()).map(async (aluno) => {
        const cursosComProgresso = await Promise.all(
          aluno.cursos.map(async (curso) => {
            try {
              // Buscar total de aulas do curso
              const totalAulasQuery = `
                SELECT COUNT(*) as count
                FROM rarcursos.aulas a
                JOIN rarcursos.modulos m ON a.modulo_id = m.id
                WHERE m.curso_id = $1
              `
              const totalAulasResult = await client.query(totalAulasQuery, [curso.id])
              const totalAulas = parseInt(totalAulasResult.rows[0].count) || 0

              // Buscar aulas assistidas pelo aluno (se tabela progresso_aulas existir)
              let aulasAssistidas = 0
              try {
                const aulasAssistidasQuery = `
                  SELECT COUNT(*) as count
                  FROM rarcursos.progresso_aulas
                  WHERE matricula_id = $1 AND assistida = true
                `
                const aulasAssistidasResult = await client.query(aulasAssistidasQuery, [curso.matricula_id])
                aulasAssistidas = parseInt(aulasAssistidasResult.rows[0].count) || 0
              } catch (error) {
                // Tabela progresso_aulas pode não existir ainda
                aulasAssistidas = 0
              }

              const progresso = totalAulas > 0 ? Math.round((aulasAssistidas / totalAulas) * 100) : 0

              return {
                ...curso,
                progresso,
              }
            } catch (error) {
              console.error(`Erro ao calcular progresso do curso ${curso.id}:`, error)
              return {
                ...curso,
                progresso: 0,
              }
            }
          }),
        )

        return {
          ...aluno,
          cursos: cursosComProgresso,
        }
      }),
    )

    // Buscar total para paginação
    let countQuery = `
      SELECT COUNT(DISTINCT m.aluno_id) as count
      FROM rarcursos.matriculas m
      JOIN rarcursos.cursos c ON m.curso_id = c.id
      WHERE m.status = 'ativa'
    `

    const countParams: any[] = []
    let countParamIndex = 1

    if (userProfile !== "admin") {
      countQuery += ` AND c.instrutor_id = $${countParamIndex}`
      countParams.push(userId)
      countParamIndex++
    }

    if (search.trim()) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM rarcursos.users u 
        WHERE u.uid = m.aluno_id 
        AND (u.nome ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})
      )`
      countParams.push(`%${search}%`)
    }

    const countResult = await client.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count) || 0

    return {
      alunos: alunosComProgresso,
      total,
    }
  } catch (error) {
    console.error("Erro ao buscar alunos:", error)
    return { alunos: [], total: 0 }
  } finally {
    client.release()
  }
}

// Buscar cursos disponíveis para matricular aluno
export async function getCursosDisponiveis(userId: string, userProfile: string, alunoId: string) {
  const client = await pool.connect()

  try {
    // Buscar cursos que o aluno NÃO está matriculado
    const cursosMatriculadosQuery = `
      SELECT curso_id 
      FROM rarcursos.matriculas 
      WHERE aluno_id = $1 AND status = 'ativa'
    `
    const cursosMatriculadosResult = await client.query(cursosMatriculadosQuery, [alunoId])
    const cursosMatriculadosIds = cursosMatriculadosResult.rows.map(row => row.curso_id)

    // Query para buscar cursos disponíveis
    let cursosQuery = `
      SELECT id, titulo, nivel, ativo 
      FROM rarcursos.cursos 
      WHERE ativo = true
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Filtrar por instrutor se não for admin
    if (userProfile !== "admin") {
      cursosQuery += ` AND instrutor_id = $${paramIndex}`
      queryParams.push(userId)
      paramIndex++
    }

    // Excluir cursos já matriculados
    if (cursosMatriculadosIds.length > 0) {
      const placeholders = cursosMatriculadosIds.map((_, index) => `$${paramIndex + index}`).join(',')
      cursosQuery += ` AND id NOT IN (${placeholders})`
      queryParams.push(...cursosMatriculadosIds)
    }

    cursosQuery += ` ORDER BY titulo`

    const cursosResult = await client.query(cursosQuery, queryParams)
    return cursosResult.rows
  } catch (error) {
    console.error("Erro ao buscar cursos disponíveis:", error)
    return []
  } finally {
    client.release()
  }
}

// Matricular aluno manualmente
export async function matricularAlunoManualmente(instrutorId: string, alunoId: string, cursoId: string) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Verificar se já existe matrícula
    const matriculaExistenteQuery = `
      SELECT id FROM rarcursos.matriculas 
      WHERE aluno_id = $1 AND curso_id = $2
    `
    const matriculaExistenteResult = await client.query(matriculaExistenteQuery, [alunoId, cursoId])

    if (matriculaExistenteResult.rows.length > 0) {
      await client.query('ROLLBACK')
      return { success: false, error: "Aluno já está matriculado neste curso" }
    }

    // Buscar dados do curso e aluno para o registro de atividade
    const cursoQuery = "SELECT titulo FROM rarcursos.cursos WHERE id = $1"
    const alunoQuery = "SELECT nome FROM rarcursos.users WHERE uid = $1"

    const [cursoResult, alunoResult] = await Promise.all([
      client.query(cursoQuery, [cursoId]),
      client.query(alunoQuery, [alunoId])
    ])

    if (cursoResult.rows.length === 0 || alunoResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return { success: false, error: "Curso ou aluno não encontrado" }
    }

    // Criar matrícula
    const matriculaQuery = `
      INSERT INTO rarcursos.matriculas (aluno_id, curso_id, status, tipo_acesso)
      VALUES ($1, $2, 'ativa', 'matriculado')
      RETURNING *
    `
    const matriculaResult = await client.query(matriculaQuery, [alunoId, cursoId])
    const matricula = matriculaResult.rows[0]

    await client.query('COMMIT')

    // Registrar atividade NO PERFIL DO ALUNO (não do instrutor)
    try {
      await registrarAtividade(
        alunoId, // <- MUDANÇA: registrar no perfil do aluno
        "foi_matriculado",
        "Foi matriculado em um curso",
        `Você foi matriculado no curso "${cursoResult.rows[0].titulo}"`,
        "graduation-cap",
        "green",
        "matricula",
        matricula.id,
        `/trilha-aprendizado`,
        {
          curso_titulo: cursoResult.rows[0].titulo,
          matriculado_por: instrutorId,
        },
      )
    } catch (error) {
      console.error("Erro ao registrar atividade:", error)
      // Não falhar a matrícula por causa do log de atividade
    }

    return { success: true, data: matricula }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error("Erro ao matricular aluno:", error)
    return { success: false, error: "Erro interno do servidor" }
  } finally {
    client.release()
  }
}

"use server"

import { Pool } from 'pg'
import type { MinioFileType } from "@/lib/minio-config"

// Pool Postgres (mesma config usada em outras ações)
const pool = new Pool({
  host: "studio.rardevops.com",
  port: 4202,
  database: "postgres",
  user: "supabase_admin",
  password: "Aha517_Rar-PGRS_U2a59w",
  ssl: false,
})

export interface ModuloData {
  curso_id: string
  titulo: string
  descricao: string
  ordem: number
  ativo: boolean
}

export interface AulaData {
  curso_id: string
  modulo_id: string
  titulo: string
  descricao: string
  tipo: "video" | "texto" | "quiz" | "projeto"
  conteudo: string
  media_url?: string
  duracao?: number // em minutos
  ativo: boolean
  privada?: boolean
  ao_vivo?: boolean
}

// MÓDULOS
export async function criarModulo(moduloData: ModuloData, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      // Verificar posse do curso
      const checkCurso = await client.query(
        `SELECT instrutor_id FROM rarcursos.cursos WHERE id = $1 LIMIT 1`,
        [moduloData.curso_id],
      )
      const curso = checkCurso.rows?.[0]
      if (!curso) return { success: false, message: "Curso não encontrado" }
      if (curso.instrutor_id !== instrutorId)
        return { success: false, message: "Sem permissão para criar módulos neste curso" }

      // Inserir módulo
      const insert = await client.query(
        `INSERT INTO rarcursos.modulos (curso_id, titulo, descricao, ordem, ativo, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, curso_id, titulo, descricao, ordem, ativo, criado_em, atualizado_em`,
        [moduloData.curso_id, moduloData.titulo, moduloData.descricao, moduloData.ordem, moduloData.ativo],
      )
      const data = insert.rows?.[0]
      return { success: true, message: "Módulo criado com sucesso!", data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao criar módulo (PG):", error)
    return { success: false, message: "Erro inesperado ao criar módulo" }
  }
}

export async function buscarModulosDoCurso(cursoId: string, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      const check = await client.query(
        `SELECT instrutor_id FROM rarcursos.cursos WHERE id = $1 LIMIT 1`,
        [cursoId],
      )
      const curso = check.rows?.[0]
      if (!curso || curso.instrutor_id !== instrutorId) {
        return { success: false, message: "Curso não encontrado ou sem permissão", data: [] }
      }

      const res = await client.query(
        `SELECT id, curso_id, titulo, descricao, ordem, ativo, criado_em, atualizado_em
         FROM rarcursos.modulos
         WHERE curso_id = $1
         ORDER BY ordem ASC`,
        [cursoId],
      )
      return { success: true, data: res.rows || [] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao buscar módulos (PG):", error)
    return { success: false, message: "Erro inesperado", data: [] }
  }
}

// EDITAR NOME DO MÓDULO
export async function editarNomeModulo(moduloId: string, novoNome: string, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      // Buscar curso do módulo e verificar posse
      const mod = await client.query(
        `SELECT m.id, m.curso_id, c.instrutor_id
         FROM rarcursos.modulos m
         JOIN rarcursos.cursos c ON c.id = m.curso_id
         WHERE m.id = $1`,
        [moduloId],
      )
      const modulo = mod.rows?.[0]
      if (!modulo) return { success: false, message: "Módulo não encontrado" }
      if (modulo.instrutor_id !== instrutorId)
        return { success: false, message: "Sem permissão para editar este módulo" }

      const upd = await client.query(
        `UPDATE rarcursos.modulos
         SET titulo = $1, atualizado_em = NOW()
         WHERE id = $2
         RETURNING id, curso_id, titulo, descricao, ordem, ativo, criado_em, atualizado_em`,
        [novoNome, moduloId],
      )
      const data = upd.rows?.[0]
      return { success: true, message: "Nome do módulo editado com sucesso!", data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao editar nome do módulo (PG):", error)
    return { success: false, message: "Erro inesperado ao editar nome do módulo" }
  }
}

// AULAS
export async function criarAula(aulaData: AulaData, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      // Verificar posse do curso
      const checkCurso = await client.query(
        `SELECT instrutor_id FROM rarcursos.cursos WHERE id = $1 LIMIT 1`,
        [aulaData.curso_id],
      )
      const curso = checkCurso.rows?.[0]
      if (!curso) return { success: false, message: "Curso não encontrado" }
      if (curso.instrutor_id !== instrutorId)
        return { success: false, message: "Sem permissão para criar aulas neste curso" }

      // Verificar módulo pertence ao curso
      const checkModulo = await client.query(
        `SELECT id, curso_id FROM rarcursos.modulos WHERE id = $1 LIMIT 1`,
        [aulaData.modulo_id],
      )
      const modulo = checkModulo.rows?.[0]
      if (!modulo || modulo.curso_id !== aulaData.curso_id)
        return { success: false, message: "Módulo não encontrado ou não pertence ao curso" }

      // Inserir aula
      const insert = await client.query(
        `INSERT INTO rarcursos.aulas
         (curso_id, modulo_id, titulo, descricao, tipo, conteudo, media_url, duracao, ativo, privada, ao_vivo, criado_em, atualizado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())
         RETURNING id, curso_id, modulo_id, titulo, descricao, tipo, conteudo, media_url, duracao, ativo, privada, ao_vivo, criado_em, atualizado_em`,
        [
          aulaData.curso_id,
          aulaData.modulo_id,
          aulaData.titulo,
          aulaData.descricao,
          aulaData.tipo,
          aulaData.conteudo,
          aulaData.media_url ?? null,
          typeof aulaData.duracao === 'number' ? aulaData.duracao : null,
          aulaData.ativo,
          aulaData.privada ?? false,
          aulaData.ao_vivo ?? false,
        ],
      )
      const data = insert.rows?.[0]

      // Atualizações auxiliares
      await atualizarDuracaoCurso(aulaData.curso_id)
      await recalcularProgressoAlunos(aulaData.curso_id)

      return { success: true, message: "Aula criada com sucesso!", data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao criar aula (PG):", error)
    return { success: false, message: "Erro inesperado ao criar aula" }
  }
}

export async function buscarAulasDoInstrutor(
  instrutorId: string,
  pagina = 1,
  itensPorPagina = 6,
  cursoId?: string,
) {
  try {
    const client = await pool.connect()
    try {
      const offset = (pagina - 1) * itensPorPagina

      // Total
      const countQuery = `
        SELECT COUNT(a.id)::int AS total
        FROM rarcursos.aulas a
        JOIN rarcursos.cursos c ON c.id = a.curso_id
        WHERE c.instrutor_id = $1
        ${cursoId ? 'AND a.curso_id = $2' : ''}
      `
      const countRes = await client.query(countQuery, cursoId ? [instrutorId, cursoId] : [instrutorId])
      const totalAulas = countRes.rows?.[0]?.total ?? 0

      // Lista
      const listQuery = `
        SELECT a.id, a.titulo, a.descricao, a.tipo, a.ativo, a.duracao, a.criado_em, a.modulo_id, a.curso_id,
               c.id AS cursos_id, c.titulo AS cursos_titulo,
               m.id AS modulos_id, m.titulo AS modulos_titulo
        FROM rarcursos.aulas a
        JOIN rarcursos.cursos c ON c.id = a.curso_id
        JOIN rarcursos.modulos m ON m.id = a.modulo_id
        WHERE c.instrutor_id = $1
        ${cursoId ? 'AND a.curso_id = $2' : ''}
        ORDER BY a.criado_em DESC
        LIMIT $${cursoId ? 3 : 2} OFFSET $${cursoId ? 4 : 3}
      `
      const params = cursoId
        ? [instrutorId, cursoId, itensPorPagina, offset]
        : [instrutorId, itensPorPagina, offset]
      const listRes = await client.query(listQuery, params)

      // Mapear para shape esperado com nested cursos e modulos
      const data = (listRes.rows || []).map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        descricao: r.descricao,
        tipo: r.tipo,
        ativo: r.ativo,
        duracao: r.duracao,
        criado_em: r.criado_em,
        modulo_id: r.modulo_id,
        curso_id: r.curso_id,
        cursos: { id: r.cursos_id, titulo: r.cursos_titulo },
        modulos: { id: r.modulos_id, titulo: r.modulos_titulo },
      }))

      return { success: true, data, totalAulas }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao buscar aulas (PG):", error)
    return { success: false, message: "Erro inesperado", data: [], totalAulas: 0 }
  }
}

export async function buscarCursosDoInstrutor(instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT id, titulo FROM rarcursos.cursos WHERE instrutor_id = $1 AND ativo = true ORDER BY titulo ASC`,
        [instrutorId],
      )
      return { success: true, data: res.rows || [] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao buscar cursos (PG):", error)
    return { success: false, message: "Erro inesperado", data: [] }
  }
}

// Adicionar nova função para buscar cursos com contagem de aulas
export async function buscarCursosComAulas(instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT c.id, c.titulo, COALESCE(COUNT(a.id), 0)::int AS "totalAulas"
         FROM rarcursos.cursos c
         LEFT JOIN rarcursos.aulas a ON a.curso_id = c.id AND a.ativo = true
         WHERE c.instrutor_id = $1 AND c.ativo = true
         GROUP BY c.id, c.titulo
         ORDER BY c.titulo ASC`,
        [instrutorId],
      )
      return { success: true, data: res.rows || [] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao buscar cursos com aulas (PG):", error)
    return { success: false, message: "Erro inesperado", data: [] }
  }
}

// Função para atualizar duração total do curso
async function atualizarDuracaoCurso(cursoId: string) {
  const client = await pool.connect()
  try {
    const sumRes = await client.query(
      `SELECT COALESCE(SUM(duracao), 0)::int AS total FROM rarcursos.aulas WHERE curso_id = $1 AND ativo = true`,
      [cursoId],
    )
    const duracaoTotal = sumRes.rows?.[0]?.total ?? 0
    await client.query(
      `UPDATE rarcursos.cursos SET duracao_total = $1, atualizado_em = NOW() WHERE id = $2`,
      [duracaoTotal, cursoId],
    )
  } catch (error) {
    console.error("Erro inesperado ao atualizar duração (PG):", error)
  } finally {
    client.release()
  }
}

// Adicionar esta função para recalcular o progresso dos alunos após adicionar uma nova aula
// Adicionar após a função atualizarDuracaoCurso

// RECALCULAR PROGRESSO DOS ALUNOS
async function recalcularProgressoAlunos(cursoId: string) {
  const client = await pool.connect()
  try {
    // Matriculas ativas do curso
    const matRes = await client.query(
      `SELECT id, aluno_id FROM rarcursos.matriculas WHERE curso_id = $1 AND ativo = true`,
      [cursoId],
    )
    const matriculas = matRes.rows || []

    // Duração total do curso (aulas ativas)
    const totalRes = await client.query(
      `SELECT COALESCE(SUM(duracao), 0)::int AS total FROM rarcursos.aulas WHERE curso_id = $1 AND ativo = true`,
      [cursoId],
    )
    const duracaoTotalCurso = totalRes.rows?.[0]?.total ?? 0
    if (duracaoTotalCurso === 0) return

    // Para cada matrícula, somar durações assistidas
    for (const m of matriculas) {
      const progRes = await client.query(
        `SELECT COALESCE(SUM(a.duracao), 0)::int AS assistida
         FROM rarcursos.progresso_aulas pa
         JOIN rarcursos.aulas a ON a.id = pa.aula_id
         WHERE pa.matricula_id = $1 AND pa.assistida = true`,
        [m.id],
      )
      const duracaoAssistida = progRes.rows?.[0]?.assistida ?? 0
      const novoPercentual = Math.round((duracaoAssistida / duracaoTotalCurso) * 100)
      await client.query(
        `UPDATE rarcursos.matriculas
         SET progresso_percentual = $1, atualizado_em = NOW()
         WHERE id = $2`,
        [novoPercentual, m.id],
      )
    }
  } catch (error) {
    console.error("Erro inesperado ao recalcular progresso (PG):", error)
  } finally {
    client.release()
  }
}

// EXCLUSÃO DE ARQUIVOS DO MINIO
export async function excluirArquivoMinio(url: string): Promise<{ success: boolean; message?: string }> {
  try {
    if (!url) {
      return { success: true, message: "Nenhum arquivo para excluir" }
    }

    console.log("🗑️ Excluindo arquivo do MinIO (estrutura compatível):", url.replace(/\/[^\/]+$/, '/***'))

    // Importar funções de detecção e parsing
    const { detectStructureType, parseMinioUrl, getMinioConfig, getMinioUploadUrl, getMinioUserUploadUrl } = await import("@/lib/minio-config")
    
    // Detectar tipo de estrutura
    const structureType = detectStructureType(url)
    const parsedUrl = parseMinioUrl(url)
    
    console.log("🔍 Estrutura detectada:", structureType, parsedUrl.structure)

    let deleteUrl: string

    if (structureType === 'new' && parsedUrl.userId && parsedUrl.tipo && parsedUrl.fileName) {
      // Nova estrutura: usar função específica para usuário
      const tipoMap: Record<string, MinioFileType> = {
        'videos': 'video',
        'documentos': 'file', 
        'imagens': 'imagem'
      }
      const minioFileType = tipoMap[parsedUrl.tipo]
      deleteUrl = getMinioUserUploadUrl(parsedUrl.userId, minioFileType, parsedUrl.fileName)
      
      console.log("🗑️ Excluindo com nova estrutura:", {
        userId: parsedUrl.userId,
        tipo: parsedUrl.tipo,
        structure: 'new'
      })
    } else {
      // Estrutura antiga: usar método original
      const urlParts = url.split("/")
      const fileName = urlParts[urlParts.length - 1]
      const folder = urlParts[urlParts.length - 2]
      const filePath = `${folder}/${fileName}`
      
      deleteUrl = getMinioUploadUrl(filePath)
      
      console.log("🗑️ Excluindo com estrutura antiga:", {
        folder: folder,
        structure: 'old'
      })
    }

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
    })

    // MinIO retorna 204 para exclusão bem-sucedida ou 404 se arquivo não existe
    if (response.ok || response.status === 404) {
      console.log("✅ Arquivo excluído do MinIO:", {
        structure: structureType,
        success: true
      })
      return { success: true, message: "Arquivo excluído com sucesso" }
    } else {
      console.error("❌ Erro ao excluir arquivo:", response.status, response.statusText)
      return { success: false, message: `Erro ao excluir arquivo: ${response.statusText}` }
    }
  } catch (error) {
    console.error("💥 Erro inesperado ao excluir arquivo:", error)
    return { success: false, message: "Erro inesperado ao excluir arquivo" }
  }
}

// UPLOAD DIRETO PARA MINIO - NOVA IMPLEMENTAÇÃO
export async function uploadArquivoMinio(
  file: File,
  userId: string,
  tipo: "video" | "file" | "imagem",
): Promise<{ success: boolean; url?: string; message?: string }> {
  try {
    console.log(`🚀 UPLOAD NOVA ESTRUTURA MINIO - Iniciando upload de ${tipo}:`, {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      userId: userId,
      newStructure: true,
    })

    // Gerar nome único SEM UID (já está na estrutura da pasta)
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileName = `${timestamp}-${cleanFileName}`

    // Importar funções da nova estrutura
    const { getMinioUserUploadUrl, getMinioUserFileUrl } = await import("@/lib/minio-config")

    // Usar nova estrutura baseada em UID: rarcursos/[uid]/[tipo]/[arquivo]
    const uploadUrl = getMinioUserUploadUrl(userId, tipo as MinioFileType, fileName)

    console.log("📤 Fazendo upload com nova estrutura para MinIO:", {
      structure: `${userId}/${tipo === 'file' ? 'documentos' : tipo === 'video' ? 'videos' : 'imagens'}/${fileName}`,
      uploadUrl: uploadUrl.replace(/\/[^\/]+$/, '/***') // Ocultar nome do arquivo no log
    })

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
      body: file,
    })

    if (!response.ok) {
      console.error("❌ Upload response:", response.status, response.statusText)
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    // URL final do arquivo com nova estrutura
    const fileUrl = getMinioUserFileUrl(userId, tipo as MinioFileType, fileName)

    console.log("✅ Upload com nova estrutura bem-sucedido:", {
      structure: `${userId}/${tipo === 'file' ? 'documentos' : tipo === 'video' ? 'videos' : 'imagens'}/`,
      success: true
    })

    return {
      success: true,
      url: fileUrl,
      message: "Arquivo enviado com sucesso",
    }
  } catch (error) {
    console.error("💥 Erro no upload com nova estrutura:", error)
    return {
      success: false,
      message: "Erro ao enviar arquivo. Tente novamente.",
    }
  }
}

// Manter compatibilidade com código existente
export async function uploadImagemMinio(
  file: File,
  userId: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  return uploadArquivoMinio(file, userId, "imagem")
}

export async function uploadVideoMinio(
  file: File,
  userId: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  return uploadArquivoMinio(file, userId, "video")
}

export async function uploadPdfMinio(
  file: File,
  userId: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  return uploadArquivoMinio(file, userId, "file")
}

// EDITAR AULA
export async function editarAula(aulaId: string, aulaData: AulaData, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      // Buscar aula e verificar posse via curso
      const aulaRes = await client.query(
        `SELECT a.*, c.instrutor_id
         FROM rarcursos.aulas a
         JOIN rarcursos.cursos c ON c.id = a.curso_id
         WHERE a.id = $1`,
        [aulaId],
      )
      const aulaExistente = aulaRes.rows?.[0]
      if (!aulaExistente) return { success: false, message: "Aula não encontrada" }
      if (aulaExistente.instrutor_id !== instrutorId)
        return { success: false, message: "Sem permissão para editar esta aula" }

      // Verificar módulo pertence ao curso
      const modRes = await client.query(
        `SELECT curso_id FROM rarcursos.modulos WHERE id = $1`,
        [aulaData.modulo_id],
      )
      const modulo = modRes.rows?.[0]
      if (!modulo || modulo.curso_id !== aulaData.curso_id)
        return { success: false, message: "Módulo não encontrado ou não pertence ao curso" }

      // Excluir arquivo antigo se trocou URL
      if (aulaData.media_url && aulaData.media_url !== aulaExistente.media_url && aulaExistente.media_url) {
        try { await excluirArquivoMinio(aulaExistente.media_url) } catch (e) { console.warn('Falha ao excluir mídia antiga', e) }
      }

      // Atualizar
      const upd = await client.query(
        `UPDATE rarcursos.aulas SET
           curso_id = $1,
           modulo_id = $2,
           titulo = $3,
           descricao = $4,
           tipo = $5,
           conteudo = $6,
           media_url = $7,
           duracao = $8,
           ativo = $9,
           privada = $10,
           ao_vivo = $11,
           atualizado_em = NOW()
         WHERE id = $12
         RETURNING id, curso_id, modulo_id, titulo, descricao, tipo, conteudo, media_url, duracao, ativo, privada, ao_vivo, criado_em, atualizado_em`,
        [
          aulaData.curso_id,
          aulaData.modulo_id,
          aulaData.titulo,
          aulaData.descricao,
          aulaData.tipo,
          aulaData.conteudo,
          aulaData.media_url ?? null,
          typeof aulaData.duracao === 'number' ? aulaData.duracao : null,
          aulaData.ativo,
          aulaData.privada ?? false,
          aulaData.ao_vivo ?? false,
          aulaId,
        ],
      )
      const data = upd.rows?.[0]

      await atualizarDuracaoCurso(aulaData.curso_id)

      return { success: true, message: "Aula editada com sucesso!", data }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao editar aula (PG):", error)
    return { success: false, message: "Erro inesperado ao editar aula" }
  }
}

// EXCLUIR AULA
export async function excluirAula(aulaId: string, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      // Buscar aula e verificar posse via curso
      const aulaRes = await client.query(
        `SELECT a.id, a.media_url, a.curso_id, c.instrutor_id
         FROM rarcursos.aulas a
         JOIN rarcursos.cursos c ON c.id = a.curso_id
         WHERE a.id = $1`,
        [aulaId],
      )
      const aulaExistente = aulaRes.rows?.[0]
      if (!aulaExistente) return { success: false, message: "Aula não encontrada" }
      if (aulaExistente.instrutor_id !== instrutorId)
        return { success: false, message: "Sem permissão para excluir esta aula" }

      // Excluir arquivo do MinIO se existir
      if (aulaExistente.media_url) {
        try { await excluirArquivoMinio(aulaExistente.media_url) } catch {}
      }

      // Excluir registro
      await client.query(`DELETE FROM rarcursos.aulas WHERE id = $1`, [aulaId])

      await atualizarDuracaoCurso(aulaExistente.curso_id)
      return { success: true, message: "Aula excluída com sucesso!" }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao excluir aula (PG):", error)
    return { success: false, message: "Erro inesperado ao excluir aula" }
  }
}

// BUSCAR AULA POR ID
export async function buscarAulaPorId(aulaId: string, instrutorId: string) {
  try {
    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT a.* , c.instrutor_id
         FROM rarcursos.aulas a
         JOIN rarcursos.cursos c ON c.id = a.curso_id
         WHERE a.id = $1
         LIMIT 1`,
        [aulaId],
      )
      const aula = res.rows?.[0]
      if (!aula) return { success: false, message: "Aula não encontrada", data: null }
      if (aula.instrutor_id !== instrutorId)
        return { success: false, message: "Sem permissão para acessar esta aula", data: null }

      // Remover campo instrutor_id agregado
      delete (aula as any).instrutor_id
      return { success: true, data: aula }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Erro inesperado ao buscar aula (PG):", error)
    return { success: false, message: "Erro inesperado ao buscar aula", data: null }
  }
}

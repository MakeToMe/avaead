"use server"

import { pool } from "@/lib/db-pool"
import { createHash } from "crypto"

export interface CertificadoData {
  id: string
  numero_certificado: string
  nome_aluno: string
  titulo_curso: string
  descricao_curso: string
  carga_horaria: number
  data_inicio: string
  data_conclusao: string
  nota_final?: number
  hash_verificacao: string
  status: string
  emitido_em: string
  url_certificado?: string
  qr_code_url?: string
}

export interface CertificadoPublico {
  numero_certificado: string
  nome_aluno: string
  titulo_curso: string
  data_conclusao: string
  carga_horaria: number
  status: string
  hash_verificacao: string
}

// Função para gerar hash de verificação
function gerarHashVerificacao(
  numeroCertificado: string,
  alunoId: string,
  cursoId: string,
  dataConclusao: string,
): string {
  const dados = `${numeroCertificado}-${alunoId}-${cursoId}-${dataConclusao}-${Date.now()}`
  return createHash("sha256").update(dados).digest("hex")
}

// Função para gerar número único do certificado
function gerarNumeroCertificado(): string {
  const ano = new Date().getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CERT-${ano}-${timestamp}-${random}`
}

// Função para buscar certificado por ID (para visualização privada)
export async function buscarCertificadoPorId(certificadoId: string, userId: string) {
  const client = await pool.connect()
  
  try {
    const query = `
      SELECT 
        id, numero_certificado, nome_aluno, titulo_curso, descricao_curso,
        carga_horaria, data_inicio, data_conclusao, status, emitido_em,
        hash_verificacao, curso_id, aluno_id, social_visibility
      FROM rarcursos.certificados
      WHERE id = $1 AND aluno_id = $2
    `
    const result = await client.query(query, [certificadoId, userId])

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Certificado não encontrado ou sem permissão",
        data: null,
      }
    }

    return {
      success: true,
      data: result.rows[0],
    }
  } catch (error) {
    console.error("Erro ao buscar certificado:", error)
    return {
      success: false,
      message: "Erro interno do servidor",
      data: null,
    }
  } finally {
    client.release()
  }
}

// Função para verificar se o aluno pode receber certificado
export async function verificarElegibilidadeCertificado(cursoId: string, alunoId: string) {
  const client = await pool.connect()
  
  try {
    // Verificar se existe matrícula
    const matriculaQuery = `
      SELECT id, progresso_percentual, status, data_matricula 
      FROM rarcursos.matriculas 
      WHERE curso_id = $1 AND aluno_id = $2
    `
    const matriculaResult = await client.query(matriculaQuery, [cursoId, alunoId])

    if (matriculaResult.rows.length === 0) {
      return { elegivel: false, motivo: "Matrícula não encontrada" }
    }
    
    const matricula = matriculaResult.rows[0]

    // Verificar se o curso foi concluído (100%)
    if (matricula.progresso_percentual < 100) {
      return {
        elegivel: false,
        motivo: `Curso não concluído. Progresso atual: ${matricula.progresso_percentual}%`,
      }
    }

    // Verificar se já existe certificado
    const certificadoQuery = `
      SELECT id, numero_certificado, status 
      FROM rarcursos.certificados 
      WHERE curso_id = $1 AND aluno_id = $2
    `
    const certificadoResult = await client.query(certificadoQuery, [cursoId, alunoId])

    if (certificadoResult.rows.length > 0) {
      return {
        elegivel: false,
        motivo: "Certificado já emitido",
        certificado_existente: certificadoResult.rows[0],
      }
    }

    return {
      elegivel: true,
      matricula_data: matricula,
    }
  } catch (error) {
    console.error("Erro ao verificar elegibilidade:", error)
    return { elegivel: false, motivo: "Erro interno do servidor" }
  } finally {
    client.release()
  }
}

// Função para emitir certificado
export async function emitirCertificado(cursoId: string, alunoId: string) {
  const client = await pool.connect()
  
  try {
    // Verificar elegibilidade
    const elegibilidade = await verificarElegibilidadeCertificado(cursoId, alunoId)
    if (!elegibilidade.elegivel) {
      return {
        success: false,
        message: elegibilidade.motivo,
        certificado_existente: elegibilidade.certificado_existente,
      }
    }

    // Buscar dados do aluno
    const alunoQuery = 'SELECT nome, email FROM rarcursos.users WHERE uid = $1'
    const alunoResult = await client.query(alunoQuery, [alunoId])
    
    if (alunoResult.rows.length === 0) {
      return { success: false, message: "Dados do aluno não encontrados" }
    }
    const aluno = alunoResult.rows[0]

    // Buscar dados do curso
    const cursoQuery = 'SELECT titulo, descricao, duracao_total, instrutor_id FROM rarcursos.cursos WHERE id = $1'
    const cursoResult = await client.query(cursoQuery, [cursoId])
    
    if (cursoResult.rows.length === 0) {
      return { success: false, message: "Dados do curso não encontrados" }
    }
    const curso = cursoResult.rows[0]

    // Gerar número único do certificado
    const numeroCertificado = gerarNumeroCertificado()

    // Gerar hash de verificação
    const dataAtual = new Date().toISOString().split("T")[0]
    const hashVerificacao = gerarHashVerificacao(numeroCertificado, alunoId, cursoId, dataAtual)

    // Inserir certificado no banco
    const insertQuery = `
      INSERT INTO rarcursos.certificados (
        numero_certificado, aluno_id, curso_id, instrutor_id, nome_aluno,
        titulo_curso, descricao_curso, carga_horaria, data_inicio, data_conclusao,
        hash_verificacao, status, emitido_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id, numero_certificado, hash_verificacao
    `
    
    const insertResult = await client.query(insertQuery, [
      numeroCertificado,
      alunoId,
      cursoId,
      curso.instrutor_id,
      aluno.nome,
      curso.titulo,
      curso.descricao || "",
      curso.duracao_total || 0,
      elegibilidade.matricula_data?.data_matricula || dataAtual,
      dataAtual,
      hashVerificacao,
      "ativo"
    ])

    if (insertResult.rows.length === 0) {
      console.error("Erro ao inserir certificado")
      return { success: false, message: "Erro ao salvar certificado" }
    }
    
    const certificado = insertResult.rows[0]

    // TODO: Gerar QR Code e PDF do certificado
    // const qrCodeUrl = await generateQRCode(hashVerificacao)
    // const pdfUrl = await generateCertificatePDF(certificado)

    return {
      success: true,
      message: "Certificado emitido com sucesso!",
      certificado: {
        id: certificado.id,
        numero_certificado: certificado.numero_certificado,
        hash_verificacao: certificado.hash_verificacao,
      },
    }
  } catch (error) {
    console.error("Erro ao emitir certificado:", error)
    return { success: false, message: "Erro interno do servidor" }
  } finally {
    client.release()
  }
}

// Função para buscar certificados do aluno
export async function buscarCertificadosAluno(alunoId: string) {
  const client = await pool.connect()
  
  try {
    const query = `
      SELECT 
        id, numero_certificado, titulo_curso, descricao_curso, carga_horaria,
        data_conclusao, status, emitido_em, url_certificado, hash_verificacao
      FROM rarcursos.certificados
      WHERE aluno_id = $1 AND status = $2
      ORDER BY emitido_em DESC
    `
    const result = await client.query(query, [alunoId, 'ativo'])

    return { success: true, data: result.rows }
  } catch (error) {
    console.error("Erro ao buscar certificados:", error)
    return { success: false, message: "Erro interno do servidor", data: [] }
  } finally {
    client.release()
  }
}

// Função para verificar certificado publicamente
export async function verificarCertificadoPublico(hash: string): Promise<{
  success: boolean
  message: string
  certificado?: CertificadoPublico
}> {
  const client = await pool.connect()
  
  try {
    const query = `
      SELECT 
        numero_certificado, nome_aluno, titulo_curso, data_conclusao,
        carga_horaria, status, hash_verificacao
      FROM rarcursos.certificados
      WHERE hash_verificacao = $1
    `
    const result = await client.query(query, [hash])

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Certificado não encontrado ou hash inválido",
      }
    }
    
    const certificado = result.rows[0]

    if (certificado.status !== "ativo") {
      return {
        success: false,
        message: `Certificado ${certificado.status}`,
      }
    }

    return {
      success: true,
      message: "Certificado válido",
      certificado: certificado as CertificadoPublico,
    }
  } catch (error) {
    console.error("Erro ao verificar certificado:", error)
    return {
      success: false,
      message: "Erro interno do servidor",
    }
  } finally {
    client.release()
  }
}

// Função para buscar certificados emitidos pelo instrutor
export async function buscarCertificadosInstrutor(instrutorId: string) {
  const client = await pool.connect()
  
  try {
    const query = `
      SELECT 
        id, numero_certificado, nome_aluno, titulo_curso,
        data_conclusao, status, emitido_em
      FROM rarcursos.certificados
      WHERE instrutor_id = $1
      ORDER BY emitido_em DESC
    `
    const result = await client.query(query, [instrutorId])

    return { success: true, data: result.rows }
  } catch (error) {
    console.error("Erro ao buscar certificados do instrutor:", error)
    return { success: false, message: "Erro interno do servidor", data: [] }
  } finally {
    client.release()
  }
}

// Função para revogar certificado (apenas admin/instrutor)
export async function revogarCertificado(certificadoId: string, motivo: string, userId: string) {
  const client = await pool.connect()
  
  try {
    // Verificar permissões do usuário
    const userQuery = 'SELECT perfis FROM rarcursos.users WHERE uid = $1'
    const userResult = await client.query(userQuery, [userId])

    if (userResult.rows.length === 0) {
      return { success: false, message: "Usuário não encontrado" }
    }
    
    const user = userResult.rows[0]
    if (user.perfis !== "admin" && user.perfis !== "instrutor") {
      return { success: false, message: "Sem permissão para revogar certificados" }
    }

    // Atualizar status do certificado
    const updateQuery = `
      UPDATE rarcursos.certificados 
      SET status = $1, atualizado_em = NOW()
      WHERE id = $2
    `
    await client.query(updateQuery, ['revogado', certificadoId])

    // TODO: Registrar log de revogação
    // await registrarLogRevogacao(certificadoId, userId, motivo)

    return { success: true, message: "Certificado revogado com sucesso" }
  } catch (error) {
    console.error("Erro ao revogar certificado:", error)
    return { success: false, message: "Erro interno do servidor" }
  } finally {
    client.release()
  }
}

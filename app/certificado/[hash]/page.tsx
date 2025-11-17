import { pool } from "@/lib/db-pool"
import { notFound } from "next/navigation"

/**
 * Carrega o certificado público pelo hash.
 */
async function getCertificadoPublico(hash: string) {
  console.log('🔍 Buscando certificado com hash:', hash)
  const client = await pool.connect()
  try {
    const query = `
      SELECT id, numero_certificado, curso_id, aluno_id, nome_aluno,
             titulo_curso, descricao_curso, carga_horaria, status,
             emitido_em, social_visibility
      FROM rarcursos.certificados
      WHERE hash_verificacao = $1
    `
    const result = await client.query(query, [hash])
    console.log('✅ Query executada, rows:', result.rows.length)
    
    if (result.rows.length === 0) return null
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro na query:', error)
    throw error
  } finally {
    client.release()
  }
}

async function CertificadoPublicoContent({ hash }: { hash: string }) {
  console.log('📄 Renderizando CertificadoPublicoContent')
  
  try {
    const certificado = await getCertificadoPublico(hash)
    
    if (!certificado) {
      console.log('❌ Certificado não encontrado')
      notFound()
    }
    
    console.log('✅ Certificado encontrado:', certificado.numero_certificado)
    
    if (certificado.status !== "ativo") {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
            <div className="text-orange-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Certificado {certificado.status}</h1>
            <p className="text-gray-600">Este certificado não está mais ativo.</p>
          </div>
        </div>
      )
    }
    
    const issueDateFormatted = certificado.emitido_em
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(certificado.emitido_em))
      : "-"
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎓</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Certificado de Conclusão</h1>
            <p className="text-gray-600">#{certificado.numero_certificado}</p>
          </div>
          
          <div className="border-t-4 border-purple-600 pt-8 space-y-6">
            <div className="text-center">
              <p className="text-gray-600 text-lg mb-2">Certificamos que</p>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{certificado.nome_aluno}</h2>
              <p className="text-gray-600 text-lg mb-2">concluiu com êxito o curso</p>
              <h3 className="text-2xl font-semibold text-purple-700 mb-6">{certificado.titulo_curso}</h3>
            </div>
            
            {certificado.descricao_curso && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 text-center">{certificado.descricao_curso}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Carga Horária</p>
                <p className="text-xl font-bold text-purple-700">{certificado.carga_horaria}h</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Data de Emissão</p>
                <p className="text-xl font-bold text-purple-700">{issueDateFormatted}</p>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <div className="border-t-2 border-gray-400 w-48 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Saber365</p>
                  <p className="text-xs text-gray-500">Plataforma de Ensino</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 font-mono break-all">
                Hash de Verificação: {hash}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('❌ Erro crítico:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar certificado</h1>
          <p className="text-gray-600">Ocorreu um erro ao carregar o certificado.</p>
          <p className="text-xs text-gray-500 mt-4">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
      </div>
    )
  }
}

export default async function CertificadoPublicoPage({ params }: { params: Promise<{ hash: string }> }) {
  console.log('🚀 Página pública de certificado iniciada')
  const { hash } = await params
  console.log('📝 Hash recebido:', hash)
  
  return <CertificadoPublicoContent hash={hash} />
}

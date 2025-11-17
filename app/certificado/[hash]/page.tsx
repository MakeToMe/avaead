import { Suspense } from "react"
import dynamic from "next/dynamic"
import { pool } from "@/lib/db-pool"
import { notFound } from "next/navigation"

// Dynamic import do CertificateCard
const CertificateCard = dynamic(() => import("@/components/certificate/certificate-card"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-white text-xl">Carregando certificado...</div>
    </div>
  )
})

/**
 * Carrega o certificado público pelo hash.
 */
async function getCertificadoPublico(hash: string) {
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
    
    if (result.rows.length === 0) return null
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao buscar certificado:', error)
    throw error
  } finally {
    client.release()
  }
}

async function CertificadoPublicoContent({ hash }: { hash: string }) {
  try {
    const certificado = await getCertificadoPublico(hash)
    
    if (!certificado) {
      notFound()
    }
    
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

    // Buscar dados adicionais
    const client = await pool.connect()
    let modulos: any[] = []
    let aluno: any = null
    
    try {
      // Buscar módulos
      const modulosQuery = `
        SELECT id, titulo, ordem
        FROM rarcursos.modulos
        WHERE curso_id = $1 AND ativo = true
        ORDER BY ordem
      `
      const modulosResult = await client.query(modulosQuery, [certificado.curso_id])
      modulos = modulosResult.rows

      // Buscar aulas
      if (modulos.length > 0) {
        const moduloIds = modulos.map(m => m.id)
        const aulasQuery = `
          SELECT id, modulo_id, titulo, duracao
          FROM rarcursos.aulas
          WHERE modulo_id = ANY($1) AND ativo = true
        `
        const aulasResult = await client.query(aulasQuery, [moduloIds])
        
        const aulasPorModulo: Record<string, any[]> = {}
        aulasResult.rows.forEach(aula => {
          if (!aulasPorModulo[aula.modulo_id]) {
            aulasPorModulo[aula.modulo_id] = []
          }
          aulasPorModulo[aula.modulo_id].push(aula)
        })
        
        modulos = modulos.map(m => ({
          ...m,
          aulas: aulasPorModulo[m.id] || []
        }))
      }

      // Buscar dados do aluno
      const alunoQuery = `
        SELECT email, url_foto, social_links
        FROM rarcursos.users
        WHERE uid = $1
      `
      const alunoResult = await client.query(alunoQuery, [certificado.aluno_id])
      aluno = alunoResult.rows[0] || null
    } catch (dbError) {
      console.error('❌ Erro ao buscar dados adicionais:', dbError)
    } finally {
      client.release()
    }

    let avatarUrl: string | undefined = aluno?.url_foto ?? undefined
    let socialLinks: Record<string, string> = aluno?.social_links ?? {}
    if (avatarUrl && !avatarUrl.startsWith("http")) {
      const relativePath = avatarUrl.replace(/^ead\//, "")
      avatarUrl = `/api/avatar/${encodeURIComponent(relativePath)}`
    }

    const modulesInfo = (modulos ?? []).map((m) => ({
      id: m.id,
      titulo: m.titulo,
      aulas: m.aulas ?? [],
    }))

    const modulesCount = modulesInfo.length
    const aulasCount = modulesInfo.reduce((acc, m) => acc + m.aulas.length, 0)
    const totalMinutes = modulesInfo.reduce(
      (acc, m) => acc + m.aulas.reduce((a: number, aula: any) => a + (aula.duracao ?? 0), 0),
      0
    )
    const durationTotal = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`

    const issueDateFormatted = certificado.emitido_em
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(certificado.emitido_em))
      : "-"

    const validity = "Não expira"
    const hashAuth = hash
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saber365.app"
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/certificado/${hash}`)}`

    return (
      <CertificateCard
        name={certificado.nome_aluno}
        course={certificado.titulo_curso}
        provider={"Saber365"}
        date={issueDateFormatted}
        description={certificado.descricao_curso ?? ""}
        logoUrl={undefined}
        issueDate={issueDateFormatted}
        validity={validity}
        hashAuth={hashAuth}
        qrUrl={qrUrl}
        modulesInfo={modulesInfo}
        modulesCount={modulesCount}
        aulasCount={aulasCount}
        duration={durationTotal}
        links={socialLinks}
        visibility={certificado.social_visibility ?? {}}
        avatarUrl={avatarUrl}
        email={aluno?.email ?? undefined}
        editable={false}
        certId={certificado.id ?? undefined}
      />
    )
  } catch (error) {
    console.error('❌ Erro crítico na página pública:', error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar certificado</h1>
          <p className="text-gray-600">Ocorreu um erro ao carregar o certificado.</p>
        </div>
      </div>
    )
  }
}

export default async function CertificadoPublicoPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Carregando…</div>
      </div>
    }>
      <CertificadoPublicoContent hash={hash} />
    </Suspense>
  )
}

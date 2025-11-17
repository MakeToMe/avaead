import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { pool } from "@/lib/db-pool"
import { buscarCertificadoPorId } from "../../actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, ExternalLink, Award, ArrowLeft } from "lucide-react"
import CertificateCard from "@/components/certificate/certificate-card"
import CertificadoActions from "./components/certificado-actions"
import { CertificateDetailsCard } from "@/components/certificate/public-cards"
import Link from "next/link"

interface PageProps {
  params: {
    id: string
  }
}

async function CertificadoContent({ id }: { id: string }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/")
  }

  const result = await buscarCertificadoPorId(id, user.uid)
  if (!result.success || !result.data) {
    notFound()
  }

  const certificado = result.data as any
  const baseUrl = process.env.URL_BASE ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://saber365.app"
  const linkPublico = `${baseUrl}/certificado/${certificado.hash_verificacao}`

  // Avatar do aluno
  let avatarUrl: string | undefined = undefined
  let socialLinks: Record<string,string> = {}
  const client = await pool.connect()
  try {
    const alunoQuery = 'SELECT url_foto, social_links FROM rarcursos.users WHERE uid = $1'
    const alunoResult = await client.query(alunoQuery, [user.uid])
    
    if (alunoResult.rows.length > 0) {
      const aluno = alunoResult.rows[0]
      if (aluno.url_foto) {
        avatarUrl = aluno.url_foto.startsWith("http") ? aluno.url_foto : `/api/avatar/${encodeURIComponent(aluno.url_foto.replace(/^ead\//, ""))}`
      }
      socialLinks = aluno.social_links ?? {}
    }
  } catch (e) {
    // ignore
  } finally {
    client.release()
  }

  // Extrair ano e mês de emissão para LinkedIn
  const emitidoDate = certificado.emitido_em ? new Date(certificado.emitido_em) : undefined
  const issueYear = emitidoDate ? emitidoDate.getUTCFullYear() : ""
  const issueMonth = emitidoDate ? emitidoDate.getUTCMonth() + 1 : "" // getUTCMonth retorna 0-11

  const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(certificado.titulo_curso)}&organizationName=Saber365&issueYear=${issueYear}&issueMonth=${issueMonth}&expirationYear=&expirationMonth=&certUrl=${encodeURIComponent(linkPublico)}&certId=${certificado.numero_certificado}&organizationId=107917361`

  // ---- Buscar módulos e aulas do curso para verso ----
  let modulesInfo: { id: string; titulo: string; aulas: { id: string; titulo: string; duracao?: number }[] }[] = []
  let modulesCount = 0
  let aulasCount = 0
  let totalMinutes = 0
  const client2 = await pool.connect()
  try {
    const modulosQuery = `
      SELECT id, titulo, ordem 
      FROM rarcursos.modulos 
      WHERE curso_id = $1 AND ativo = true 
      ORDER BY ordem
    `
    const modulosResult = await client2.query(modulosQuery, [certificado.curso_id])
    const modulos = modulosResult.rows

    if (modulos.length > 0) {
      modulesCount = modulos.length
      const moduloIds = modulos.map((m: any) => m.id)
      
      const aulasQuery = `
        SELECT id, modulo_id, titulo, duracao 
        FROM rarcursos.aulas 
        WHERE modulo_id = ANY($1) AND ativo = true
      `
      const aulasResult = await client2.query(aulasQuery, [moduloIds])
      const aulas = aulasResult.rows

      const aulaMap: Record<string, any[]> = {}
      if (aulas.length > 0) {
        aulasCount = aulas.length
        aulas.forEach((a: any) => {
          totalMinutes += a.duracao ?? 0
          if (!aulaMap[a.modulo_id]) aulaMap[a.modulo_id] = []
          aulaMap[a.modulo_id].push({ id: a.id, titulo: a.titulo, duracao: a.duracao })
        })
      }

      modulesInfo = modulos.map((m: any) => ({ id: m.id, titulo: m.titulo, aulas: aulaMap[m.id] ?? [] }))
    }
  } catch (e) {
    // ignore erros de fetch
  } finally {
    client2.release()
  }
  const durationString = `${totalMinutes} minutos`

  const issueDateFormatted = certificado.emitido_em
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificado.emitido_em))
    : "-"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Botão Voltar */}
        <div className="mb-6">
          <Button asChild variant="outline" className="bg-slate-800/60 hover:bg-slate-700/60 text-white border-slate-600">
            <Link href="/certificados">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Certificados
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Certificado Principal */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-xl flex items-center justify-center">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Certificado de Conclusão</h1>
                    <p className="text-slate-400">#{certificado.numero_certificado}</p>
                    <p className="text-xs text-slate-500 font-mono break-all mt-1">{certificado.hash_verificacao}</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`${certificado.status === "ativo" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}
                >
                  {certificado.status}
                </Badge>
              </div>

              {/* Certificado com frente/verso */}
              <CertificateCard
                name={certificado.nome_aluno}
                course={certificado.titulo_curso}
                provider={"Saber365"}
                date={issueDateFormatted}
                description={certificado.descricao_curso ?? ""}
                issueDate={issueDateFormatted}
                validity={"Não expira"}
                hashAuth={certificado.hash_verificacao}
                qrUrl={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/certificado/${certificado.hash_verificacao}`)}`}
                modulesInfo={modulesInfo}
                modulesCount={modulesCount}
                aulasCount={aulasCount}
                duration={durationString}
                avatarUrl={avatarUrl}
                links={socialLinks}
                visibility={certificado.social_visibility ?? {}}
                editable
                certId={certificado.id}
              />
              <div className="mt-6 flex justify-end">
                <Button asChild variant="outline" className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600">
                  <a href={linkPublico} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Público
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code primeiro */}
            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">QR Code</h3>
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block mb-3">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(linkPublico)}`} alt="QR Code do Certificado" className="w-32 h-32" />
                </div>
                <p className="text-slate-400 text-sm">Escaneie para verificar publicamente</p>
              </div>
            </div>

            <CertificadoActions linkPublico={linkPublico} linkedInUrl={linkedInUrl} />
            <CertificateDetailsCard certificado={certificado} transparentBg />
          </div>
        </div>
      </div>
    </div>
  )
}

/* --- Página principal --- */
export default async function VisualizarCertificadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CertificadoContent id={id} />
}

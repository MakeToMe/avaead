"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Search, UserPlus, ChevronLeft, ChevronRight, Users, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getAlunos } from "../admin-actions"
import { ModalAdicionarCurso } from "./modal-adicionar-curso"
import type { User } from "@/lib/auth-client"
import { getMinioClientFileUrl } from "@/lib/minio-config"

interface Aluno {
  uid: string
  nome: string
  email: string
  email_verificado?: boolean
  whatsapp?: string
  whatsapp_verificado?: boolean
  url_foto?: string
  photoUrl?: string
  cursos: Array<{ id: string; titulo: string; progresso?: number; data_matricula?: string }>
  primeira_matricula: string
}

interface GridAlunosProps {
  user: User
}

export function GridAlunos({ user }: GridAlunosProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null)

  const itemsPerPage = 15 // Aumentamos para 15 já que cada linha ocupa menos espaço

  useEffect(() => {
    loadAlunos()
  }, [currentPage, search])

  const loadAlunos = async () => {
    try {
      setLoading(true)
      const result = await getAlunos(user.uid, user.perfis, currentPage, itemsPerPage, search)
      const alunosComFoto: Aluno[] = (result.alunos || []).map((a: any) => {
        let photoUrl: string | undefined
        const raw = (a.url_foto || "").trim()
        if (raw) {
          if (/^https?:\/\//i.test(raw)) {
            photoUrl = raw
          } else {
            const rel = raw.startsWith('/') ? raw.slice(1) : raw
            const safe = rel.replace(/\\/g, '/').replace(/\.{2}\//g, '')
            photoUrl = getMinioClientFileUrl(safe)
          }
        }
        return { ...a, photoUrl }
      })
      setAlunos(alunosComFoto)
      setTotalPages(Math.ceil(result.total / itemsPerPage))
    } catch (error) {
      console.error("Erro ao carregar alunos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleAdicionarCurso = (aluno: Aluno) => {
    setSelectedAluno(aluno)
    setModalOpen(true)
  }

  const handleCursoAdicionado = () => {
    setModalOpen(false)
    setSelectedAluno(null)
    loadAlunos()
  }

  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(data)
  }

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const VerificationIcon = ({ verified }: { verified?: boolean }) => {
    if (verified === true) {
      return <Check className="h-4 w-4 text-green-400" />
    } else if (verified === false) {
      return <X className="h-4 w-4 text-red-400" />
    }
    return <div className="h-4 w-4 bg-slate-600 rounded-full" />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">
          {user.perfis === "admin" ? "Todos os Alunos" : "Seus Alunos"}
        </h2>

        {/* Campo de busca */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid/Tabela de Alunos */}
      <div className="bg-gradient-to-br from-slate-800/40 to-gray-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-pulse flex space-x-4 w-full max-w-md">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : alunos.length > 0 ? (
          <>
            {/* Header da Tabela */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-800/50 border-b border-slate-700/50 text-sm font-medium text-slate-300">
              <div className="col-span-1">Perfil</div>
              <div className="col-span-2">Nome</div>
              <div className="col-span-2">E-mail</div>
              <div className="col-span-2">WhatsApp</div>
              <div className="col-span-4">Cursos</div>
              <div className="col-span-1">Ações</div>
            </div>

            {/* Linhas dos Alunos */}
            <div className="divide-y divide-slate-700/30">
              {alunos.map((aluno, index) => (
                <motion.div
                  key={aluno.uid}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-700/20 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  {/* Perfil - Avatar */}
                  <div className="col-span-1 flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {aluno.photoUrl ? (
                        <img
                          src={aluno.photoUrl}
                          alt={aluno.nome}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        getInitials(aluno.nome)
                      )}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <h3 className="text-white font-medium text-sm leading-tight">{aluno.nome}</h3>
                    <p className="text-slate-500 text-xs mt-1">Desde: {formatarData(aluno.primeira_matricula)}</p>
                  </div>

                  {/* E-mail */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm truncate">{aluno.email}</p>
                    </div>
                    <VerificationIcon verified={aluno.email_verificado} />
                  </div>

                  {/* WhatsApp */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm truncate">{aluno.whatsapp || "Não informado"}</p>
                    </div>
                    <VerificationIcon verified={aluno.whatsapp_verificado} />
                  </div>

                  {/* Cursos - Badges */}
                  <div className="col-span-4 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-1">
                      {aluno.cursos.length > 0 ? (
                        aluno.cursos.map((curso) => (
                          <Badge
                            key={curso.id}
                            variant="secondary"
                            className="bg-slate-700/50 text-slate-200 border-slate-600/50 text-xs px-2 py-1"
                          >
                            {curso.titulo}
                            {curso.progresso !== undefined && (
                              <span className="ml-1 text-slate-400">({curso.progresso}%)</span>
                            )}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs">Nenhum curso</span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="col-span-1 flex items-center justify-center">
                    <Button
                      onClick={() => handleAdicionarCurso(aluno)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-indigo-600/20 hover:text-indigo-400"
                      title="Adicionar curso"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-sm">
                    Página {currentPage} de {totalPages} • {alunos.length} alunos
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    <Button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-700/50 to-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-300 text-lg">
              {search ? "Nenhum aluno encontrado" : "Nenhum aluno matriculado ainda"}
            </p>
            <p className="text-slate-400 text-sm mt-2">
              {search
                ? "Tente buscar com outros termos"
                : user.perfis === "admin"
                  ? "Os alunos aparecerão aqui quando se matricularem em cursos"
                  : "Seus alunos aparecerão aqui quando se matricularem em seus cursos"}
            </p>
          </div>
        )}
      </div>

      {/* Modal para adicionar curso */}
      {modalOpen && selectedAluno && (
        <ModalAdicionarCurso
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          aluno={selectedAluno}
          user={user}
          onSuccess={handleCursoAdicionado}
        />
      )}
    </div>
  )
}

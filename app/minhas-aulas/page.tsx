"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthV2 as useAuth } from "@/contexts/auth-context-v2"
import type { User } from "@/lib/auth-service-v2"
import { motion } from "framer-motion"
import { PlayCircle, PlusCircle, Edit, Calendar, Clock, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import BotaoAdicionarAula from "./components/botao-adicionar-aula"
import Paginacao from "../meus-cursos/components/paginacao"
import { buscarAulasDoInstrutor, buscarCursosComAulas, editarNomeModulo } from "./actions"
import { useToast } from "@/hooks/use-toast"
import ModalConfirmarExclusao from "./components/modal-confirmar-exclusao"
import FiltroCursos from "./components/filtro-cursos"

interface Curso {
  id: string
  titulo: string
  totalAulas?: number
}

interface Aula {
  id: string
  titulo: string
  descricao: string
  tipo: string
  ativo: boolean
  duracao?: number
  criado_em: string
  modulo_id: string
  curso_id: string
  cursos: { id: string; titulo: string }
  modulos: { id: string; titulo: string }
}

interface EditandoModulo {
  aulaId: string | null
  moduloId: string | null
  novoNomeModulo: string
}

const ITENS_POR_PAGINA = 6

export default function MinhasAulasPage() {
  const { user: authUser, isLoading: authLoading } = useAuth()
  
  // Helper para verificar role
  const hasRole = (role: string) => authUser?.perfis.includes(role) || false
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [aulas, setAulas] = useState<Aula[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loadingAulas, setLoadingAulas] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalAulas, setTotalAulas] = useState(0)
  const [cursoSelecionado, setCursoSelecionado] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const [aulaParaExcluir, setAulaParaExcluir] = useState<Aula | null>(null)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)

  // Estado para controlar a edição de nome do módulo inline
  const [editandoModulo, setEditandoModulo] = useState<EditandoModulo>({
    aulaId: null,
    moduloId: null,
    novoNomeModulo: "",
  })
  const [salvandoModulo, setSalvandoModulo] = useState(false)

  useEffect(() => {
    // Aguardar carregamento da autenticação
    if (authLoading) return

    if (!authUser) {
      console.log('🚪 MinhasAulasPage: Usuário não autenticado, redirecionando')
      router.push("/")
      return
    }

    // Verificar se o usuário tem permissão para criar aulas
    if (!hasRole("instrutor") && !hasRole("admin")) {
      console.log('⚠️ MinhasAulasPage: Usuário sem permissão, redirecionando para dashboard')
      router.push("/dashboard")
      return
    }

    setUser(authUser)
    setLoading(false)

    // Carregar cursos do instrutor para o filtro
    carregarCursos(authUser.uid)

    console.log('✅ MinhasAulasPage: Usuário autorizado, carregando dados')
  }, [authUser, authLoading])

  // useEffect separado para carregar aulas quando filtros mudarem
  useEffect(() => {
    if (user?.uid) {
      console.log('🔄 Carregando aulas para filtros:', { paginaAtual, cursoSelecionado });
      carregarAulas(user.uid, paginaAtual, cursoSelecionado)
    }
  }, [user?.uid, paginaAtual, cursoSelecionado])

  const carregarCursos = async (instrutorId: string) => {
    try {
      const result = await buscarCursosComAulas(instrutorId)
      if (result.success) {
        setCursos(result.data)
      }
    } catch (error) {
      console.error("Erro ao carregar cursos:", error)
    }
  }

  const carregarAulas = async (instrutorId: string, pagina: number, cursoId: string | null = null) => {
    setLoadingAulas(true)
    try {
      const result = await buscarAulasDoInstrutor(instrutorId, pagina, ITENS_POR_PAGINA, cursoId || undefined)
      if (result.success) {
        setAulas(result.data)
        setTotalAulas(result.totalAulas)
      }
    } catch (error) {
      console.error("Erro ao carregar aulas:", error)
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar aulas",
      })
    } finally {
      setLoadingAulas(false)
    }
  }

  const handleCursoSelecionado = (cursoId: string | null) => {
    setCursoSelecionado(cursoId)
    setPaginaAtual(1) // Voltar para a primeira página ao mudar o filtro
  }

  const handleAulaAdicionada = () => {
    if (user?.uid) {
      // Voltar para a primeira página após adicionar uma aula
      setPaginaAtual(1)
      carregarAulas(user.uid, 1, cursoSelecionado)
    }
  }

  const handleEditarAula = (aula: Aula) => {
    router.push(`/minhas-aulas/editar/${aula.id}`)
  }

  const handleExcluirAula = (aula: Aula) => {
    setAulaParaExcluir(aula)
    setModalExcluirAberto(true)
  }

  const handleAulaExcluida = () => {
    if (user?.uid) {
      // Se estamos na última página e só tinha 1 item, voltar para página anterior
      if (aulas.length === 1 && paginaAtual > 1) {
        setPaginaAtual(paginaAtual - 1)
        carregarAulas(user.uid, paginaAtual - 1, cursoSelecionado)
      } else {
        carregarAulas(user.uid, paginaAtual, cursoSelecionado)
      }
    }
  }

  // Funções para edição de nome do módulo inline
  const handleEditarNomeModulo = (aula: Aula) => {
    setEditandoModulo({
      aulaId: aula.id,
      moduloId: aula.modulo_id,
      novoNomeModulo: aula.modulos.titulo,
    })
  }

  const handleCancelarEdicaoModulo = () => {
    setEditandoModulo({
      aulaId: null,
      moduloId: null,
      novoNomeModulo: "",
    })
  }

  const handleSalvarNomeModulo = async (aula: Aula) => {
    if (
      !user?.uid ||
      !editandoModulo.novoNomeModulo.trim() ||
      editandoModulo.novoNomeModulo.trim() === aula.modulos.titulo
    ) {
      handleCancelarEdicaoModulo()
      return
    }

    setSalvandoModulo(true)

    try {
      const result = await editarNomeModulo(aula.modulo_id, editandoModulo.novoNomeModulo.trim(), user.uid)

      if (result.success) {
        toast({
          variant: "success",
          title: "Módulo atualizado",
          description: "O nome do módulo foi atualizado com sucesso.",
        })

        // Atualizar a lista de aulas localmente
        setAulas(
          aulas.map((a) => {
            if (a.modulo_id === aula.modulo_id) {
              return {
                ...a,
                modulos: {
                  ...a.modulos,
                  titulo: editandoModulo.novoNomeModulo.trim(),
                },
              }
            }
            return a
          }),
        )
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message || "Erro ao atualizar nome do módulo",
        })
      }
    } catch (error) {
      console.error("Erro ao salvar nome do módulo:", error)
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar nome do módulo",
      })
    } finally {
      setSalvandoModulo(false)
      handleCancelarEdicaoModulo()
    }
  }

  const handleChangePagina = (novaPagina: number) => {
    setPaginaAtual(novaPagina)
  }

  const formatarDuracao = (minutos?: number) => {
    if (!minutos) return "Não definida"
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas > 0) {
      return `${horas}h ${mins > 0 ? `${mins}min` : ""}`
    }
    return `${mins}min`
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR")
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "video":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "texto":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "quiz":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "projeto":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "video":
        return "🎥"
      case "texto":
        return "📄"
      case "quiz":
        return "❓"
      case "projeto":
        return "🚀"
      default:
        return "📚"
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(totalAulas / ITENS_POR_PAGINA))

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não há usuário ou não tem permissão, não renderizar nada (redirecionamento em andamento)
  if (!authUser || (!hasRole("instrutor") && !hasRole("admin"))) {
    return null
  }

  return (
    <motion.div className="p-4 md:p-8" initial="hidden" animate="visible" variants={pageVariants}>
      <div className="max-w-7xl mx-auto">
        {/* Header da página */}
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-slate-300 to-blue-400 bg-clip-text text-transparent">
                  Minhas Aulas
                </h1>
                <p className="text-slate-400 text-lg mt-1">Gerencie todas as suas aulas em um só lugar</p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <BotaoAdicionarAula />
            </div>
          </div>
        </motion.div>

        {/* Filtro de Cursos */}
        {cursos.length > 0 && (
          <FiltroCursos
            cursos={cursos}
            cursoSelecionado={cursoSelecionado}
            onCursoSelecionado={handleCursoSelecionado}
          />
        )}

        {/* Conteúdo */}
        {loadingAulas ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
              <p className="text-slate-300">Carregando aulas...</p>
            </div>
          </div>
        ) : aulas.length > 0 ? (
          /* Grid de Aulas */
          <motion.div variants={itemVariants}>
            <div className="mb-6">
              <p className="text-slate-400">
                {totalAulas} {totalAulas === 1 ? "aula encontrada" : "aulas encontradas"}
                {cursoSelecionado &&
                  cursos.find((c) => c.id === cursoSelecionado) &&
                  ` em "${cursos.find((c) => c.id === cursoSelecionado)?.titulo}"`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aulas.map((aula) => (
                <motion.div
                  key={aula.id}
                  className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Header do Card */}
                  <div className="p-6 border-b border-slate-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">{getTipoIcon(aula.tipo)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* NOVA HIERARQUIA: Curso primeiro, depois aula */}
                          <p className="text-slate-400 text-sm font-medium truncate">{aula.cursos.titulo}</p>
                          <h3 className="text-lg font-semibold text-white line-clamp-1">{aula.titulo}</h3>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          aula.ativo
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {aula.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    {/* NOVA ESTRUTURA: Tipo e Módulo em linhas separadas */}
                    <div className="mb-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getTipoColor(aula.tipo)}`}
                      >
                        {aula.tipo.charAt(0).toUpperCase() + aula.tipo.slice(1)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      {editandoModulo.aulaId === aula.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editandoModulo.novoNomeModulo}
                            onChange={(e) =>
                              setEditandoModulo({
                                ...editandoModulo,
                                novoNomeModulo: e.target.value,
                              })
                            }
                            className="bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={salvandoModulo}
                            placeholder="Nome do módulo"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSalvarNomeModulo(aula)}
                              disabled={salvandoModulo || !editandoModulo.novoNomeModulo.trim()}
                              className="p-1 bg-green-600/30 hover:bg-green-600/50 rounded text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={handleCancelarEdicaoModulo}
                              disabled={salvandoModulo}
                              className="p-1 bg-red-600/30 hover:bg-red-600/50 rounded text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-slate-400 text-xs truncate">{aula.modulos.titulo}</span>
                          </div>
                          <button
                            onClick={() => handleEditarNomeModulo(aula)}
                            className="p-1 bg-slate-700/50 hover:bg-slate-700/70 rounded text-slate-400 hover:text-white transition-colors"
                            title="Editar nome do módulo"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {aula.descricao && <p className="text-slate-400 text-sm line-clamp-2 mb-3">{aula.descricao}</p>}
                  </div>

                  {/* Footer do Card */}
                  <div className="p-6">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatarDuracao(aula.duracao)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatarData(aula.criado_em)}</span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditarAula(aula)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExcluirAula(aula)}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <Paginacao paginaAtual={paginaAtual} totalPaginas={totalPaginas} onChangePagina={handleChangePagina} />
            )}
          </motion.div>
        ) : (
          /* Estado Vazio */
          <motion.div
            className="bg-gradient-to-br from-slate-800/40 to-gray-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl"
            variants={itemVariants}
          >
            <div className="p-8 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-700/50 to-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <PlayCircle className="w-12 h-12 text-indigo-400" />
              </div>

              <h2 className="text-2xl font-semibold text-white mb-4">
                {cursoSelecionado ? `Nenhuma aula encontrada para este curso` : `Nenhuma aula criada ainda`}
              </h2>

              <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
                {cursoSelecionado
                  ? `Você ainda não tem aulas cadastradas para este curso. Adicione aulas para começar.`
                  : `Comece criando módulos para seus cursos e depois adicione aulas envolventes com vídeos, textos e exercícios.`}
              </p>

              <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg p-6 border border-slate-600/30">
                <p className="text-slate-400 text-sm">
                  <strong className="text-indigo-400">Olá, {user.nome}!</strong>
                  <br />
                  {cursoSelecionado
                    ? `Clique no botão "Nova Aula" para adicionar conteúdo a este curso.`
                    : `Para criar aulas, você precisa primeiro ter módulos em seus cursos. Use o botão acima para começar.`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cards de funcionalidades (só mostrar se não houver aulas e não tiver filtro) */}
        {aulas.length === 0 && !cursoSelecionado && (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8" variants={itemVariants}>
            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <PlusCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Criar Módulos</h3>
              <p className="text-slate-400 text-sm">
                Organize seu conteúdo em módulos temáticos para facilitar o aprendizado dos alunos.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <PlayCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Adicionar Aulas</h3>
              <p className="text-slate-400 text-sm">
                Crie aulas em vídeo, texto, quizzes e projetos para engajar seus alunos.
              </p>
            </div>
          </motion.div>
        )}

        {/* Modais */}
        <ModalConfirmarExclusao
          aula={aulaParaExcluir}
          open={modalExcluirAberto}
          onOpenChange={setModalExcluirAberto}
          onAulaExcluida={handleAulaExcluida}
        />
      </div>
    </motion.div>
  )
}

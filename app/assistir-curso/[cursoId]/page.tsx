"use client"

import { useState, useEffect } from "react"
import "./scrollbar.css"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Clock,
  BookOpen,
  FileText,
  Video,
  Maximize,
  Menu,
  X,
  Home,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuthV2 as useAuth } from "@/contexts/auth-context-v2"
import { cn } from "@/lib/utils"
import {
  buscarCursoCompleto,
  marcarAulaAssistida,
  type CursoCompleto,
  type ProgressoUsuario,
  type AulaDetalhada,
} from "./actions"
import { ContentViewer } from "./components/content-viewer"
import { PainelAnotacoes } from "./components/painel-anotacoes"
import { CardAcessoNegado } from "./components/card-acesso-negado"

function AssistirCursoPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const cursoId = params.cursoId as string
  const [curso, setCurso] = useState<CursoCompleto | null>(null)
  const [progresso, setProgresso] = useState<ProgressoUsuario | null>(null)
  const [aulaAtual, setAulaAtual] = useState<AulaDetalhada | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const [painelInfoAberto, setPainelInfoAberto] = useState(true)
  const [modulosExpandidos, setModulosExpandidos] = useState<Set<string>>(new Set())
  const [modoFoco, setModoFoco] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState<number | undefined>(undefined)
  const [aulaAcessoNegado, setAulaAcessoNegado] = useState<{ aulaId: string, motivo: string } | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Variável para controlar exibição de badges
  const showBadges = true

  // Definir isClient após montagem do componente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar dados do curso
  useEffect(() => {
    const carregarCurso = async () => {
      if (!user?.uid || !cursoId) {
        setCarregando(false)
        return
      }

      try {
        const resultado = await buscarCursoCompleto(cursoId, user.uid)
        if (resultado.success && resultado.data) {
          setCurso(resultado.data.curso)
          setProgresso(resultado.data.progresso)

          // Definir primeira aula como atual
          const primeiraAula = resultado.data.curso.modulos[0]?.aulas[0]
          if (primeiraAula) {
            setAulaAtual(primeiraAula)
            // Expandir primeiro módulo
            setModulosExpandidos(new Set([resultado.data.curso.modulos[0].id]))
          }
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: resultado.error,
          })
          router.push("/trilha-aprendizado")
        }
      } catch (error) {
        console.error("Erro ao carregar curso:", error)
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar curso",
        })
      } finally {
        setCarregando(false)
      }
    }

    carregarCurso()
  }, [user?.uid, cursoId, router, toast])

  const toggleModulo = (moduloId: string) => {
    const novosExpandidos = new Set(modulosExpandidos)
    if (novosExpandidos.has(moduloId)) {
      novosExpandidos.delete(moduloId)
    } else {
      novosExpandidos.add(moduloId)
    }
    setModulosExpandidos(novosExpandidos)
  }

  const selecionarAula = async (aula: AulaDetalhada) => {
    // Sempre selecionar a aula primeiro para melhor UX
    setAulaAtual(aula)
    setCurrentVideoTime(undefined)
    setAulaAcessoNegado(null) // Limpar estado anterior

    // Verificar se a aula requer permissões especiais (sempre verificar privada, ao vivo será verificado pela API)
    if (aula.tipo_acesso === 'privada') {
      try {
        const response = await fetch(`/api/aulas/${aula.id}/verificar-acesso?usuario_id=${user?.uid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // Verificar se a resposta é JSON válida
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Resposta não é JSON:', await response.text())
          setAulaAcessoNegado({
            aulaId: aula.id,
            motivo: 'Erro na verificação de acesso. Tente novamente mais tarde.'
          })
          return
        }

        const result = await response.json()

        if (!result.permitido) {
          // Definir estado de acesso negado para mostrar card especial
          setAulaAcessoNegado({
            aulaId: aula.id,
            motivo: result.motivo || 'Esta é uma aula privada. Você precisa de permissão especial para acessá-la.'
          })
        }
      } catch (error) {
        console.error('Erro ao verificar acesso:', error)
        setAulaAcessoNegado({
          aulaId: aula.id,
          motivo: 'Erro na verificação de acesso. Verifique sua conexão e tente novamente.'
        })
      }
    }
  }

  const marcarComoAssistida = async () => {
    if (!aulaAtual || !user?.uid) return

    try {
      const resultado = await marcarAulaAssistida(aulaAtual.id, cursoId, user.uid)
      if (resultado.success) {
        toast({
          variant: "success",
          title: "Sucesso!",
          description: "Aula marcada como assistida",
        })

        // Atualizar progresso local
        if (progresso && resultado.progresso !== undefined) {
          setProgresso({
            ...progresso,
            progresso_percentual: resultado.progresso,
            aulas_assistidas: [...progresso.aulas_assistidas, aulaAtual.id],
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: resultado.error,
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao marcar aula como assistida",
      })
    }
  }

  const navegarAula = (direcao: "anterior" | "proxima") => {
    if (!curso || !aulaAtual) return

    const todasAulas: AulaDetalhada[] = []
    curso.modulos.forEach((modulo) => {
      todasAulas.push(...modulo.aulas)
    })

    const indiceAtual = todasAulas.findIndex((aula) => aula.id === aulaAtual.id)

    if (direcao === "anterior" && indiceAtual > 0) {
      setAulaAtual(todasAulas[indiceAtual - 1])
      // Resetar o tempo do vídeo quando mudar de aula
      setCurrentVideoTime(undefined)
    } else if (direcao === "proxima" && indiceAtual < todasAulas.length - 1) {
      setAulaAtual(todasAulas[indiceAtual + 1])
      // Resetar o tempo do vídeo quando mudar de aula
      setCurrentVideoTime(undefined)
    }
  }

  const formatarDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas > 0) {
      return `${horas}h ${mins}min`
    }
    return `${mins}min`
  }

  const getIconeAula = (tipo: string) => {
    switch (tipo) {
      case "video":
        return <Video className="w-4 h-4" />
      case "pdf":
        return <FileText className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const aulaAssistida = (aulaId: string) => {
    return progresso?.aulas_assistidas.includes(aulaId) || false
  }

  const handleContentProgress = (currentTime?: number) => {
    // Atualizar o tempo atual do vídeo para as anotações
    if (currentTime !== undefined) {
      setCurrentVideoTime(currentTime)
    }

    // Aqui podemos implementar lógica para salvar progresso do vídeo
    // console.debug("Progresso do conteúdo:", { currentTime, duration })
  }

  const handleContentCompleted = () => {
    // Marcar automaticamente como assistida quando completar
    marcarComoAssistida()
  }

  // Loading state - incluir verificação de usuário
  if (carregando || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Carregando curso...</p>
        </div>
      </div>
    )
  }

  if (!curso || !aulaAtual || !cursoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Curso não encontrado</h2>
          <button
            onClick={() => router.push("/trilha-aprendizado")}
            className="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            Voltar à Trilha
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/trilha-aprendizado")}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <Home className="w-4 h-4" />
              Trilha
            </button>
            <div className="text-sm text-slate-400">
              {curso.titulo} • {aulaAtual.modulo_titulo} • {aulaAtual.titulo}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModoFoco(!modoFoco)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <Maximize className="w-4 h-4" />
              {modoFoco ? "Sair do Foco" : "Modo Foco"}
            </button>
            <button
              onClick={() => setSidebarAberta(!sidebarAberta)}
              className="lg:hidden flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Área Principal */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Módulos e Aulas */}
        <AnimatePresence>
          {sidebarAberta && !modoFoco && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-80 bg-slate-800/30 border-r border-slate-700/50 flex-shrink-0 overflow-hidden"
            >
              <div className="h-full overflow-y-auto scrollbar-sidebar">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Conteúdo do Curso</h3>
                    <button
                      onClick={() => setSidebarAberta(false)}
                      className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {curso.modulos.map((modulo) => (
                      <div key={modulo.id} className="space-y-1">
                        <button
                          onClick={() => toggleModulo(modulo.id)}
                          className="w-full flex justify-between items-center text-left p-3 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
                        >
                          <span className="font-medium">{modulo.titulo}</span>
                          {modulosExpandidos.has(modulo.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <AnimatePresence>
                          {modulosExpandidos.has(modulo.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-4 space-y-1">
                                {modulo.aulas.map((aula) => (
                                  <button
                                    key={aula.id}
                                    onClick={() => selecionarAula(aula)}
                                    className={cn(
                                      "w-full flex justify-start text-left p-3 text-sm transition-colors rounded-md",
                                      aulaAtual.id === aula.id
                                        ? (aulaAcessoNegado?.aulaId === aula.id)
                                          ? "bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:text-red-300"
                                          : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 hover:text-indigo-300"
                                        : aula.tipo_acesso === 'privada'
                                          ? "text-slate-400 hover:text-white hover:bg-red-900/20 border-l-4 border-red-500/30"
                                          : "text-slate-400 hover:text-white hover:bg-slate-700/30",
                                    )}
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      <div className="flex items-center gap-2">
                                        {aulaAssistida(aula.id) ? (
                                          <CheckCircle className="w-4 h-4 text-green-400" />
                                        ) : (
                                          <Circle className="w-4 h-4" />
                                        )}
                                        {getIconeAula(aula.tipo)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="truncate">{aula.titulo}</span>
                                          {/* Badge de Tipo de Aula */}
                                          <div className="flex gap-1">
                                            {/* Badge de Tipo de Acesso */}
                                            <span className={cn(
                                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                                              aula.tipo_acesso === 'privada'
                                                ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                                                : 'bg-green-900/30 text-green-400 border border-green-500/30'
                                            )}>
                                              {aula.tipo_acesso === 'privada' ? (
                                                <>🔒 Privada</>
                                              ) : (
                                                <>🌐 Pública</>
                                              )}
                                            </span>

                                            {/* Badge de Aula Ao Vivo */}
                                            {aula.ao_vivo && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-red-900/30 text-red-400 border border-red-500/30">
                                                🔴 Ao Vivo
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                          <Clock className="w-3 h-3" />
                                          {formatarDuracao(aula.duracao)}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Área Central Escrolável */}
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 bg-black/20 overflow-y-auto scrollbar-custom">
            <div className="p-4 space-y-6">
              {/* Player/Visualizador */}
              <div className="w-full max-w-5xl mx-auto">
                {aulaAcessoNegado?.aulaId === aulaAtual.id ? (
                  <CardAcessoNegado aula={aulaAtual} motivo={aulaAcessoNegado.motivo} />
                ) : (
                  <ContentViewer
                    aula={aulaAtual}
                    onProgress={handleContentProgress}
                    onCompleted={handleContentCompleted}
                  />
                )}
              </div>

              {/* Controles de Navegação */}
              <div className="w-full max-w-5xl mx-auto">
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                  {/* Primeira linha: Navegação e Progresso */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navegarAula("anterior")}
                      disabled={!curso.modulos[0]?.aulas[0] || aulaAtual.id === curso.modulos[0].aulas[0].id}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-600/50 bg-slate-800/30 text-slate-300 hover:text-white hover:bg-slate-700/50 hover:border-slate-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>

                    <div className="flex-1 mx-8">
                      <div className="text-center mb-2">
                        <span className="text-sm text-slate-400">
                          Progresso do Curso: {progresso?.progresso_percentual || 0}%
                        </span>
                      </div>
                      <Progress value={progresso?.progresso_percentual || 0} className="h-2" />
                    </div>

                    <button
                      onClick={() => navegarAula("proxima")}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-md transition-colors"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Segunda linha: Marcar como Concluída */}
                  <div className="flex justify-center">
                    {aulaAcessoNegado?.aulaId === aulaAtual.id ? (
                      <div className="flex items-center gap-2 px-4 py-2 border border-red-600/50 bg-red-900/20 text-red-400 rounded-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Acesso Restrito
                      </div>
                    ) : (
                      <button
                        onClick={marcarComoAssistida}
                        className="flex items-center gap-2 px-4 py-2 border border-green-600/50 bg-green-900/20 text-green-400 hover:bg-green-600/20 hover:text-green-300 hover:border-green-500 rounded-md transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marcar como Concluída
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção de Informações da Aula */}
              <div className="w-full max-w-5xl mx-auto">
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-3">Sobre esta aula</h3>

                      <div className="flex flex-wrap items-center gap-6 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">Módulo:</span>
                          <span className="text-slate-400">{aulaAtual.modulo_titulo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">Duração:</span>
                          <span className="text-slate-400">{formatarDuracao(aulaAtual.duracao)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">Tipo:</span>
                          <div className="flex gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${aulaAtual.tipo_acesso === 'privada'
                              ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                              : 'bg-green-900/30 text-green-400 border border-green-500/30'
                              }`}>
                              {aulaAtual.tipo_acesso === 'privada' ? '🔒 Privada' : '🌐 Pública'}
                            </span>
                            {showBadges && (
                              <>
                                {aulaAtual.ao_vivo && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/30">
                                    🔴 Ao Vivo
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {isClient && aulaAcessoNegado?.aulaId === aulaAtual.id && (
                        <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="font-medium text-red-400">Acesso Restrito</span>
                          </div>
                          <p className="text-sm text-red-300">{aulaAcessoNegado.motivo}</p>
                        </div>
                      )}

                      <div className="border-t border-slate-700/50 pt-4">
                        <h4 className="font-medium text-white mb-3">Resumo</h4>
                        {aulaAtual.resumo ? (
                          <div
                            className="text-slate-300 leading-relaxed [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-white [&_h3]:mb-2 [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_li]:text-slate-300 [&_a]:text-blue-400 [&_a]:underline [&_a]:hover:text-blue-300"
                            dangerouslySetInnerHTML={{ __html: aulaAtual.resumo }}
                          />
                        ) : (
                          <p className="text-slate-300 leading-relaxed">Nenhum resumo disponível para esta aula.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Painel de Informações Lateral */}
          <AnimatePresence>
            {painelInfoAberto && !modoFoco && (
              <motion.aside
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-80 bg-slate-800/30 border-l border-slate-700/50 flex-shrink-0 overflow-hidden"
              >
                <div className="h-full overflow-y-auto scrollbar-sidebar">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white">Recursos</h3>
                      <button
                        onClick={() => setPainelInfoAberto(false)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <Tabs defaultValue="anotacoes" className="h-full">
                      <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                        <TabsTrigger value="anotacoes" className="text-xs">
                          Anotações
                        </TabsTrigger>
                        <TabsTrigger value="materiais" className="text-xs">
                          Materiais
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="anotacoes" className="mt-0 h-full">
                        {aulaAtual && (
                          <PainelAnotacoes aulaId={aulaAtual.id} cursoId={cursoId} currentTime={currentVideoTime} />
                        )}
                      </TabsContent>

                      <TabsContent value="materiais" className="mt-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-white">Materiais Complementares</h4>
                          <div className="text-sm text-slate-400">
                            <p>Nenhum material adicional disponível para esta aula.</p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Botões para reabrir painéis quando fechados */}
      {!sidebarAberta && !modoFoco && (
        <button
          onClick={() => setSidebarAberta(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-600/50 rounded-md transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {!painelInfoAberto && !modoFoco && (
        <button
          onClick={() => setPainelInfoAberto(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-600/50 rounded-md transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function AssistirCursoPage() {
  const { user, isLoading } = useAuth()
  const params = useParams()

  // Loading state mais robusto
  if (isLoading || !user || !params?.cursoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-300">
            {isLoading ? 'Verificando autenticação...' : 'Carregando curso...'}
          </p>
        </div>
      </div>
    )
  }

  return <AssistirCursoPageContent />
}
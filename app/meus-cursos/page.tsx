"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthV2 as useAuth } from "@/contexts/auth-context-v2"
import type { User } from "@/lib/auth-service-v2"
import { motion } from "framer-motion"
import { PlusCircle, BookOpen } from "lucide-react"
import ModalAdicionarCurso from "./components/modal-adicionar-curso"
import GridCursos from "./components/grid-cursos"
import Paginacao from "./components/paginacao"
import { buscarCursosDoInstrutor } from "./actions"
import { useToast } from "@/hooks/use-toast"

interface Curso {
  id: string
  titulo: string
  descricao: string
  nivel: string
  ativo: boolean
  imagem_url?: string
  duracao_total?: number
  criado_em: string
  atualizado_em: string
}

const ITENS_POR_PAGINA = 6

export default function MeusCursosPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalCursos, setTotalCursos] = useState(0)
  const [cursosCarregados, setCursosCarregados] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Helper para verificar role (memoizado para evitar re-criação)
  const isInstrutor = user?.perfis?.includes("instrutor") || false
  const isAdmin = user?.perfis?.includes("admin") || false
  const hasPermission = isInstrutor || isAdmin

  useEffect(() => {
    // Aguardar carregamento da autenticação
    if (authLoading) return

    if (!user) {
      console.log('🚪 MeusCursosPage: Usuário não autenticado, redirecionando')
      router.push("/")
      return
    }

    // Verificar se o usuário tem permissão para criar cursos
    if (!hasPermission) {
      console.log('⚠️ MeusCursosPage: Usuário sem permissão, redirecionando para dashboard')
      router.push("/dashboard")
      return
    }

    // Evitar carregar cursos múltiplas vezes
    if (cursosCarregados && paginaAtual === 1) {
      console.log('📋 MeusCursosPage: Cursos já carregados, pulando')
      return
    }

    console.log('✅ MeusCursosPage: Usuário autorizado, carregando cursos')
    // Carregar cursos do instrutor
    carregarCursos(user.uid, paginaAtual)
  }, [user, authLoading, hasPermission, router, paginaAtual, cursosCarregados])

  const carregarCursos = async (instrutorId: string, pagina: number) => {
    if (loadingCursos) return // Evitar múltiplas chamadas simultâneas
    
    setLoadingCursos(true)
    try {
      console.log(`🔄 Carregando cursos para instrutor ${instrutorId}, página ${pagina}`)
      const result = await buscarCursosDoInstrutor(instrutorId, pagina, ITENS_POR_PAGINA)
      if (result.success) {
        console.log(`✅ Cursos carregados: ${result.data.length} cursos`)
        setCursos(result.data)
        setTotalCursos(result.totalCursos)
        setCursosCarregados(true)
      } else {
        console.error("❌ Erro ao buscar cursos:", result.message)
      }
    } catch (error) {
      console.error("❌ Erro ao carregar cursos:", error)
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar cursos",
      })
    } finally {
      setLoadingCursos(false)
    }
  }

  const handleCursoAdicionado = () => {
    if (user?.uid) {
      // Voltar para a primeira página após adicionar um curso
      setPaginaAtual(1)
      setCursosCarregados(false) // Forçar recarregamento
      carregarCursos(user.uid, 1)
    }
  }

  const handleEditarCurso = (curso: Curso) => {
    // TODO: Implementar edição
    console.log("Editar curso:", curso)
    toast({
      title: "Edição",
      description: "Funcionalidade de edição será implementada em breve!",
    })
  }

  const handleExcluirCurso = (cursoId: string) => {
    // TODO: Implementar exclusão com confirmação
    console.log("Excluir curso:", cursoId)
    if (confirm("Tem certeza que deseja excluir este curso?")) {
      toast({
        title: "Exclusão",
        description: "Funcionalidade de exclusão será implementada em breve!",
      })
    }
  }

  const handleStatusChange = (cursoId: string, novoStatus: boolean) => {
    // Atualizar o estado local
    setCursos((cursos) => cursos.map((curso) => (curso.id === cursoId ? { ...curso, ativo: novoStatus } : curso)))
  }

  const handleChangePagina = (novaPagina: number) => {
    setPaginaAtual(novaPagina)
    setCursosCarregados(false) // Forçar recarregamento da nova página
  }

  const totalPaginas = Math.max(1, Math.ceil(totalCursos / ITENS_POR_PAGINA))

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
  if (authLoading) {
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
  if (!user || !hasPermission) {
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
                <PlusCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-slate-300 to-blue-400 bg-clip-text text-transparent">
                  Meus Cursos
                </h1>
                <p className="text-slate-400 text-lg mt-1">Gerencie todos os seus cursos em um só lugar</p>
              </div>
            </div>

            {/* Botão Adicionar Curso */}
            <ModalAdicionarCurso onCursoAdicionado={handleCursoAdicionado} />
          </div>
        </motion.div>

        {/* Conteúdo */}
        {loadingCursos ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
              <p className="text-slate-300">Carregando cursos...</p>
            </div>
          </div>
        ) : cursos.length > 0 ? (
          /* Grid de Cursos */
          <motion.div variants={itemVariants}>
            <div className="mb-6">
              <p className="text-slate-400">
                {totalCursos} {totalCursos === 1 ? "curso encontrado" : "cursos encontrados"}
              </p>
            </div>
            <GridCursos
              cursos={cursos}
              onEditarCurso={handleEditarCurso}
              onExcluirCurso={handleExcluirCurso}
              onStatusChange={handleStatusChange}
              userId={user.uid}
            />

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
                <BookOpen className="w-12 h-12 text-indigo-400" />
              </div>

              <h2 className="text-2xl font-semibold text-white mb-4">Nenhum curso criado ainda</h2>

              <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
                Comece criando seu primeiro curso e compartilhe seu conhecimento com milhares de alunos.
              </p>

              <div className="bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg p-6 border border-slate-600/30">
                <p className="text-slate-400 text-sm">
                  <strong className="text-indigo-400">Olá, {user.nome}!</strong>
                  <br />
                  Como você é um <span className="capitalize text-emerald-400">{user.perfis}</span>, você tem acesso
                  completo para criar e gerenciar cursos na plataforma.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cards de funcionalidades (só mostrar se não houver cursos) */}
        {cursos.length === 0 && (
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8" variants={itemVariants}>
            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📚</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Informações Básicas</h3>
              <p className="text-slate-400 text-sm">
                Defina título, descrição, nível de dificuldade e outras informações essenciais do seu curso.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Módulos e Aulas</h3>
              <p className="text-slate-400 text-sm">
                Organize seu conteúdo em módulos e crie aulas envolventes com vídeos, textos e exercícios.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Publicação</h3>
              <p className="text-slate-400 text-sm">
                Revise todo o conteúdo e publique seu curso para que os alunos possam se inscrever.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

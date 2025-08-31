"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PlayCircle,
  Upload,
  X,
  Clock,
  Check,
  ArrowLeft,
  Bold,
  Italic,
  List,
  Type,
  Smile,
  LinkIcon,
  ExternalLink,
} from "lucide-react"
import {
  editarAula,
  buscarAulaPorId,
  criarModulo,
  buscarCursosDoInstrutor,
  buscarModulosDoCurso,
  uploadVideoMinio,
  uploadPdfMinio,
} from "../../actions"
import type { AulaData, ModuloData } from "../../actions"
import { getCurrentClientUser } from "@/lib/auth-client"
import { useAuthV2 as useAuth } from "@/contexts/auth-context-v2"
import { useToast } from "@/hooks/use-toast"
import { formatarTamanhoArquivo } from "@/lib/utils-arquivo"
import { useRouter, useParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Shield, Eye, Zap } from "lucide-react"
import { ModalAdicionarPermissao } from "@/components/aulas/modal-adicionar-permissao"

interface Curso {
  id: string
  titulo: string
}

interface Modulo {
  id: string
  titulo: string
}

// Lista de emojis comuns para educação
const commonEmojis = [
  "📚",
  "📝",
  "✏️",
  "📖",
  "🔍",
  "💡",
  "⚠️",
  "✅",
  "❌",
  "⭐",
  "🎯",
  "🧩",
  "🔑",
  "📊",
  "📈",
  "🧠",
  "👨‍💻",
  "👩‍💻",
  "🤔",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🎓",
  "🎉",
  "🏆",
  "⏱️",
  "📅",
  "📌",
  "📎",
  "🔗",
  "📋",
  "📁",
  "🗂️",
  "📄",
  "📑",
  "🔒",
  "🔓",
  "🔔",
  "🔕",
]

export default function EditarAulaPage() {
  const [loading, setLoading] = useState(false)
  const [loadingAula, setLoadingAula] = useState(true)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [loadingModulos, setLoadingModulos] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [exibirPermissoes, setExibirPermissoes] = useState<boolean>(true)

  // Estados para novo módulo
  const [novoModulo, setNovoModulo] = useState("")
  const [criandoModulo, setCriandoModulo] = useState(false)
  const [moduloSelecionado, setModuloSelecionado] = useState(false)

  // Estados para controles do editor
  const [formatacaoAtiva, setFormatacaoAtiva] = useState({
    titulo: false,
    negrito: false,
    italico: false,
    lista: false,
    link: false,
  })

  // Estado para o link
  const [linkUrl, setLinkUrl] = useState("")
  const [linkTexto, setLinkTexto] = useState("")
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectionText, setSelectionText] = useState("")

  // Estados para gerenciamento de permissões
  const [permissoes, setPermissoes] = useState<any>(null)
  const [loadingPermissoes, setLoadingPermissoes] = useState(false)
  const [modalPermissaoOpen, setModalPermissaoOpen] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null)

  // Ref para o editor de conteúdo
  const editorRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const aulaId = params.aulaId as string
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    curso_id: "",
    modulo_id: "",
    titulo: "",
    descricao: "",
    tipo: "" as "video" | "texto" | "quiz" | "projeto" | "",
    conteudo: "",
    duracao_horas: "",
    duracao_minutos: "",
    ativo: true,
    privada: false,
    ao_vivo: false,
    media_url: "",
  })

  // Carregar dados da aula quando a página carregar (aguardar autenticação)
  useEffect(() => {
    const carregarTudo = async () => {
      if (authLoading) {
        console.log('🔄 Aguardando autenticação...')
        return
      }
      
      if (!isAuthenticated || !user) {
        console.log('❌ Usuário não autenticado, redirecionando...')
        router.push('/auth/signin')
        return
      }
      
      console.log('✅ Usuário autenticado, carregando dados...')
      const resultado = await carregarDadosAula()
      if (resultado && (resultado as any).exibirPermissoes) {
        await carregarPermissoes()
      }
    }
    carregarTudo()
  }, [aulaId, authLoading, isAuthenticated, user])

  // Adicione um novo useEffect para atualizar o editor quando o conteúdo for carregado:
  useEffect(() => {
    if (editorRef.current && formData.conteudo) {
      editorRef.current.innerHTML = formData.conteudo
    }
  }, [formData.conteudo, loadingAula])

  // Carregar cursos quando a página carregar
  useEffect(() => {
    carregarCursos()
  }, [])

  // Carregar módulos quando curso for selecionado
  useEffect(() => {
    if (formData.curso_id) {
      carregarModulos(formData.curso_id)
    } else {
      setModulos([])
      setModuloSelecionado(false)
    }
  }, [formData.curso_id])

  // Verificar se módulo foi selecionado
  useEffect(() => {
    setModuloSelecionado(!!formData.modulo_id)
  }, [formData.modulo_id])

  // Atualizar exibição de permissões quando toggles mudarem
  useEffect(() => {
    const deveExibir = Boolean(formData.privada || formData.ao_vivo)
    setExibirPermissoes(deveExibir)
  }, [formData.privada, formData.ao_vivo])

  // Verificar formatação quando seleção mudar
  useEffect(() => {
    const handleSelectionChange = () => {
      verificarFormatacaoAtiva()

      // Salvar a seleção atual para uso posterior (inserção de emoji/link)
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
        setSelectionText(selection.toString())
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [])

  // Salvar seleção antes de abrir o diálogo de link
  const handleOpenLinkDialog = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
      setSelectionText(selection.toString())
    }
    setLinkDialogOpen(true)
  }

  const carregarDadosAula = async () => {
    if (!user?.uid) {
      console.log('❌ Usuário não autenticado, aguardando...')
      return { success: false as const }
    }

    console.log('🔄 Carregando dados da aula:', aulaId, 'usuário:', user.uid)
    setLoadingAula(true)
    try {
      const result = await buscarAulaPorId(aulaId, user.uid)
      console.log('📊 Resultado buscarAulaPorId:', result)
      if (result.success && result.data) {
        const aula = result.data

        // Calcular horas e minutos da duração
        const duracaoHoras = aula.duracao ? Math.floor(aula.duracao / 60).toString() : ""
        const duracaoMinutos = aula.duracao ? (aula.duracao % 60).toString() : ""

        setFormData({
          curso_id: aula.curso_id,
          modulo_id: aula.modulo_id,
          titulo: aula.titulo,
          descricao: aula.descricao || "",
          tipo: aula.tipo || "video",
          conteudo: aula.conteudo || "",
          media_url: aula.media_url || "",
          duracao_horas: duracaoHoras,
          duracao_minutos: duracaoMinutos,
          ativo: aula.ativo,
          privada: aula.privada || false,
          ao_vivo: aula.ao_vivo || false,
        })

        // Se há arquivo, mostrar preview
        if (aula.media_url) {
          const fileName = aula.media_url.split("/").pop() || "arquivo"
          setFilePreview(fileName)
        }

        // Definir se permissões devem ser exibidas: apenas para aulas privadas ou ao vivo
        const deveExibir = Boolean(aula.privada || aula.ao_vivo)
        setExibirPermissoes(deveExibir)

        return { success: true as const, exibirPermissoes: deveExibir }
      } else {
        console.error('❌ Falha ao carregar aula:', result.message)
        toast({
          variant: "destructive",
          title: "Erro ao carregar aula",
          description: result.message || "Aula não encontrada",
        })
        router.push("/minhas-aulas")
        return { success: false as const }
      }
    } catch (error) {
      console.error("❌ Erro ao carregar aula:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Erro inesperado ao carregar aula",
      })
      return { success: false as const }
    } finally {
      console.log('🏁 Finalizando carregamento da aula')
      setLoadingAula(false)
    }
  }

  const carregarPermissoes = async () => {
    setLoadingPermissoes(true)
    try {
      const response = await fetch(`/api/aulas/${aulaId}/permissoes`)
      
      if (response.ok) {
        const data = await response.json()
        setPermissoes(data)
        console.log('✅ Permissões carregadas:', data)
      } else {
        const errorData = await response.json()
        console.error('❌ Erro ao carregar permissões:', errorData.error)
        toast({
          variant: "destructive",
          title: "Erro ao carregar permissões",
          description: errorData.error || 'Erro desconhecido',
        })
      }
    } catch (error) {
      console.error('❌ Erro ao carregar permissões:', error)
      toast({
        variant: "destructive",
        title: "Erro ao carregar permissões",
        description: 'Erro de conexão com o servidor',
      })
    } finally {
      setLoadingPermissoes(false)
    }
  }

  const handleAdicionarPermissao = (aluno: any) => {
    setAlunoSelecionado(aluno)
    setModalPermissaoOpen(true)
  }

  const handleRemoverPermissao = async (alunoId: string) => {
    try {
      const response = await fetch(`/api/aulas/${aulaId}/permissoes/${alunoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "✅ Permissão Removida",
          description: "Permissão removida com sucesso",
        })
        carregarPermissoes()
      } else {
        const data = await response.json()
        toast({
          variant: "destructive",
          title: "Erro ao Remover Permissão",
          description: data.error || 'Erro desconhecido',
        })
      }
    } catch (error) {
      console.error('Erro:', error)
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Erro ao conectar com o servidor',
      })
    }
  }

  const onPermissaoConcedida = () => {
    carregarPermissoes()
    setModalPermissaoOpen(false)
    setAlunoSelecionado(null)
  }

  const carregarCursos = async () => {
    if (!user?.uid) return

    setLoadingCursos(true)
    try {
      const result = await buscarCursosDoInstrutor(user.uid)
      if (result.success) {
        setCursos(result.data)
      }
    } catch (error) {
      console.error("Erro ao carregar cursos:", error)
    } finally {
      setLoadingCursos(false)
    }
  }

  const carregarModulos = async (cursoId: string) => {
    if (!user?.uid) return

    setLoadingModulos(true)
    try {
      const result = await buscarModulosDoCurso(cursoId, user.uid)
      if (result.success) {
        setModulos(result.data)
      }
    } catch (error) {
      console.error("Erro ao carregar módulos:", error)
    } finally {
      setLoadingModulos(false)
    }
  }

  const handleCriarNovoModulo = async () => {
    if (!novoModulo.trim() || !formData.curso_id) return

    if (!user?.uid) return

    setCriandoModulo(true)
    try {
      // Calcular próxima ordem
      const proximaOrdem = modulos.length + 1

      const moduloData: ModuloData = {
        curso_id: formData.curso_id,
        titulo: novoModulo.trim(),
        descricao: "",
        ordem: proximaOrdem,
        ativo: true,
      }

      const result = await criarModulo(moduloData, user.uid)

      if (result.success) {
        toast({
          variant: "success",
          title: "✅ Módulo criado!",
          description: `Módulo "${novoModulo}" criado com sucesso`,
        })

        // Recarregar módulos
        await carregarModulos(formData.curso_id)

        // Selecionar o novo módulo automaticamente
        setFormData((prev) => ({ ...prev, modulo_id: result.data.id }))

        // Limpar input
        setNovoModulo("")
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao criar módulo",
          description: result.message || "Erro inesperado",
        })
      }
    } catch (error) {
      console.error("Erro:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Erro inesperado ao criar módulo",
      })
    } finally {
      setCriandoModulo(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {


      // Verificar tipo de arquivo baseado no tipo da aula
      if (formData.tipo === "video") {
        if (!file.type.match(/^video\/(mp4|avi|mov|wmv|webm|mkv)$/)) {
          toast({
            variant: "destructive",
            title: "Erro no arquivo",
            description: "Por favor, selecione um vídeo válido (MP4, AVI, MOV, WMV, WebM, MKV)",
          })
          return
        }
      } else if (formData.tipo === "texto") {
        if (!file.type.match(/^application\/pdf$/)) {
          toast({
            variant: "destructive",
            title: "Erro no arquivo",
            description: "Por favor, selecione um arquivo PDF",
          })
          return
        }
      }

      // Verificar tamanho (máximo 3GB)
      const maxSize = 3 * 1024 * 1024 * 1024 // 3GB
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo excede o limite de 3GB",
        })
        return
      }

      setSelectedFile(file)
      setFilePreview(file.name)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setFormData((prev) => ({ ...prev, media_url: "" }))
  }

  // Funções do editor de texto
  const aplicarFormatacao = (comando: string, valor?: string) => {
    document.execCommand(comando, false, valor)
    if (editorRef.current) {
      setFormData({ ...formData, conteudo: editorRef.current.innerHTML })
    }
    verificarFormatacaoAtiva()
  }

  const handleEditorChange = () => {
    if (editorRef.current) {
      setFormData({ ...formData, conteudo: editorRef.current.innerHTML })
      verificarFormatacaoAtiva()
    }
  }

  // Verificar formatações ativas
  const verificarFormatacaoAtiva = () => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    setFormatacaoAtiva({
      titulo: document.queryCommandValue("formatBlock") === "h3",
      negrito: document.queryCommandState("bold"),
      italico: document.queryCommandState("italic"),
      lista: document.queryCommandState("insertUnorderedList"),
      link: document.queryCommandState("createLink"),
    })
  }

  // Inserir emoji no editor
  const inserirEmoji = (emoji: string) => {
    if (!editorRef.current) return

    // Restaurar a seleção salva
    const selection = window.getSelection()
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }

    // Inserir o emoji na posição do cursor
    document.execCommand("insertText", false, emoji)

    // Atualizar o conteúdo
    if (editorRef.current) {
      setFormData({ ...formData, conteudo: editorRef.current.innerHTML })
    }
  }

  // Inserir link no editor
  const inserirLink = () => {
    if (!editorRef.current || !linkUrl.trim()) return

    // Focar no editor para garantir que ele está ativo
    editorRef.current.focus()

    // Restaurar a seleção salva
    const selection = window.getSelection()
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }

    // Determinar o texto do link
    const textoDoLink = selectionText || linkTexto || linkUrl

    if (selectionText) {
      // Se há texto selecionado, criar link com ele
      document.execCommand("createLink", false, linkUrl)

      // Adicionar target="_blank" ao link criado
      const links = editorRef.current.querySelectorAll(`a[href="${linkUrl}"]`)
      links.forEach((link) => {
        link.setAttribute("target", "_blank")
        link.setAttribute("rel", "noopener noreferrer")
      })
    } else {
      // Se não há texto selecionado, inserir um novo link
      const linkHTML = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${textoDoLink}</a>`
      document.execCommand("insertHTML", false, linkHTML)
    }

    // Atualizar o conteúdo
    if (editorRef.current) {
      setFormData({ ...formData, conteudo: editorRef.current.innerHTML })
    }

    // Limpar os campos
    setLinkUrl("")
    setLinkTexto("")
    setLinkDialogOpen(false)
    verificarFormatacaoAtiva()

    // Notificar o usuário
    toast({
      title: "✅ Link inserido",
      description: "Link adicionado com sucesso",
      duration: 2000,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user?.uid) {
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Usuário não identificado",
        })
        return
      }

      // Validações
      if (!formData.curso_id) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Selecione um curso",
        })
        return
      }

      if (!formData.modulo_id) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Selecione um módulo ou crie um novo",
        })
        return
      }

      if (!formData.titulo.trim()) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Título é obrigatório",
        })
        return
      }

      if (!formData.tipo) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Tipo da aula é obrigatório",
        })
        return
      }

      let mediaUrl: string | undefined = formData.media_url

      // Upload do arquivo se houver um novo arquivo
      if (selectedFile) {
        setUploadingFile(true)

        const fileSize = (selectedFile.size / 1024 / 1024).toFixed(2)

        

        toast({
          title: "📤 Enviando arquivo...",
          description: `Enviando arquivo de ${fileSize}MB`,
        })

        // Upload direto para MinIO
        const uploadResult =
          formData.tipo === "video"
            ? await uploadVideoMinio(selectedFile, user.uid)
            : await uploadPdfMinio(selectedFile, user.uid)

        setUploadingFile(false)

        if (!uploadResult.success) {
          toast({
            variant: "destructive",
            title: "Erro no upload",
            description: uploadResult.message || "Erro ao fazer upload do arquivo",
          })
          return
        }

        mediaUrl = uploadResult.url
        

        toast({
          variant: "success",
          title: "✅ Upload concluído!",
          description: "Arquivo enviado com sucesso",
        })
      }

      // Calcular duração total em minutos
      let duracaoTotal: number | undefined
      if (formData.duracao_horas || formData.duracao_minutos) {
        const horas = Number.parseInt(formData.duracao_horas) || 0
        const minutos = Number.parseInt(formData.duracao_minutos) || 0
        duracaoTotal = horas * 60 + minutos
      }

      const aulaData: AulaData = {
        curso_id: formData.curso_id,
        modulo_id: formData.modulo_id,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        tipo: formData.tipo,
        conteudo: formData.conteudo.trim(),
        media_url: mediaUrl,
        duracao: duracaoTotal,
        ativo: formData.ativo,
        privada: formData.privada,
        ao_vivo: formData.ao_vivo,
      }

      

      const result = await editarAula(aulaId, aulaData, user.uid)

      if (result.success) {
        toast({
          variant: "success",
          title: "✅ Sucesso!",
          description: "Aula editada com sucesso!",
        })

        // Redirecionar de volta para a lista de aulas
        router.push("/minhas-aulas")
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao editar aula",
          description: result.message || "Erro inesperado",
        })
      }
    } catch (error) {
      console.error("Erro:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Erro inesperado ao editar aula",
      })
    } finally {
      setLoading(false)
      setUploadingFile(false)
    }
  }

  // Verificar se os campos devem estar habilitados
  const camposHabilitados = moduloSelecionado

  // Loading states
  if (authLoading || loadingAula) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <div className="text-white text-xl">
            {authLoading ? 'Verificando autenticação...' : 'Carregando aula...'}
          </div>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    router.push('/auth/signin')
    return null
  }

  

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          onClick={() => router.push("/minhas-aulas")}
          variant="ghost"
          className="text-slate-300 hover:text-white hover:bg-slate-700/50 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Minhas Aulas
        </Button>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
          Editar Aula
        </h1>
        <p className="text-slate-400 mt-2">Edite os dados da sua aula</p>
      </div>

      {/* Tabs para Edição e Gerenciamento */}
      <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-800/95 to-gray-900/95 border border-slate-700/50 rounded-lg shadow-xl">
        <Tabs defaultValue="editar" className="w-full">
          <TabsList className={`grid w-full ${exibirPermissoes ? 'grid-cols-2' : 'grid-cols-1'} bg-slate-800/50 border-b border-slate-700/50`}>
            <TabsTrigger 
              value="editar" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Editar Aula
            </TabsTrigger>
            {exibirPermissoes && (
              <TabsTrigger 
                value="permissoes"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Permissões
              </TabsTrigger>
            )}
          </TabsList>

          {/* Aba de Edição */}
          <TabsContent value="editar" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl text-white flex items-center gap-2 mb-4">
                  <PlayCircle className="w-5 h-5 text-indigo-400" />
                  Informações da Aula
                </h3>
                </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Curso */}
              <div className="space-y-2">
                <Label className="text-slate-300">Curso *</Label>
                <Select
                  value={formData.curso_id}
                  onValueChange={(value) => setFormData({ ...formData, curso_id: value })}
                  disabled={loadingCursos}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white">
                    <SelectValue placeholder={loadingCursos ? "Carregando cursos..." : "Selecione o curso"} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 border-slate-700 text-white backdrop-blur-sm">
                    {cursos.map((curso) => (
                      <SelectItem key={curso.id} value={curso.id} className="focus:bg-slate-700/80 focus:text-white">
                        {curso.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Módulo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Módulo *</Label>
                <Select
                  value={formData.modulo_id}
                  onValueChange={(value) => setFormData({ ...formData, modulo_id: value })}
                  disabled={!formData.curso_id || loadingModulos}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white">
                    <SelectValue
                      placeholder={
                        !formData.curso_id
                          ? "Selecione um curso primeiro"
                          : loadingModulos
                            ? "Carregando módulos..."
                            : "Selecione o módulo"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 border-slate-700 text-white backdrop-blur-sm">
                    {modulos.map((modulo) => (
                      <SelectItem key={modulo.id} value={modulo.id} className="focus:bg-slate-700/80 focus:text-white">
                        {modulo.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Novo Módulo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Ou criar novo módulo</Label>
                <div className="flex gap-2">
                  <Input
                    value={novoModulo}
                    onChange={(e) => setNovoModulo(e.target.value)}
                    placeholder="Adicione um novo módulo"
                    disabled={!formData.curso_id || criandoModulo}
                    className="flex-1 bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    onClick={handleCriarNovoModulo}
                    disabled={!formData.curso_id || !novoModulo.trim() || criandoModulo}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4"
                  >
                    {criandoModulo ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {!formData.curso_id && (
                  <p className="text-slate-500 text-xs">Selecione um curso primeiro para criar um novo módulo</p>
                )}
              </div>

              {/* Separador visual */}
              <div className="border-t border-slate-700/50 pt-4">
                <p className="text-slate-400 text-sm mb-4">
                  {!camposHabilitados && "Selecione ou crie um módulo para continuar"}
                </p>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-slate-300">
                  Título da Aula *
                </Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Introdução aos Hooks"
                  disabled={!camposHabilitados}
                  className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white disabled:opacity-50"
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-slate-300">
                  Descrição
                </Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o que será abordado nesta aula..."
                  disabled={!camposHabilitados}
                  className="min-h-[80px] bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white disabled:opacity-50"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo da Aula *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                  disabled={!camposHabilitados}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white disabled:opacity-50">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 border-slate-700 text-white backdrop-blur-sm">
                    <SelectItem value="video" className="focus:bg-slate-700/80 focus:text-white">
                      Vídeo
                    </SelectItem>
                    <SelectItem value="texto" className="focus:bg-slate-700/80 focus:text-white">
                      Texto (PDF)
                    </SelectItem>
                    <SelectItem value="quiz" className="focus:bg-slate-700/80 focus:text-white">
                      Quiz
                    </SelectItem>
                    <SelectItem value="projeto" className="focus:bg-slate-700/80 focus:text-white">
                      Projeto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Editor de Conteúdo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Resumo do Conteúdo</Label>

                {/* Barra de ferramentas */}
                <div className="flex flex-wrap gap-1 p-2 bg-slate-800/30 rounded-t-lg border border-slate-700 border-b-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => aplicarFormatacao("formatBlock", "h3")}
                    disabled={!camposHabilitados}
                    className={`h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50 ${
                      formatacaoAtiva.titulo ? "bg-indigo-600/30 text-indigo-300" : ""
                    }`}
                    title="Título"
                  >
                    <Type className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => aplicarFormatacao("bold")}
                    disabled={!camposHabilitados}
                    className={`h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50 ${
                      formatacaoAtiva.negrito ? "bg-indigo-600/30 text-indigo-300" : ""
                    }`}
                    title="Negrito"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => aplicarFormatacao("italic")}
                    disabled={!camposHabilitados}
                    className={`h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50 ${
                      formatacaoAtiva.italico ? "bg-indigo-600/30 text-indigo-300" : ""
                    }`}
                    title="Itálico"
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => aplicarFormatacao("insertUnorderedList")}
                    disabled={!camposHabilitados}
                    className={`h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50 ${
                      formatacaoAtiva.lista ? "bg-indigo-600/30 text-indigo-300" : ""
                    }`}
                    title="Lista"
                  >
                    <List className="w-4 h-4" />
                  </Button>

                  {/* Botão de Emoji */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!camposHabilitados}
                        className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50"
                        title="Inserir Emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-2 bg-slate-800 border border-slate-700 rounded-md shadow-lg"
                      align="start"
                    >
                      <div className="grid grid-cols-8 gap-1">
                        {commonEmojis.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => inserirEmoji(emoji)}
                            className="w-7 h-7 flex items-center justify-center text-lg hover:bg-slate-700/50 rounded"
                            title={`Emoji ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Botão de Link */}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!camposHabilitados}
                    onClick={handleOpenLinkDialog}
                    className={`h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700/50 ${
                      formatacaoAtiva.link ? "bg-indigo-600/30 text-indigo-300" : ""
                    }`}
                    title="Inserir Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>

                  {/* Dialog de Link */}
                  <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                    <DialogContent className="bg-slate-800 border border-slate-700 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Inserir Link Externo
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="link-url" className="text-slate-300">
                            URL do Link *
                          </Label>
                          <Input
                            id="link-url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://exemplo.com"
                            className="bg-slate-700/50 border-slate-600 focus:border-indigo-500/50 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="link-texto" className="text-slate-300">
                            Texto do Link (opcional)
                          </Label>
                          <Input
                            id="link-texto"
                            value={linkTexto}
                            onChange={(e) => setLinkTexto(e.target.value)}
                            placeholder="Clique aqui"
                            className="bg-slate-700/50 border-slate-600 focus:border-indigo-500/50 text-white"
                          />
                          <p className="text-slate-400 text-xs">
                            {selectionText
                              ? `Texto selecionado: "${selectionText}" será usado como texto do link.`
                              : "Nenhum texto selecionado. O texto acima será usado para o link."}
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setLinkDialogOpen(false)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={inserirLink}
                          disabled={!linkUrl.trim()}
                          className="bg-indigo-600/90 hover:bg-indigo-600 text-white"
                        >
                          Inserir Link
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Editor */}
                <div
                  ref={editorRef}
                  contentEditable={camposHabilitados}
                  onInput={handleEditorChange}
                  onFocus={verificarFormatacaoAtiva}
                  onBlur={verificarFormatacaoAtiva}
                  dangerouslySetInnerHTML={{ __html: formData.conteudo }}
                  className={`min-h-[150px] max-h-[300px] overflow-y-auto p-4 bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    !camposHabilitados ? "opacity-50 cursor-not-allowed" : "cursor-text"
                  }`}
                  data-placeholder="Digite o resumo do conteúdo da aula..."
                />

                <style jsx>{`
                  [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #64748b;
                    pointer-events: none;
                  }
                  [contenteditable] h3 {
                    font-size: 1.25rem;
                    font-weight: bold;
                    margin: 0.5rem 0;
                  }
                  [contenteditable] ul {
                    margin: 0.5rem 0;
                    padding-left: 1.5rem;
                  }
                  [contenteditable] li {
                    margin: 0.25rem 0;
                  }
                  [contenteditable] a {
                    color: #93c5fd;
                    text-decoration: underline;
                  }
                `}</style>
              </div>

              {/* Upload de Arquivo */}
              {(formData.tipo === "video" || formData.tipo === "texto") && camposHabilitados && (
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    {formData.tipo === "video" ? "Vídeo da Aula" : "Arquivo PDF"}
                  </Label>
                  <div className="space-y-4">
                    {filePreview ? (
                      <div className="relative">
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm">{formData.tipo === "video" ? "🎥" : "📄"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {selectedFile ? selectedFile.name : filePreview}
                            </p>
                            <p className="text-slate-400 text-xs">
                              {formData.tipo === "video" ? "Vídeo selecionado" : "PDF selecionado"}
                            </p>
                            {selectedFile && (
                              <p className="text-slate-500 text-xs">
                                Tamanho: {formatarTamanhoArquivo(selectedFile.size)}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={removeFile}
                            disabled={uploadingFile}
                            className="w-8 h-8 p-0 bg-red-600 hover:bg-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center bg-slate-800/30">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm mb-1">
                          {formData.tipo === "video" ? "Selecionar vídeo" : "Selecionar PDF"}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {formData.tipo === "video"
                            ? "MP4, AVI, MOV, WMV, WebM, MKV (máx. 3GB para dev)"
                            : "Apenas arquivos PDF (máx. 3GB)"}
                        </p>
                        <p className="text-emerald-400 text-xs mt-1">✨ Envio rápido e seguro!</p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept={formData.tipo === "video" ? "video/*" : "application/pdf"}
                      onChange={handleFileChange}
                      disabled={uploadingFile}
                      className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white file:bg-slate-700 file:text-white file:border-0"
                    />
                  </div>
                </div>
              )}

              {/* Duração */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duração da Aula
                </Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="horas" className="text-xs text-slate-400">
                      Horas
                    </Label>
                    <Input
                      id="horas"
                      type="number"
                      min="0"
                      max="999"
                      value={formData.duracao_horas}
                      onChange={(e) => setFormData({ ...formData, duracao_horas: e.target.value })}
                      placeholder="0"
                      disabled={!camposHabilitados}
                      className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white disabled:opacity-50"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="minutos" className="text-xs text-slate-400">
                      Minutos
                    </Label>
                    <Input
                      id="minutos"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.duracao_minutos}
                      onChange={(e) => setFormData({ ...formData, duracao_minutos: e.target.value })}
                      placeholder="0"
                      disabled={!camposHabilitados}
                      className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-medium">Aula Ativa</Label>
                  <p className="text-slate-400 text-sm">A aula ficará visível para os alunos</p>
                </div>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  disabled={!camposHabilitados}
                  className="data-[state=checked]:bg-indigo-600 disabled:opacity-50"
                />
              </div>

              {/* Aula Privada */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-medium">Aula Privada</Label>
                  <p className="text-slate-400 text-sm">Visível apenas para quem tiver permissão</p>
                </div>
                <Switch
                  checked={formData.privada}
                  onCheckedChange={(checked) => setFormData({ ...formData, privada: checked })}
                  disabled={!camposHabilitados}
                  className="data-[state=checked]:bg-indigo-600 disabled:opacity-50"
                />
              </div>

              {/* Aula Ao Vivo */}
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div>
                  <Label className="text-slate-300 font-medium">Aula Ao Vivo</Label>
                  <p className="text-slate-400 text-sm">Marque se esta aula será transmitida ao vivo</p>
                </div>
                <Switch
                  checked={formData.ao_vivo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ao_vivo: checked })}
                  disabled={!camposHabilitados}
                  className="data-[state=checked]:bg-indigo-600 disabled:opacity-50"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  onClick={() => router.push("/minhas-aulas")}
                  disabled={uploadingFile}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || uploadingFile || !camposHabilitados}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : uploadingFile ? "Enviando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
              </div>
            </TabsContent>

            {/* Aba de Permissões */}
            {exibirPermissoes && (
              <TabsContent value="permissoes" className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl text-white flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-indigo-400" />
                      Gerenciar Permissões da Aula
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Gerencie quem pode acessar esta aula específica. As permissões aqui são apenas para esta aula.
                    </p>
                  </div>

                  {loadingPermissoes ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                    </div>
                  ) : permissoes ? (
                    <div className="space-y-6">
                      {/* Estatísticas */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-green-400" />
                            <span className="text-slate-300 text-sm">Com Acesso</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{permissoes.estatisticas.total_com_acesso}</div>
                        </div>
                        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-yellow-400" />
                            <span className="text-slate-300 text-sm">Sem Acesso</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{permissoes.estatisticas.total_sem_acesso}</div>
                        </div>
                        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-slate-300 text-sm">Convites Específicos</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{permissoes.estatisticas.convites_especificos}</div>
                        </div>
                      </div>

                      {/* Alunos com Acesso */}
                      {permissoes.alunos_com_acesso.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-green-400" />
                            Alunos com Acesso ({permissoes.alunos_com_acesso.length})
                          </h4>
                          <div className="space-y-2">
                            {permissoes.alunos_com_acesso.map((aluno: any) => (
                              <div key={aluno.aluno_id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">
                                      {aluno.nome.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{aluno.nome}</div>
                                    <div className="text-slate-400 text-sm">{aluno.email}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    aluno.tipo_acesso === 'convidado_curso' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {aluno.tipo_acesso === 'convidado_curso' ? 'Acesso Total' : 'Convite Específico'}
                                  </span>
                                  {aluno.tipo_acesso !== 'convidado_curso' && (
                                    <Button
                                      onClick={() => handleRemoverPermissao(aluno.aluno_id)}
                                      size="sm"
                                      variant="outline"
                                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                                    >
                                      Remover
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alunos sem Acesso */}
                      {permissoes.alunos_sem_acesso.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-yellow-400" />
                            Alunos sem Acesso ({permissoes.alunos_sem_acesso.length})
                          </h4>
                          <div className="space-y-2">
                            {permissoes.alunos_sem_acesso.map((aluno: any) => (
                              <div key={aluno.aluno_id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-slate-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">
                                      {aluno.nome.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{aluno.nome}</div>
                                    <div className="text-slate-400 text-sm">{aluno.email}</div>
                                    <div className="text-slate-500 text-xs">
                                      Progresso: {aluno.progresso_percentual}%
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => handleAdicionarPermissao(aluno)}
                                  size="sm"
                                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  Conceder Acesso
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mensagem quando não há alunos */}
                      {permissoes.alunos_sem_acesso.length === 0 && permissoes.alunos_com_acesso.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                          <h4 className="text-slate-400 font-medium mb-2">Nenhum aluno matriculado</h4>
                          <p className="text-slate-500 text-sm">
                            Não há alunos matriculados neste curso ainda.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <h4 className="text-slate-400 font-medium mb-2">Erro ao carregar permissões</h4>
                      <p className="text-slate-500 text-sm">
                        Não foi possível carregar as informações de permissões.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Modal de Adicionar Permissão */}
        {modalPermissaoOpen && alunoSelecionado && permissoes && (
          <ModalAdicionarPermissao
            isOpen={modalPermissaoOpen}
            onClose={() => setModalPermissaoOpen(false)}
            aula={{
              id: permissoes.aula.id,
              titulo: permissoes.aula.titulo,
              privada: permissoes.aula.privada,
              ao_vivo: permissoes.aula.ao_vivo
            }}
            aluno={{
              id: alunoSelecionado.id,
              aluno_id: alunoSelecionado.aluno_id,
              nome: alunoSelecionado.nome,
              email: alunoSelecionado.email,
              data_matricula: alunoSelecionado.data_matricula,
              progresso_percentual: alunoSelecionado.progresso_percentual
            }}
            onPermissaoConcedida={onPermissaoConcedida}
          />
        )}
      </div>
    </div>
  )
}

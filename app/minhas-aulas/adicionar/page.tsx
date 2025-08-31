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
  criarAula,
  criarModulo,
  buscarCursosDoInstrutor,
  buscarModulosDoCurso,
  uploadVideoMinio,
  uploadPdfMinio,
} from "../actions"
import type { AulaData, ModuloData } from "../actions"
import { getCurrentClientUser, getCurrentClientUserAsync } from "@/lib/auth-client"
import { useToast } from "@/hooks/use-toast"
import { formatarTamanhoArquivo } from "@/lib/utils-arquivo"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useUpload } from "@/hooks/use-upload"
import { UploadProgressInline, UploadSuccessCard } from "@/components/upload-progress"
import { SessionStatus, SessionStatusIcon } from "@/components/session-status"

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

export default function AdicionarAulaPage() {
  const [loading, setLoading] = useState(false)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [loadingModulos, setLoadingModulos] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Estados para upload com progresso
  const [showSuccessCard, setShowSuccessCard] = useState(false)
  const [aulaCreated, setAulaCreated] = useState<string>("")

  // Navegação
  const router = useRouter()

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

  // Ref para o editor de conteúdo
  const editorRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)

  const { toast } = useToast()

  // Hook de upload com progresso
  const upload = useUpload({
    onSuccess: (url) => {
      console.log("✅ Upload concluído:", url)
      toast({
        variant: "success",
        title: "✅ Upload concluído!",
        description: "Arquivo enviado com sucesso",
      })
    },
    onError: (error) => {
      console.error("❌ Erro no upload:", error)
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error,
      })
    },
    onSessionRenewed: (renewalTime) => {
      console.log("🔄 Sessão renovada durante upload:", renewalTime)
      toast({
        variant: "default",
        title: "🔄 Sessão renovada",
        description: "Sua sessão foi renovada automaticamente durante o upload",
      })
    },
    onSessionError: (error) => {
      console.error("❌ Erro na sessão durante upload:", error)
      toast({
        variant: "destructive",
        title: "⚠️ Problema na sessão",
        description: `Erro na renovação da sessão: ${error}. O upload continuará, mas você pode precisar fazer login novamente.`,
      })
    }
  })

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
  })

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
      setFormData((prev) => ({ ...prev, modulo_id: "" }))
      setModuloSelecionado(false)
    }
  }, [formData.curso_id])

  // Verificar se módulo foi selecionado
  useEffect(() => {
    setModuloSelecionado(!!formData.modulo_id)
  }, [formData.modulo_id])

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

  const carregarCursos = async () => {
    setLoadingCursos(true)
    try {
      const currentUser = await getCurrentClientUserAsync()
      if (!currentUser?.uid) {
        console.log("Usuário não autenticado, não é possível carregar cursos")
        return
      }

      const result = await buscarCursosDoInstrutor(currentUser.uid)
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
    setLoadingModulos(true)
    try {
      const currentUser = await getCurrentClientUserAsync()
      if (!currentUser?.uid) {
        console.log("Usuário não autenticado, não é possível carregar módulos")
        return
      }

      const result = await buscarModulosDoCurso(cursoId, currentUser.uid)
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

    setCriandoModulo(true)
    try {
      const currentUser = await getCurrentClientUserAsync()
      if (!currentUser?.uid) {
        console.log("Usuário não autenticado, não é possível criar módulo")
        return
      }

      // Calcular próxima ordem
      const proximaOrdem = modulos.length + 1

      const moduloData: ModuloData = {
        curso_id: formData.curso_id,
        titulo: novoModulo.trim(),
        descricao: "",
        ordem: proximaOrdem,
        ativo: true,
      }

      const result = await criarModulo(moduloData, currentUser.uid)

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
      const currentUser = await getCurrentClientUserAsync()
      if (!currentUser?.uid) {
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

      let mediaUrl: string | undefined

      // Upload do arquivo se houver
      if (selectedFile) {
        const fileSize = (selectedFile.size / 1024 / 1024).toFixed(2)

        toast({
          title: "📤 Iniciando upload...",
          description: `Preparando arquivo de ${fileSize}MB`,
        })

        // Upload com progresso usando o hook
        const uploadType = formData.tipo === "video" ? "video" : "file"
        mediaUrl = await upload.upload(selectedFile, currentUser.uid, uploadType)
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


      const result = await criarAula(aulaData, currentUser.uid)

      if (result.success) {
        // Mostrar card de sucesso
        setAulaCreated(formData.titulo.trim())
        setShowSuccessCard(true)
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao criar aula",
          description: result.message || "Erro inesperado",
        })
      }
    } catch (error) {
      console.error("Erro:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Erro inesperado ao criar aula",
      })
    } finally {
      setLoading(false)
    }
  }

  // Verificar se os campos devem estar habilitados
  const camposHabilitados = moduloSelecionado && !upload.isUploading && !loading

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
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

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Adicionar Nova Aula
            </h1>
            <SessionStatusIcon className="mt-1" />
          </div>
          <p className="text-slate-400 mt-2">Crie uma nova aula para seus cursos</p>
        </div>

        {/* Formulário */}
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-slate-800/95 to-gray-900/95 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-indigo-400" />
              Informações da Aula
            </CardTitle>
          </CardHeader>

          <CardContent>
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
                  className={`min-h-[150px] p-4 bg-slate-800/50 border border-slate-700 border-t-0 rounded-b-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    !camposHabilitados ? "opacity-50 cursor-not-allowed" : "cursor-text"
                  }`}
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                  suppressContentEditableWarning={true}
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
                            disabled={upload.isUploading}
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
                      disabled={upload.isUploading}
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

              {/* Componente de progresso de upload */}
              {selectedFile && (upload.isUploading || upload.progress || upload.error) && (
                <UploadProgressInline
                  isUploading={upload.isUploading}
                  progress={upload.progress}
                  fileName={selectedFile.name}
                  error={upload.error}
                />
              )}

              {/* Status da sessão durante upload */}
              {upload.isUploading && (
                <SessionStatus 
                  className="mt-2"
                  showDetails={true}
                />
              )}

              {/* Botões */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  onClick={() => router.push("/minhas-aulas")}
                  disabled={upload.isUploading || loading}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || upload.isUploading || !camposHabilitados}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {loading ? "Criando aula..." : upload.isUploading ? "Enviando..." : "Criar Aula"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Card de sucesso */}
      {showSuccessCard && (
        <UploadSuccessCard
          aulaTitle={aulaCreated}
          onVoltar={() => {
            setShowSuccessCard(false)
            router.push("/minhas-aulas")
          }}
        />
      )}
    </div>
  )
}

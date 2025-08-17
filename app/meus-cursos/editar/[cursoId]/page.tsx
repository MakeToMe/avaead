"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Upload, X, Clock, Edit3, Users } from "lucide-react"
import { editarCurso, buscarCursoPorId, uploadImagemMinio } from "../../actions"
import type { CursoData } from "../../actions"
import { getCurrentClientUser } from "@/lib/auth-client"
import { useToast } from "@/hooks/use-toast"
import { GerenciarAlunos } from "@/components/dashboard-instrutor/GerenciarAlunos"

export default function EditarCursoPage() {
  const router = useRouter()
  const params = useParams()
  const cursoId = params.cursoId as string
  const [loading, setLoading] = useState(false)
  const [loadingCurso, setLoadingCurso] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    nivel: "" as "iniciante" | "intermediario" | "avancado" | "",
    ativo: true,
    duracao_horas: "",
    duracao_minutos: "",
    imagem_url: "",
  })

  // Carregar dados do curso quando a página carregar
  useEffect(() => {
    carregarDadosCurso()
  }, [cursoId])

  const carregarDadosCurso = async () => {
    const currentUser = getCurrentClientUser()
    if (!currentUser?.uid) return

    setLoadingCurso(true)
    try {
      const result = await buscarCursoPorId(cursoId, currentUser.uid)
      if (result.success && result.data) {
        const curso = result.data

        // Calcular horas e minutos da duração
        const duracaoHoras = curso.duracao_total ? Math.floor(curso.duracao_total / 60).toString() : ""
        const duracaoMinutos = curso.duracao_total ? (curso.duracao_total % 60).toString() : ""

        setFormData({
          titulo: curso.titulo,
          descricao: curso.descricao || "",
          nivel: curso.nivel,
          ativo: curso.ativo,
          duracao_horas: duracaoHoras,
          duracao_minutos: duracaoMinutos,
          imagem_url: curso.imagem_url || "",
        })

        // Se há imagem, mostrar preview
        if (curso.imagem_url) {
          setImagePreview(curso.imagem_url)
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao carregar curso",
          description: result.message || "Curso não encontrado",
        })
        router.push("/meus-cursos")
      }
    } catch (error) {
      console.error("Erro ao carregar curso:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Erro inesperado ao carregar curso",
      })
    } finally {
      setLoadingCurso(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Verificar tipo de arquivo
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast({
          variant: "destructive",
          title: "Erro no arquivo",
          description: "Por favor, selecione uma imagem válida (JPG, PNG ou WebP)",
        })
        return
      }

      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB",
        })
        return
      }

      setImageFile(file)

      // Criar preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData((prev) => ({ ...prev, imagem_url: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Pegar o usuário atual
      const currentUser = getCurrentClientUser()
      if (!currentUser?.uid) {
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Usuário não identificado",
        })
        return
      }

      // Validações
      if (!formData.titulo.trim()) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Título é obrigatório",
        })
        return
      }

      if (!formData.descricao.trim()) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Descrição é obrigatória",
        })
        return
      }

      if (!formData.nivel) {
        toast({
          variant: "destructive",
          title: "Campo obrigatório",
          description: "Nível é obrigatório",
        })
        return
      }

      let imageUrl: string | undefined = formData.imagem_url

      // Upload da imagem se houver uma nova
      if (imageFile) {
        setUploadingImage(true)

        const uploadResult = await uploadImagemMinio(imageFile, currentUser.uid)
        setUploadingImage(false)

        if (!uploadResult.success) {
          toast({
            variant: "destructive",
            title: "Erro no upload",
            description: uploadResult.message || "Erro ao fazer upload da imagem",
          })
          return
        }

        imageUrl = uploadResult.url
      }

      // Calcular duração total em minutos
      let duracaoTotal: number | undefined
      if (formData.duracao_horas || formData.duracao_minutos) {
        const horas = Number.parseInt(formData.duracao_horas) || 0
        const minutos = Number.parseInt(formData.duracao_minutos) || 0
        duracaoTotal = horas * 60 + minutos
      }

      // Editar curso
      const cursoData: CursoData = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        nivel: formData.nivel,
        ativo: formData.ativo,
        imagem_url: imageUrl,
        duracao_total: duracaoTotal,
        instrutor_id: currentUser.uid,
      }

      const result = await editarCurso(cursoId, cursoData)

      if (result.success) {
        toast({
          variant: "success",
          title: "✅ Sucesso!",
          description: "Curso editado com sucesso!",
        })
        router.push("/meus-cursos")
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao editar curso",
          description: result.message || "Erro inesperado",
        })
      }
    } catch (error) {
      console.error("Erro:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Erro inesperado ao editar curso",
      })
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  if (loadingCurso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando curso...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Edit3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                Editar Curso
              </h1>
              <p className="text-slate-400 text-lg mt-1">Edite as informações do seu curso</p>
            </div>
          </div>
        </div>

        {/* Tabs para Edição e Gerenciamento */}
        <div className="bg-gradient-to-br from-slate-800/40 to-gray-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
          <Tabs defaultValue="editar" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-b border-slate-700/50">
              <TabsTrigger 
                value="editar" 
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar Curso
              </TabsTrigger>
              <TabsTrigger 
                value="alunos"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Alunos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editar" className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-slate-300">
                Título do Curso *
              </Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Curso de React Avançado"
                className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white"
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-slate-300">
                Descrição *
              </Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o que os alunos vão aprender neste curso..."
                className="min-h-[100px] bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white"
                required
              />
            </div>

            {/* Nível */}
            <div className="space-y-2">
              <Label className="text-slate-300">Nível *</Label>
              <Select value={formData.nivel} onValueChange={(value: any) => setFormData({ ...formData, nivel: value })}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800/95 border-slate-700 text-white backdrop-blur-sm">
                  <SelectItem value="iniciante" className="focus:bg-slate-700/80 focus:text-white">
                    Iniciante
                  </SelectItem>
                  <SelectItem value="intermediario" className="focus:bg-slate-700/80 focus:text-white">
                    Intermediário
                  </SelectItem>
                  <SelectItem value="avancado" className="focus:bg-slate-700/80 focus:text-white">
                    Avançado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duração Estimada
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
                    className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white"
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
                    className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Imagem de Capa */}
            <div className="space-y-2">
              <Label className="text-slate-300">Imagem de Capa (16:9)</Label>
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <div className="aspect-[16/9] h-32 w-full rounded-lg overflow-hidden bg-slate-700">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-6 h-6 p-0 bg-red-600 hover:bg-red-700"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-[16/9] h-32 w-full border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center bg-slate-800/30">
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-slate-400 text-xs">Selecionar imagem</p>
                      <p className="text-slate-500 text-xs">JPG, PNG, WebP</p>
                    </div>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="bg-slate-800/50 border-slate-700 focus:border-indigo-500/50 text-white file:bg-slate-700 file:text-white file:border-0"
                />
              </div>
            </div>

            {/* Status Ativo */}
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div>
                <Label className="text-slate-300 font-medium">Curso Ativo</Label>
                <p className="text-slate-400 text-sm">O curso ficará visível para os alunos</p>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || uploadingImage}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
              >
                {loading ? "Salvando..." : uploadingImage ? "Enviando imagem..." : "Salvar Alterações"}
              </Button>
            </div>
              </form>
            </TabsContent>

            <TabsContent value="alunos" className="p-8">
              <GerenciarAlunos cursoId={cursoId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

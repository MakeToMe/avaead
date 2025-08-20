"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, Camera, Loader2 } from "lucide-react"
import { uploadProfilePhoto } from "../actions"
import { useToast } from "@/hooks/use-toast"

interface ModalUploadFotoProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onSuccess: (url: string) => void
}

export default function ModalUploadFoto({ isOpen, onClose, userId, onSuccess }: ModalUploadFotoProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = (file: File) => {
    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas imagens (PNG, JPG, JPEG).",
      })
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Imagem muito grande",
        description: "A imagem deve ter no máximo 5MB.",
      })
      return
    }

    setSelectedFile(file)

    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      // Notificar início
      const sizeMb = (selectedFile.size / 1024 / 1024).toFixed(2)
      toast({
        title: "📤 Iniciando upload...",
        description: `Enviando imagem de ${sizeMb}MB`,
      })

      const result = await uploadProfilePhoto(userId, selectedFile)

      if (result.success) {
        onSuccess(result.url!)
        handleClose()
        toast({
          variant: "success",
          title: "✅ Foto atualizada!",
          description: "Sua foto de perfil foi enviada com sucesso.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: result.error || "Não foi possível enviar a foto.",
        })
      }
    } catch (error) {
      console.error("Erro no upload:", error)
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro ao enviar a foto.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreview(null)
    setDragActive(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gradient-to-br from-slate-800/95 to-gray-900/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Foto do Perfil</h2>
                <p className="text-sm text-slate-400">Atualize sua foto de perfil</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-600 hover:border-slate-500"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="space-y-4">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-slate-600">
                    <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedFile?.name}</p>
                    <p className="text-slate-400 text-sm">
                      {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreview(null)
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                  >
                    Escolher outra foto
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-slate-700 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Arraste uma imagem aqui ou clique para selecionar</p>
                    <p className="text-slate-400 text-sm">PNG, JPG ou JPEG até 5MB</p>
                  </div>
                  <Label htmlFor="file-upload">
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                      asChild
                    >
                      <span className="cursor-pointer">
                        <Camera className="w-4 h-4 mr-2" />
                        Selecionar Foto
                      </span>
                    </Button>
                  </Label>
                  <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Salvar Foto
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

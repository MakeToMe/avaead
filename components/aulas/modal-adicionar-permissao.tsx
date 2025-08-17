"use client"

import { useState } from "react"
import { X, User, Shield, Eye, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Aluno {
  id: string
  aluno_id: string
  nome: string
  email: string
  data_matricula: string
  progresso_percentual: number
}

interface Aula {
  id: string
  titulo: string
  privada: boolean
  ao_vivo: boolean
}

interface ModalAdicionarPermissaoProps {
  isOpen: boolean
  onClose: () => void
  aula: Aula
  aluno: Aluno
  onPermissaoConcedida: () => void
}

type TipoPermissao = 'acesso_privada' | 'acesso_ao_vivo' | 'acesso_completo'

export function ModalAdicionarPermissao({
  isOpen,
  onClose,
  aula,
  aluno,
  onPermissaoConcedida
}: ModalAdicionarPermissaoProps) {
  // Definir permissão padrão baseada no tipo da aula
  const getPermissaoPadrao = (): TipoPermissao => {
    if (aula.privada && aula.ao_vivo) {
      return 'acesso_completo'
    } else if (aula.privada) {
      return 'acesso_privada'
    } else if (aula.ao_vivo) {
      return 'acesso_ao_vivo'
    }
    return 'acesso_completo'
  }

  const [tipoPermissao, setTipoPermissao] = useState<TipoPermissao>(getPermissaoPadrao())
  const [carregando, setCarregando] = useState(false)
  const { toast } = useToast()

  if (!isOpen) return null

  const handleConcederPermissao = async () => {
    setCarregando(true)
    
    try {
      const response = await fetch(`/api/aulas/${aula.id}/permissoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aluno_id: aluno.aluno_id,
          tipo_permissao: tipoPermissao
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Permissão Concedida",
          description: `${aluno.nome} agora tem ${getDescricaoPermissao(tipoPermissao)} para esta aula.`,
        })
        onPermissaoConcedida()
        onClose()
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao Conceder Permissão",
          description: result.error || 'Erro desconhecido',
        })
      }
    } catch (error) {
      console.error('Erro:', error)
      toast({
        variant: "destructive",
        title: "Erro",
        description: 'Erro ao conectar com o servidor',
      })
    } finally {
      setCarregando(false)
    }
  }

  const getDescricaoPermissao = (tipo: TipoPermissao) => {
    switch (tipo) {
      case 'acesso_privada':
        return 'Permite assistir apenas aulas marcadas como privadas'
      case 'acesso_ao_vivo':
        return 'Permite assistir apenas aulas ao vivo (transmissões)'
      case 'acesso_completo':
        return 'Permite assistir tanto aulas privadas quanto ao vivo'
    }
  }

  const getIconePermissao = (tipo: TipoPermissao) => {
    switch (tipo) {
      case 'acesso_privada':
        return <Shield className="w-5 h-5 text-blue-500" />
      case 'acesso_ao_vivo':
        return <Zap className="w-5 h-5 text-red-500" />
      case 'acesso_completo':
        return <Eye className="w-5 h-5 text-green-500" />
    }
  }

  // Determinar opções disponíveis baseado no tipo da aula
  const opcoesDisponiveis = () => {
    const opcoes: TipoPermissao[] = []
    
    if (aula.privada) {
      opcoes.push('acesso_privada')
    }
    
    if (aula.ao_vivo) {
      opcoes.push('acesso_ao_vivo')
    }
    
    if (aula.privada && aula.ao_vivo) {
      opcoes.push('acesso_completo')
    }
    
    return opcoes
  }

  const opcoes = opcoesDisponiveis()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conceder Permissão de Acesso
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações do Aluno */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">{aluno.nome}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{aluno.email}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Progresso no curso: {aluno.progresso_percentual}%
            </p>
          </div>

          {/* Informações da Aula */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{aula.titulo}</h4>
            <div className="flex gap-2">
              {aula.privada && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                  🔒 Privada
                </span>
              )}
              {aula.ao_vivo && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200">
                  🔴 Ao Vivo
                </span>
              )}
            </div>
          </div>

          {/* Seleção de Tipo de Permissão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tipo de Permissão:
            </label>
            {opcoes.length === 1 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ℹ️ Esta aula permite apenas um tipo de acesso, então a permissão será automaticamente definida.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {opcoes.map((opcao) => (
                <label
                  key={opcao}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    tipoPermissao === opcao
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoPermissao"
                    value={opcao}
                    checked={tipoPermissao === opcao}
                    onChange={(e) => setTipoPermissao(e.target.value as TipoPermissao)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    {getIconePermissao(opcao)}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {opcao === 'acesso_privada' && 'Acesso a Aulas Privadas'}
                        {opcao === 'acesso_ao_vivo' && 'Acesso a Aulas Ao Vivo'}
                        {opcao === 'acesso_completo' && 'Acesso Completo'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {getDescricaoPermissao(opcao)}
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    tipoPermissao === opcao
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {tipoPermissao === opcao && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleConcederPermissao}
            disabled={carregando}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? 'Concedendo...' : 'Conceder Permissão'}
          </button>
        </div>
      </div>
    </div>
  )
}
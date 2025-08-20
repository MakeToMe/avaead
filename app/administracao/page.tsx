"use client"

import { useState, useEffect } from "react"
import { Search, Users, Shield, Mail, Phone, CheckCircle, XCircle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllUsers, updateUserProfile } from "./actions"
import { useAuthV2 as useAuth } from "@/contexts/auth-context-v2"

interface User {
  uid: string
  nome: string
  email: string
  cpf?: string
  whatsapp?: string
  perfis: string
  mail_valid: boolean
  wpp_valid: boolean
  photoUrl?: string
  url_foto?: string
  criado_em: string
}

interface Mensagem {
  tipo: "sucesso" | "erro"
  texto: string
}

export default function AdministracaoPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [updatingProfile, setUpdatingProfile] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const { user: currentUser } = useAuth()

  const usersPerPage = 10

  // Função para mostrar mensagem
  const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
    setMensagem({ tipo, texto })
    setTimeout(() => setMensagem(null), 5000)
  }

  // Carregar usuários
  const loadUsers = async () => {
    setLoading(true)
    try {
      if (!currentUser?.uid) {
        setUsers([])
        setTotalUsers(0)
        return
      }
      const result = await getAllUsers(currentPage, usersPerPage, search, currentUser.uid)
      setUsers(result.users)
      setTotalUsers(result.total)
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
      mostrarMensagem("erro", "Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [currentPage, search, currentUser?.uid])

  // Atualizar perfil do usuário
  const handleProfileChange = async (userId: string, newProfile: string) => {
    setUpdatingProfile(userId)
    try {
      const result = await updateUserProfile(userId, newProfile)
      if (result.success) {
        mostrarMensagem("sucesso", "Perfil atualizado com sucesso!")
        
        // Atualizar a lista local
        setUsers(users.map((user) => (user.uid === userId ? { ...user, perfis: newProfile } : user)))
        
        // Notificar UserStateManager para invalidar cache e atualizar sidebar
        console.log('🔄 Admin: Notificando UserStateManager sobre mudança de perfil', { userId, newProfile })
        
        // Importar dinamicamente para evitar dependência circular
        const { default: userStateManager } = await import("@/lib/user-state-manager")
        
        // Invalidar cache do usuário específico (se for o usuário atual)
        userStateManager.invalidateUserCache(userId)
        
        console.log('✅ Admin: UserStateManager notificado com sucesso')
      } else {
        mostrarMensagem("erro", result.error || "Erro ao atualizar perfil")
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      mostrarMensagem("erro", "Erro interno do servidor")
    } finally {
      setUpdatingProfile(null)
    }
  }

  const totalPages = Math.ceil(totalUsers / usersPerPage)

  return (
    <div className="p-6 space-y-6">
      {/* Alerta Customizado */}
      {mensagem && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
            mensagem.tipo === "sucesso"
              ? "bg-green-500/20 border-green-500/30 text-green-400"
              : "bg-red-500/20 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{mensagem.texto}</span>
            <button onClick={() => setMensagem(null)} className="ml-2 hover:opacity-70 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
            Administração
          </h1>
          <p className="text-slate-400">Gerencie usuários e permissões da plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total de Usuários</p>
                <p className="text-2xl font-bold text-white">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Administradores</p>
                <p className="text-2xl font-bold text-white">{users.filter((u) => u.perfis === "admin").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Instrutores</p>
                <p className="text-2xl font-bold text-white">{users.filter((u) => u.perfis === "instrutor").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Alunos</p>
                <p className="text-2xl font-bold text-white">{users.filter((u) => u.perfis === "aluno").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-indigo-500"
              />
            </div>
            <Button onClick={loadUsers} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-indigo-400" />
            Usuários ({totalUsers})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Usuário</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-300">CPF</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Contatos</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Perfil</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-300">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.uid} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      {/* Usuário */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.photoUrl ? (
                              <img
                                src={user.photoUrl || "/placeholder.svg"}
                                alt={user.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-sm">
                                {user.nome?.charAt(0).toUpperCase() || "?"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.nome}</p>
                            <p className="text-sm text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="py-4 px-4">
                        {user.cpf ? (
                          <span className="text-slate-300">{user.cpf}</span>
                        ) : (
                          <span className="text-slate-500 italic">Não informado</span>
                        )}
                      </td>

                      {/* Contatos */}
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          {/* Email */}
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {user.mail_valid ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-sm text-slate-300 truncate max-w-[150px]">{user.email}</span>
                          </div>
                          {/* WhatsApp */}
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {user.whatsapp ? (
                              <>
                                {user.wpp_valid ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className="text-sm text-slate-300">{user.whatsapp}</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-500 italic">Não informado</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="py-4 px-4">
                        <Select
                          value={user.perfis}
                          onValueChange={(value) => handleProfileChange(user.uid, value)}
                          disabled={updatingProfile === user.uid}
                        >
                          <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600/50 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="aluno" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                              Aluno
                            </SelectItem>
                            <SelectItem value="instrutor" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                              Instrutor
                            </SelectItem>
                            <SelectItem value="admin" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                              Admin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-400">
                          {new Date(user.criado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-sm text-slate-400">
                Mostrando {(currentPage - 1) * usersPerPage + 1} a {Math.min(currentPage * usersPerPage, totalUsers)} de{" "}
                {totalUsers} usuários
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 bg-slate-800/50"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 bg-slate-800/50"
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

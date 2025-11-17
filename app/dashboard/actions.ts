"use server"

import { signOut as authSignOut } from "@/app/auth/actions"

// Re-export como função async para compatibilidade com "use server"
export async function signOut() {
  return await authSignOut()
}

// TODO: Converter para PostgreSQL - temporariamente desabilitado
export async function getUserFreshData(userId: string) {
  try {
    console.log("getUserFreshData temporariamente desabilitado para:", userId)
    return null
  } catch (error) {
    console.error("Erro na função getUserFreshData:", error)
    return null
  }
}

export async function getDashboardStats(userId: string) {
  try {
    // TODO: Implementar com PostgreSQL
    return {
      coursesCount: 0,
      certificatesCount: 0,
      recentActivities: [],
    }
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    return {
      coursesCount: 0,
      certificatesCount: 0,
      recentActivities: [],
    }
  }
}

// Função para registrar uma nova atividade
export async function registrarAtividade(
  userId: string,
  tipo: string,
  titulo: string,
  descricao: string,
  icone: string,
  corIcone: string,
  entidadeTipo: string,
  entidadeId: string,
  url: string,
  metadados: any = {},
) {
  try {
    // TODO: Implementar com PostgreSQL
    console.log("registrarAtividade temporariamente desabilitado")
    return { success: true, data: null }
  } catch (error) {
    console.error("Erro ao registrar atividade:", error)
    return { success: false, error }
  }
}

// Função para marcar atividades como visualizadas
export async function marcarAtividadesComoVisualizadas(userId: string) {
  try {
    // TODO: Implementar com PostgreSQL
    console.log("marcarAtividadesComoVisualizadas temporariamente desabilitado")
    return { success: true, data: null }
  } catch (error) {
    console.error("Erro ao marcar atividades como visualizadas:", error)
    return { success: false, error }
  }
}

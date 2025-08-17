import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProviderV2 } from "@/contexts/auth-context-v2"
import DashboardLayout from "@/components/dashboard-layout"
import { Toaster } from "@/components/ui/toaster"
import DebugLoader from "@/components/debug-loader"
import LogCleanupInit from "@/components/log-cleanup-init"
import "@/lib/logging-init" // Inicializar sistema de logging
import "@/lib/utils/simple-log-cleanup" // Configurar limpeza de logs
import "./globals.css"



const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: "Saber365",
  description: "Plataforma de cursos Saber365",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* CSS CIRÚRGICO - APENAS PARA CERTIFICADOS */}
        {/* Temporariamente desabilitado para debug de hidratação */}
      </head>
      <body className={`${inter.variable} font-sans`}>
        <AuthProviderV2>
          <DashboardLayout>{children}</DashboardLayout>
          <Toaster />
          {/* <DebugLoader /> */}
          <LogCleanupInit />
        </AuthProviderV2>
      </body>
    </html>
  )
}

"use client"

import { Clock, Video } from "lucide-react"
import { type AulaDetalhada } from "../actions"

interface CardAcessoNegadoProps {
  aula: AulaDetalhada
  motivo: string
}

export function CardAcessoNegado({ aula, motivo }: CardAcessoNegadoProps) {
  return (
    <div className="w-full aspect-video bg-gradient-to-br from-red-900/20 via-slate-900/50 to-red-900/20 rounded-lg border-2 border-red-500/30 flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">🔒 Aula Privada</h3>
          <h4 className="text-lg text-red-400 mb-4">{aula.titulo}</h4>
        </div>
        
        <div className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            {motivo}
          </p>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h5 className="font-medium text-white mb-2">Como obter acesso:</h5>
            <ul className="text-sm text-slate-400 space-y-1 text-left">
              <li>• Entre em contato com o instrutor do curso</li>
              <li>• Solicite permissão específica para esta aula</li>
              <li>• Verifique se você tem o tipo de matrícula adequado</li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(aula.duracao / 60)}:{(aula.duracao % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span>Vídeo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
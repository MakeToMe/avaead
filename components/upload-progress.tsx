/**
 * Componentes visuais para progresso de upload
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Upload, AlertCircle, ArrowLeft } from 'lucide-react'
import { formatSpeed, formatTimeRemaining, formatFileSize, type RealUploadProgress } from '@/lib/upload-with-real-progress'

export interface UploadProgressInlineProps {
  isUploading: boolean
  progress: RealUploadProgress | null
  fileName: string
  error: string | null
}

/**
 * Componente inline de progresso de upload
 * Exibe barra de progresso verde translúcida com detalhes
 */
export function UploadProgressInline({ 
  isUploading, 
  progress, 
  fileName, 
  error 
}: UploadProgressInlineProps) {
  if (!isUploading && !progress && !error) {
    return null
  }

  return (
    <div className="mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
      {/* Header com ícone e nome do arquivo */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
          {error ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : progress?.percentage === 100 ? (
            <CheckCircle className="w-4 h-4 text-white" />
          ) : (
            <Upload className="w-4 h-4 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{fileName}</p>
          <p className="text-slate-400 text-xs">
            {error ? 'Erro no upload' : progress?.stage || 'Preparando...'}
          </p>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Progresso */}
      {progress && !error && (
        <div className="space-y-3">
          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-green-400 text-sm font-medium">
                {progress.percentage}%
              </span>
              <span className="text-slate-400 text-xs">
                {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
              </span>
            </div>
            
            {/* Barra verde translúcida */}
            <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500/80 to-emerald-500/80 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Detalhes de velocidade e tempo */}
          {progress.speed > 0 && progress.timeRemaining > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Velocidade: <span className="text-green-400">{formatSpeed(progress.speed)}</span>
              </span>
              <span className="text-slate-400">
                Restante: <span className="text-green-400">{formatTimeRemaining(progress.timeRemaining)}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export interface UploadSuccessCardProps {
  aulaTitle: string
  onVoltar: () => void
}

/**
 * Card de sucesso após upload e criação da aula
 */
export function UploadSuccessCard({ aulaTitle, onVoltar }: UploadSuccessCardProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full bg-gradient-to-br from-slate-800/95 to-gray-900/95 border-slate-700/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl text-white">
            ✅ Aula Criada com Sucesso!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <p className="text-slate-300 text-sm mb-1">Aula criada:</p>
            <p className="text-white font-medium">{aulaTitle}</p>
          </div>
          
          <p className="text-slate-400 text-sm">
            Sua aula foi criada e está disponível para os alunos!
          </p>
          
          <Button
            onClick={onVoltar}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Minhas Aulas
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Componente de progresso compacto para uso em outros lugares
 */
export interface UploadProgressCompactProps {
  progress: RealUploadProgress
  className?: string
}

export function UploadProgressCompact({ progress, className = '' }: UploadProgressCompactProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-500/80 to-emerald-500/80 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <span className="text-green-400 text-xs font-medium min-w-[3rem]">
        {progress.percentage}%
      </span>
    </div>
  )
}
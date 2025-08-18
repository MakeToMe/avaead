/**
 * Utilitário para upload de arquivos com progresso em tempo real
 * Usa XMLHttpRequest para capturar eventos de progresso
 */

export interface UploadProgress {
  loaded: number // bytes carregados
  total: number // total de bytes
  percentage: number // porcentagem (0-100)
  speed: number // velocidade em bytes/segundo
  timeRemaining: number // tempo restante em segundos
  stage: string // estágio atual do upload
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
}

/**
 * Faz upload de arquivo com progresso em tempo real
 */
export async function uploadWithProgress(
  url: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    // Variáveis para cálculo de velocidade
    let startTime = Date.now()
    let lastTime = startTime
    let lastLoaded = 0
    const speedSamples: number[] = []
    const maxSamples = 10 // Manter últimas 10 amostras para suavizar velocidade

    // Configurar timeout (5 minutos)
    xhr.timeout = 5 * 60 * 1000

    // Event listener para progresso
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const now = Date.now()
        const timeDiff = (now - lastTime) / 1000 // segundos
        const loadedDiff = event.loaded - lastLoaded

        // Calcular velocidade instantânea
        let speed = 0
        if (timeDiff > 0) {
          const instantSpeed = loadedDiff / timeDiff
          speedSamples.push(instantSpeed)
          
          // Manter apenas as últimas amostras
          if (speedSamples.length > maxSamples) {
            speedSamples.shift()
          }
          
          // Calcular velocidade média das amostras
          speed = speedSamples.reduce((sum, s) => sum + s, 0) / speedSamples.length
        }

        // Calcular tempo restante
        const remaining = event.total - event.loaded
        const timeRemaining = speed > 0 ? remaining / speed : 0

        // Determinar estágio
        let stage = "Enviando arquivo..."
        if (event.loaded === event.total) {
          stage = "Processando..."
        } else if (event.loaded / event.total > 0.9) {
          stage = "Finalizando..."
        }

        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100 * 10) / 10, // 1 casa decimal
          speed,
          timeRemaining,
          stage
        }

        // Throttling: só atualizar a cada 100ms
        if (now - lastTime >= 100 || event.loaded === event.total) {
          options.onProgress?.(progress)
          lastTime = now
          lastLoaded = event.loaded
        }
      }
    })

    // Event listener para sucesso
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Para MinIO, a URL final é a mesma URL de upload (sem query params)
        const finalUrl = url.split('?')[0]
        options.onSuccess?.(finalUrl)
        resolve(finalUrl)
      } else {
        const error = `Upload falhou: ${xhr.status} ${xhr.statusText}`
        options.onError?.(error)
        reject(new Error(error))
      }
    })

    // Event listener para erro
    xhr.addEventListener('error', () => {
      const error = 'Erro de rede durante o upload'
      options.onError?.(error)
      reject(new Error(error))
    })

    // Event listener para timeout
    xhr.addEventListener('timeout', () => {
      const error = 'Upload cancelado por timeout (5 minutos)'
      options.onError?.(error)
      reject(new Error(error))
    })

    // Event listener para cancelamento
    xhr.addEventListener('abort', () => {
      const error = 'Upload cancelado pelo usuário'
      options.onError?.(error)
      reject(new Error(error))
    })

    // Configurar e enviar requisição
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.setRequestHeader('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD')
    
    // Enviar arquivo
    xhr.send(file)
  })
}

/**
 * Formatar velocidade para exibição
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'
  
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const k = 1024
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
  
  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

/**
 * Formatar tempo restante para exibição
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return 'Calculando...'
  
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.ceil(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

/**
 * Formatar tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}
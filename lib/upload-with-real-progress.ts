/**
 * Upload com progresso real usando XMLHttpRequest
 * Substitui a implementação fake por progresso real do MinIO
 */

export interface RealUploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number
  timeRemaining: number
  stage: string
}

export interface UploadOptions {
  onProgress?: (progress: RealUploadProgress) => void
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
  signal?: AbortSignal
}

/**
 * Calcula velocidade de upload em bytes/segundo
 */
function calculateSpeed(loaded: number, startTime: number): number {
  const elapsed = (Date.now() - startTime) / 1000 // segundos
  return elapsed > 0 ? loaded / elapsed : 0
}

/**
 * Formata velocidade para exibição
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'
  
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let size = bytesPerSecond
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Formata tempo restante para exibição
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '0s'
  
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Upload com progresso real usando XMLHttpRequest
 */
export function uploadWithRealProgress(
  file: File,
  uploadUrl: string,
  options: UploadOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const startTime = Date.now()
    let lastLoaded = 0
    let lastTime = startTime

    // Configurar headers
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.setRequestHeader('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD')

    // Evento de progresso do upload
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return

      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000 // segundos
      const loadedDiff = event.loaded - lastLoaded

      // Calcular velocidade instantânea (suavizada)
      let instantSpeed = 0
      if (timeDiff > 0) {
        instantSpeed = loadedDiff / timeDiff
      }

      // Velocidade média desde o início
      const averageSpeed = calculateSpeed(event.loaded, startTime)
      
      // Usar média ponderada entre velocidade instantânea e média
      const speed = timeDiff > 1 ? (instantSpeed * 0.3 + averageSpeed * 0.7) : averageSpeed

      const percentage = (event.loaded / event.total) * 100
      const remaining = speed > 0 ? (event.total - event.loaded) / speed : 0

      // Determinar estágio baseado no progresso
      let stage = 'Enviando arquivo...'
      if (percentage < 1) {
        stage = 'Iniciando upload...'
      } else if (percentage > 95) {
        stage = 'Finalizando...'
      } else if (percentage > 80) {
        stage = 'Quase concluído...'
      }

      const progress: RealUploadProgress = {
        loaded: event.loaded,
        total: event.total,
        percentage: Math.round(percentage * 10) / 10,
        speed,
        timeRemaining: remaining,
        stage
      }

      options.onProgress?.(progress)

      // Atualizar valores para próximo cálculo
      lastLoaded = event.loaded
      lastTime = now
    })

    // Evento de conclusão
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Progresso final
        options.onProgress?.({
          loaded: file.size,
          total: file.size,
          percentage: 100,
          speed: 0,
          timeRemaining: 0,
          stage: 'Upload concluído!'
        })

        // Retornar a URL do arquivo (mesma URL de upload para MinIO)
        resolve(uploadUrl)
      } else {
        const error = `Upload falhou: ${xhr.status} ${xhr.statusText}`
        options.onError?.(error)
        reject(new Error(error))
      }
    })

    // Evento de erro
    xhr.addEventListener('error', () => {
      const error = 'Erro de rede durante o upload'
      options.onError?.(error)
      reject(new Error(error))
    })

    // Evento de cancelamento
    xhr.addEventListener('abort', () => {
      const error = 'Upload cancelado'
      options.onError?.(error)
      reject(new Error(error))
    })

    // Suporte a cancelamento via AbortSignal
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort()
      })
    }

    // Iniciar o upload
    xhr.send(file)
  })
}

/**
 * Wrapper para upload de vídeo com progresso real
 */
export async function uploadVideoWithRealProgress(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<string> {
  // Importar funções do MinIO (client-side)
  const { getMinioUserFileUrlClient } = await import('./minio-config')
  
  // Gerar nome único
  const timestamp = Date.now()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${timestamp}-${cleanFileName}`
  
  // Usar configuração client-side para URL de upload
  const folderType = 'videos'
  const filePath = `${userId}/${folderType}/${fileName}`
  
  // URL de upload usando configuração client-side
  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "https://rars3.rardevops.com"
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || "rarcursos"
  const uploadUrl = `${endpoint}/${bucket}/${filePath}`
  
  // Fazer upload com progresso real
  await uploadWithRealProgress(file, uploadUrl, options)
  
  // Retornar URL final do arquivo usando client-side
  return getMinioUserFileUrlClient(userId, 'video', fileName)
}

/**
 * Wrapper para upload de arquivo (PDF) com progresso real
 */
export async function uploadFileWithRealProgress(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<string> {
  // Importar funções do MinIO (client-side)
  const { getMinioUserFileUrlClient } = await import('./minio-config')
  
  // Gerar nome único
  const timestamp = Date.now()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${timestamp}-${cleanFileName}`
  
  // Usar configuração client-side para URL de upload
  const folderType = 'documentos'
  const filePath = `${userId}/${folderType}/${fileName}`
  
  // URL de upload usando configuração client-side
  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "https://rars3.rardevops.com"
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || "rarcursos"
  const uploadUrl = `${endpoint}/${bucket}/${filePath}`
  
  // Fazer upload com progresso real
  await uploadWithRealProgress(file, uploadUrl, options)
  
  // Retornar URL final do arquivo usando client-side
  return getMinioUserFileUrlClient(userId, 'file', fileName)
}

/**
 * Wrapper para upload de imagem com progresso real
 */
export async function uploadImageWithRealProgress(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<string> {
  // Importar funções do MinIO (client-side)
  const { getMinioUserFileUrlClient } = await import('./minio-config')
  
  // Gerar nome único
  const timestamp = Date.now()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${timestamp}-${cleanFileName}`
  
  // Usar configuração client-side para URL de upload
  const folderType = 'imagens'
  const filePath = `${userId}/${folderType}/${fileName}`
  
  // URL de upload usando configuração client-side
  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "https://rars3.rardevops.com"
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || "rarcursos"
  const uploadUrl = `${endpoint}/${bucket}/${filePath}`
  
  // Fazer upload com progresso real
  await uploadWithRealProgress(file, uploadUrl, options)
  
  // Retornar URL final do arquivo usando client-side
  return getMinioUserFileUrlClient(userId, 'imagem', fileName)
}

import { createAdminClient } from '@/lib/supabase/admin'
import { readFile, stat } from 'node:fs/promises'

/**
 * Lee el video generado localmente, lo sube a Supabase Storage como backup
 * y retorna el Buffer para reutilizarlo en el upload a YouTube
 * (sin descargar dos veces ni hacer una segunda copia en memoria).
 */
export async function storeVideo(params: {
  localPath: string
  orderId: string
}): Promise<{ videoBuffer: Buffer; storagePath: string; sizeBytes: number }> {
  const { localPath, orderId } = params

  const stats = await stat(localPath)
  const videoBuffer = await readFile(localPath)
  const storagePath = `${orderId}/${Date.now()}.mp4`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  await supabase
    .from('videos')
    .update({ video_storage_path: storagePath, updated_at: new Date().toISOString() } as never)
    .eq('order_id', orderId)

  return { videoBuffer, storagePath, sizeBytes: stats.size }
}

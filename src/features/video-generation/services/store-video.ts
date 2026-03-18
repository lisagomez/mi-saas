import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Descarga el video desde la URL temporal de Replicate y lo sube a Supabase Storage (backup).
 * Retorna el ArrayBuffer para pasarlo a YouTube sin descargarlo dos veces.
 *
 * NUNCA guardar URLs temporales de Replicate en la DB — expiran.
 */
export async function storeVideo(params: {
  videoUrl: string
  orderId: string
}): Promise<{ videoBuffer: ArrayBuffer; storagePath: string }> {
  const { videoUrl, orderId } = params

  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error(`Video download failed: ${res.status}`)

  const videoBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'video/mp4'
  const ext = contentType.includes('webm') ? 'webm' : 'mp4'
  const storagePath = `${orderId}/${Date.now()}.${ext}`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(storagePath, videoBuffer, { contentType, upsert: true })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // Persistir el storage path como backup
  await supabase
    .from('videos')
    .update({ video_storage_path: storagePath, updated_at: new Date().toISOString() } as never)
    .eq('order_id', orderId)

  return { videoBuffer, storagePath }
}

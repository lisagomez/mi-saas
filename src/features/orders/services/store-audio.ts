import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Descarga el audio desde la URL temporal de Suno y lo sube a Supabase Storage.
 * Retorna la URL pública persistente.
 *
 * NUNCA guardar la URL temporal de Suno directamente en la DB — expira.
 */
export async function storeAudio(params: {
  audioUrl: string
  orderId: string
  songId: string
}): Promise<{ publicUrl: string }> {
  const { audioUrl, orderId, songId } = params

  // Descargar audio desde Suno
  const res = await fetch(audioUrl)
  if (!res.ok) throw new Error(`Descarga de audio falló: ${res.status}`)

  const audioBuffer = await res.arrayBuffer()

  // Detectar tipo MIME
  const contentType = res.headers.get('content-type') ?? 'audio/mpeg'
  const ext = contentType.includes('ogg') ? 'ogg' : contentType.includes('wav') ? 'wav' : 'mp3'
  const path = `${orderId}/${songId}.${ext}`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('songs')
    .upload(path, audioBuffer, { contentType, upsert: true })

  if (uploadError) throw new Error(`Storage upload falló: ${uploadError.message}`)

  // Bucket público → URL directa (WhatsApp necesita URL HTTPS accesible)
  const { data } = supabase.storage.from('songs').getPublicUrl(path)
  return { publicUrl: data.publicUrl }
}

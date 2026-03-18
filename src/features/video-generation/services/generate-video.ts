import { createAdminClient } from '@/lib/supabase/admin'
import type { ReplicatePrediction } from '../types/replicate'
import type { VideoPromptResult } from '../prompts/video-style-prompt'

const REPLICATE_API = 'https://api.replicate.com/v1'
// Modelo de slideshow con música: combina imágenes + audio en video MP4
const SLIDESHOW_MODEL = process.env.REPLICATE_SLIDESHOW_MODEL ?? 'lucataco/music-video-maker:latest'

const MAX_POLL_ATTEMPTS = 60  // 60 × 5s = 5 minutos máximo
const POLL_INTERVAL_MS = 5000

/**
 * Genera un video slideshow combinando fotos + audio usando Replicate.
 * El estilo visual (colores, transiciones, atmósfera) se ajusta al estilo musical
 * y al contenido de la letra para que el video sea coherente con la canción.
 */
export async function generateVideo(params: {
  orderId: string
  photoStoragePaths: string[]
  audioPublicUrl: string
  style: VideoPromptResult
}): Promise<{ videoUrl: string; replicateId: string }> {
  const { orderId, photoStoragePaths, audioPublicUrl, style } = params
  const token = process.env.REPLICATE_API_TOKEN

  if (!token) throw new Error('Missing REPLICATE_API_TOKEN')

  const supabase = createAdminClient()

  // Generar signed URLs de corta duración para las fotos (Replicate las descarga)
  const photoUrls: string[] = []
  for (const path of photoStoragePaths) {
    const { data, error } = await supabase.storage
      .from('order-photos')
      .createSignedUrl(path, 3600) // 1 hora — suficiente para Replicate

    if (error || !data?.signedUrl) throw new Error(`Signed URL failed for ${path}: ${error?.message}`)
    photoUrls.push(data.signedUrl)
  }

  // Crear predicción en Replicate con estilo derivado de la canción
  const createRes = await fetch(`${REPLICATE_API}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: SLIDESHOW_MODEL,
      input: {
        images: photoUrls,
        audio: audioPublicUrl,
        fps: style.fps,
        transition: style.transition,
        transition_duration: style.photoDuration,
        style_prompt: style.stylePrompt,
        color_filter: style.colorFilter ?? undefined,
      },
    }),
  })

  if (!createRes.ok) throw new Error(`Replicate create failed: ${await createRes.text()}`)

  const prediction = (await createRes.json()) as ReplicatePrediction
  const predictionId = prediction.id

  // Persistir replicate_id para debugging
  await supabase
    .from('videos')
    .update({ replicate_id: predictionId, updated_at: new Date().toISOString() } as never)
    .eq('order_id', orderId)

  // Polling hasta que el job termine
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const pollRes = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!pollRes.ok) continue

    const poll = (await pollRes.json()) as ReplicatePrediction

    if (poll.status === 'succeeded') {
      const output = Array.isArray(poll.output) ? poll.output[0] : poll.output
      if (!output) throw new Error('Replicate succeeded but output is empty')
      return { videoUrl: output, replicateId: predictionId }
    }

    if (poll.status === 'failed' || poll.status === 'canceled') {
      throw new Error(`Replicate prediction ${poll.status}: ${poll.error ?? 'unknown'}`)
    }
  }

  throw new Error(`Replicate polling timeout after ${MAX_POLL_ATTEMPTS} attempts`)
}

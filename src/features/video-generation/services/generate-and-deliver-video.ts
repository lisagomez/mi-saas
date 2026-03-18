import { createAdminClient } from '@/lib/supabase/admin'
import { generateVideo } from './generate-video'
import { storeVideo } from './store-video'
import { uploadToYouTube } from './upload-to-youtube'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { buildVideoReadyMessage } from '@/features/whatsapp-bot/constants/copy'
import { buildVideoStylePrompt } from '../prompts/video-style-prompt'

/**
 * Orquestador del pipeline de video personalizado.
 * Diseñado para ejecutarse en after() — nunca bloquea el webhook.
 *
 * Flujo:
 * 1. Obtiene fotos y audio de la orden desde Supabase
 * 2. Genera video slideshow con Replicate
 * 3. Sube video a Supabase Storage (backup)
 * 4. Sube video a YouTube (unlisted)
 * 5. Guarda youtube_url en DB → estado `listo` en videos, `video_listo` en orders
 * 6. Notifica al cliente con datos de pago (SIN el enlace aún)
 *
 * Fallback: si falla cualquier paso, marca video como `fallido` y loggea.
 * La orden NO pasa a `entregado` — requiere intervención manual.
 */
export async function generateAndDeliverVideo(params: {
  orderId: string
  phone: string
  leadId: string
}): Promise<void> {
  const { orderId, phone, leadId } = params
  const supabase = createAdminClient()

  try {
    // 1. Obtener fotos de la orden (ordenadas por sort_order)
    const { data: photos, error: photosError } = await supabase
      .from('order_photos')
      .select('storage_path')
      .eq('order_id', orderId)
      .order('sort_order', { ascending: true })

    if (photosError || !photos?.length) {
      throw new Error(`No photos found for order ${orderId}: ${photosError?.message}`)
    }

    const photoStoragePaths = (photos as { storage_path: string }[]).map((p) => p.storage_path)

    // 2. Obtener audio, letra y estilo musical (para el prompt visual)
    const { data: orderSongData, error: songError } = await supabase
      .from('orders')
      .select('musical_style, songs(audio_url, lyrics_text)')
      .eq('id', orderId)
      .single()

    if (songError || !orderSongData) {
      throw new Error(`Order/song data not found for ${orderId}: ${songError?.message}`)
    }

    type OrderSongRow = {
      musical_style: string | null
      songs: { audio_url: string | null; lyrics_text: string }[] | null
    }
    const row = orderSongData as unknown as OrderSongRow
    const audioPublicUrl = row.songs?.[0]?.audio_url

    if (!audioPublicUrl) {
      throw new Error(`No audio URL found for order ${orderId}`)
    }

    // Construir prompt visual a partir del estilo musical y la letra de la canción
    const style = buildVideoStylePrompt({
      musicalStyle: row.musical_style ?? '',
      lyricsText: row.songs?.[0]?.lyrics_text ?? '',
    })

    // 3. Generar video con Replicate usando el estilo de la canción
    const { videoUrl: replicateVideoUrl } = await generateVideo({
      orderId,
      photoStoragePaths,
      audioPublicUrl,
      style,
    })

    // 4. Descargar video de Replicate y subir a Storage (backup)
    const { videoBuffer } = await storeVideo({
      videoUrl: replicateVideoUrl,
      orderId,
    })

    // 5. Subir a YouTube (unlisted)
    const styleLabel = row.musical_style ? ` (${row.musical_style})` : ''
    const { youtubeUrl } = await uploadToYouTube({
      videoBuffer,
      title: `Canción personalizada${styleLabel} — CancioBot`,
      description: `Video personalizado generado con IA.\nEstilo: ${row.musical_style ?? 'personalizado'}\n\nCancioBot — Canciones personalizadas para cada momento especial.`,
    })

    // 6. Persistir youtube_url y marcar como listo
    await supabase
      .from('videos')
      .update({
        youtube_url: youtubeUrl,
        status: 'listo',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('order_id', orderId)

    // Actualizar estado de la orden
    await supabase
      .from('orders')
      .update({ status: 'video_listo', updated_at: new Date().toISOString() } as never)
      .eq('id', orderId)

    // 7. Notificar al cliente con datos de pago — SIN el enlace de YouTube
    const readyMessage = buildVideoReadyMessage()
    await sendWhatsAppText(phone, readyMessage)
    await storeMessage({ leadId, role: 'assistant', contentText: readyMessage })
  } catch (err) {
    // Fallo silencioso — marcar video como fallido para dashboard
    console.error('[generateAndDeliverVideo] error:', err instanceof Error ? err.message : err)

    await supabase
      .from('videos')
      .update({ status: 'fallido', error_message: err instanceof Error ? err.message : 'Unknown error', updated_at: new Date().toISOString() } as never)
      .eq('order_id', orderId)

    // Notificar al creativo vía estado de orden (el dashboard mostrará el fallo)
    await supabase
      .from('orders')
      .update({ status: 'requiere_procesamiento_manual', updated_at: new Date().toISOString() } as never)
      .eq('id', orderId)
  }
}

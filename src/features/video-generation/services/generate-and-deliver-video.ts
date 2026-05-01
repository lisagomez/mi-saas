import { createAdminClient } from '@/lib/supabase/admin'
import { generateVideo, cleanupVideoWorkspace } from './generate-video'
import { storeVideo } from './store-video'
import { uploadToYouTube } from './upload-to-youtube'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { buildVideoReadyMessage, VIDEO_FAILED_MESSAGE } from '@/features/whatsapp-bot/constants/copy'
import { buildVideoStylePrompt } from '../prompts/video-style-prompt'

/**
 * Orquestador del pipeline de video personalizado.
 * Diseñado para ejecutarse en after() — nunca bloquea el webhook.
 *
 * Flujo:
 * 1. Carga fotos y audio de la orden
 * 2. Genera slideshow con ffmpeg local (audio determina pacing y duración)
 * 3. Sube video a Supabase Storage (backup)
 * 4. Sube video a YouTube (unlisted, resumable upload)
 * 5. Notifica al cliente con datos de pago — SIN el enlace
 *
 * Fallback: si falla, marca video como `fallido`, mueve orden a procesamiento manual,
 * y notifica al cliente que el equipo lo revisa.
 */
export async function generateAndDeliverVideo(params: {
  orderId: string
  phone: string
  leadId: string
}): Promise<void> {
  const { orderId, phone, leadId } = params
  const supabase = createAdminClient()
  let localVideoPath: string | null = null

  try {
    // 1. Fotos en orden
    const { data: photos, error: photosError } = await supabase
      .from('order_photos')
      .select('storage_path')
      .eq('order_id', orderId)
      .order('sort_order', { ascending: true })

    if (photosError || !photos?.length) {
      throw new Error(`No photos found for order ${orderId}: ${photosError?.message}`)
    }
    const photoStoragePaths = (photos as { storage_path: string }[]).map((p) => p.storage_path)

    // 2. Audio + estilo + letra
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
    if (!audioPublicUrl) throw new Error(`No audio URL found for order ${orderId}`)

    const style = buildVideoStylePrompt({
      musicalStyle: row.musical_style ?? '',
      lyricsText: row.songs?.[0]?.lyrics_text ?? '',
    })

    // 3. Render con ffmpeg
    const { localPath } = await generateVideo({
      orderId,
      photoStoragePaths,
      audioPublicUrl,
      style,
    })
    localVideoPath = localPath

    // 4. Backup a Storage + buffer reutilizable
    const { videoBuffer } = await storeVideo({ localPath, orderId })

    // 5. YouTube
    const styleLabel = row.musical_style ? ` (${row.musical_style})` : ''
    const { youtubeUrl } = await uploadToYouTube({
      videoBuffer,
      title: `Canción personalizada${styleLabel} — CancioBot`,
      description: `Video personalizado generado con IA.\nEstilo: ${row.musical_style ?? 'personalizado'}\n\nCancioBot — Canciones personalizadas para cada momento especial.`,
    })

    // 6. Persistir y avanzar estado
    await supabase
      .from('videos')
      .update({
        youtube_url: youtubeUrl,
        status: 'listo',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('order_id', orderId)

    await supabase
      .from('orders')
      .update({ status: 'video_listo', updated_at: new Date().toISOString() } as never)
      .eq('id', orderId)

    // 7. Notificar al cliente con datos de pago — sin enlace
    const readyMessage = buildVideoReadyMessage()
    await sendWhatsAppText(phone, readyMessage)
    await storeMessage({ leadId, role: 'assistant', contentText: readyMessage })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generateAndDeliverVideo] error:', errorMsg)

    await supabase
      .from('videos')
      .update({
        status: 'fallido',
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('order_id', orderId)

    await supabase
      .from('orders')
      .update({
        status: 'requiere_procesamiento_manual',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', orderId)

    // Notificar al cliente — el audio ya lo tiene; aquí solo informamos del video.
    try {
      await sendWhatsAppText(phone, VIDEO_FAILED_MESSAGE)
      await storeMessage({ leadId, role: 'assistant', contentText: VIDEO_FAILED_MESSAGE })
    } catch (notifyErr) {
      console.error('[generateAndDeliverVideo] notify failed:', notifyErr)
    }
  } finally {
    if (localVideoPath) await cleanupVideoWorkspace(localVideoPath)
  }
}

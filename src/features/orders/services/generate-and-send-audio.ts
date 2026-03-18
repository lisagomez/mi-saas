import { createAdminClient } from '@/lib/supabase/admin'
import { generateAudio } from './generate-audio'
import { storeAudio } from './store-audio'
import { sendWhatsAppAudio, sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { AUDIO_PREVIEW_MESSAGE } from '@/features/whatsapp-bot/constants/copy'

/**
 * Genera el audio de la canción, lo sube a Storage y lo envía al cliente.
 * Diseñado para ejecutarse en after() — después de que el webhook respondió a Meta.
 *
 * Fallo silencioso: si Suno no está disponible o falla, el cliente ya tiene
 * su letra y solicitud de pago. No bloquea ni interrumpe nada.
 */
export async function generateAndSendAudioPreview(params: {
  orderId: string
  songId: string
  phone: string
  musicPrompt: string
  lyricsText: string
}): Promise<void> {
  const { orderId, songId, phone, musicPrompt, lyricsText } = params

  try {
    // 1. Generar audio con Suno (puede tardar 30-90s)
    const { audioUrl: sunoUrl } = await generateAudio({
      musicPrompt,
      lyricsText,
    })

    // 2. Descargar y subir a Storage (URL permanente)
    const { publicUrl } = await storeAudio({ audioUrl: sunoUrl, orderId, songId })

    // 3. Persistir audio_url en songs
    const supabase = createAdminClient()
    await supabase
      .from('songs')
      .update({ audio_url: publicUrl } as never)
      .eq('id', songId)

    // 4. Enviar preview al cliente por WhatsApp
    await sendWhatsAppText(phone, AUDIO_PREVIEW_MESSAGE)
    await sendWhatsAppAudio(phone, publicUrl)
  } catch (err) {
    // Fallo silencioso — loggear para debugging pero no propagar
    console.error('[generateAndSendAudioPreview] fallback:', err instanceof Error ? err.message : err)
  }
}

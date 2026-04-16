import {
  sendWhatsAppText,
  sendWhatsAppAudio,
} from '@/features/whatsapp-bot/services/send-whatsapp-message'
import {
  SONG_DELIVERED_MESSAGE,
  SONG_DELIVERY_CLOSING_MESSAGE,
  buildVideoOfferMessage,
} from '@/features/whatsapp-bot/constants/copy'
import { splitLyricsForWhatsApp } from './generate-lyrics'

/**
 * Entrega la canción al cliente por WhatsApp y ofrece el video add-on.
 * Si audioUrl está disponible, envía el audio primero y luego la letra.
 */
export async function deliverSong(params: {
  phone: string
  lyricsText: string
  audioUrl?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const { phone, lyricsText, audioUrl } = params

  // Mensaje de entrega
  const introResult = await sendWhatsAppText(phone, SONG_DELIVERED_MESSAGE)
  if (!introResult.success) return introResult

  // Enviar audio completo si está disponible
  if (audioUrl) {
    await sendWhatsAppAudio(phone, audioUrl, '🎶 Tu corrido completo — ¡ya es tuyo!')
  }

  // Enviar letra (dividida si es muy larga)
  const chunks = splitLyricsForWhatsApp(lyricsText)
  for (const chunk of chunks) {
    const chunkResult = await sendWhatsAppText(phone, chunk)
    if (!chunkResult.success) return chunkResult
  }

  // Ofrecer video add-on (precio configurable via VIDEO_PRICE_USD)
  await sendWhatsAppText(phone, buildVideoOfferMessage())

  // Mensaje de cierre: agradecimiento + invitación a recompra
  await sendWhatsAppText(phone, SONG_DELIVERY_CLOSING_MESSAGE)

  return { success: true }
}

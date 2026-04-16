'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { AUDIO_COMING_MESSAGE } from '@/features/whatsapp-bot/constants/copy'
import { generateAndSendAudioPreview } from '@/features/orders/services/generate-and-send-audio'
import { getActivePriceForLead } from '@/features/catalogs/services/get-active-price-for-lead'

const ApproveLyricsSchema = z.object({ orderId: z.string().uuid() })

export async function approveLyrics(
  input: z.infer<typeof ApproveLyricsSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = ApproveLyricsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Input inválido' }

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'creativo'].includes((profile as { role: string }).role)) {
    return { success: false, error: 'Sin permisos' }
  }

  const { data: orderRaw } = await supabase
    .from('orders')
    .select('status, lead_id, songs(id, music_prompt, lyrics_text)')
    .eq('id', parsed.data.orderId)
    .single()

  const order = orderRaw as {
    status: string
    lead_id: string
    songs: { id: string; music_prompt: string | null; lyrics_text: string | null }[] | null
  } | null

  if (!order) return { success: false, error: 'Order no encontrado' }
  if (order.status !== 'letra_generada') {
    return { success: false, error: `Estado actual: ${order.status}` }
  }

  const song = order.songs?.[0]
  if (!song?.lyrics_text) return { success: false, error: 'Letra no encontrada' }

  const { data: leadRaw } = await supabase
    .from('leads').select('phone').eq('id', order.lead_id).single()

  const phone = (leadRaw as { phone: string } | null)?.phone
  if (!phone) return { success: false, error: 'Teléfono del lead no encontrado' }

  // Resolver precio de campaña activa para este lead (se guarda en el order)
  const priceLabel = await getActivePriceForLead(order.lead_id)

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'pago_pendiente',
      updated_at: new Date().toISOString(),
      ...(priceLabel ? { price_label: priceLabel } : {}),
    } as never)
    .eq('id', parsed.data.orderId)

  if (error) return { success: false, error: error.message }

  // Notificar al cliente y disparar el audio job
  await sendWhatsAppText(phone, AUDIO_COMING_MESSAGE)

  try {
    await generateAndSendAudioPreview({
      songId: song.id,
      musicPrompt: song.music_prompt ?? '',
      lyricsText: song.lyrics_text,
    })
  } catch (err) {
    // Si falla el submit, el cron /api/music/poll reintentará automáticamente
    console.error('[approveLyrics] submitAudioJob falló — el cron reintentará:', err instanceof Error ? err.message : err)
  }

  return { success: true }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAudioJob, submitAudioJob } from '@/features/orders/services/generate-audio'
import { sendWhatsAppAudio, sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'
import { AUDIO_PREVIEW_MESSAGE, buildPaymentRequestMessage } from '@/features/whatsapp-bot/constants/copy'
import { clipAudio } from '@/features/orders/services/clip-audio'

export const maxDuration = 60

/**
 * Cron que revisa songs con musicapi_task_id pendiente y entrega el audio al cliente.
 * También reintenta songs huérfanas (job nunca se submitió o falló silenciosamente).
 * Trigger externo: cron-job.org cada 2 minutos con Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // --- 1. Resubmitir songs huérfanas (task_id null, audio null, orden pago_pendiente) ---
  // Máximo 3 intentos por canción — evita bucle infinito si MusicAPI rechaza el job.
  const MAX_SUBMIT_ATTEMPTS = 3

  type OrphanSong = { id: string; order_id: string; music_prompt: string | null; lyrics_text: string | null; submit_attempts: number }

  const { data: orphanSongs } = await supabase
    .from('songs')
    .select('id, order_id, music_prompt, lyrics_text, submit_attempts')
    .is('musicapi_task_id', null)
    .is('audio_url', null)
    .not('lyrics_text', 'is', null)
    .lt('submit_attempts', MAX_SUBMIT_ATTEMPTS)
    .limit(5) as unknown as { data: OrphanSong[] | null }

  if (orphanSongs && orphanSongs.length > 0) {
    for (const orphan of orphanSongs) {
      const { data: ord } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orphan.order_id)
        .single()

      if ((ord as { status: string } | null)?.status !== 'pago_pendiente') continue

      // Incrementar siempre — incluso si falla, cuenta como intento
      await supabase
        .from('songs')
        .update({ submit_attempts: orphan.submit_attempts + 1 } as never)
        .eq('id', orphan.id)

      try {
        const { taskId } = await submitAudioJob({
          musicPrompt: orphan.music_prompt ?? '',
          lyricsText: orphan.lyrics_text ?? '',
        })
        await supabase
          .from('songs')
          .update({ musicapi_task_id: taskId } as never)
          .eq('id', orphan.id)
        console.log(`[music/poll] resubmitted orphan song ${orphan.id} → task ${taskId} (attempt ${orphan.submit_attempts + 1})`)
      } catch (err) {
        console.error(`[music/poll] resubmit failed for ${orphan.id} (attempt ${orphan.submit_attempts + 1}/${MAX_SUBMIT_ATTEMPTS}):`, err instanceof Error ? err.message : err)
      }
    }
  }

  // --- 2. Revisar jobs activos ---
  type PendingSong = { id: string; musicapi_task_id: string; order_id: string }

  const { data: pendingSongs, error } = await supabase
    .from('songs')
    .select('id, musicapi_task_id, order_id')
    .not('musicapi_task_id', 'is', null)
    .is('audio_url', null)
    .limit(10) as unknown as { data: PendingSong[] | null; error: { message: string } | null }

  if (error) {
    console.error('[music/poll] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pendingSongs || pendingSongs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  console.log(`[music/poll] checking ${pendingSongs.length} pending song(s)`)
  let delivered = 0

  for (const song of pendingSongs) {
    try {
      // Verificar estado en MusicAPI
      const { audioUrl: sunoUrl } = await checkAudioJob(song.musicapi_task_id as string)
      if (!sunoUrl) {
        console.log(`[music/poll] song ${song.id} still processing`)
        continue
      }

      // Obtener lead/phone desde la orden
      const { data: order } = await supabase
        .from('orders')
        .select('lead_id')
        .eq('id', song.order_id as string)
        .single()

      if (!order) continue
      const { lead_id: leadId } = order as { lead_id: string }

      const { data: lead } = await supabase
        .from('leads')
        .select('phone')
        .eq('id', leadId)
        .single()

      if (!lead) continue
      const { phone } = lead as { phone: string }

      // Descargar audio completo
      const audioRes = await fetch(sunoUrl)
      if (!audioRes.ok) throw new Error(`Descarga de audio falló: ${audioRes.status}`)
      const arrayBuf = await audioRes.arrayBuffer()
      const fullBuffer = Buffer.from(arrayBuf)
      const contentType = audioRes.headers.get('content-type') ?? 'audio/mpeg'
      const ext = contentType.includes('ogg') ? 'ogg' : contentType.includes('wav') ? 'wav' : 'mp3'

      // Clipear: preview (50%) + full — pasa el formato para frame sync correcto
      const { preview: previewBuffer, full: fullBuf } = clipAudio(fullBuffer, 0.5, ext as 'mp3' | 'ogg' | 'wav')

      const orderId = song.order_id as string
      const songId = song.id as string

      const supabaseStorage = createAdminClient()
      const pathFull = `${orderId}/${songId}-full.${ext}`
      const pathPreview = `${orderId}/${songId}-preview.${ext}`

      await supabaseStorage.storage.from('songs').upload(pathFull, fullBuf, { contentType, upsert: true })
      await supabaseStorage.storage.from('songs').upload(pathPreview, previewBuffer, { contentType, upsert: true })

      const { data: urlFull } = supabaseStorage.storage.from('songs').getPublicUrl(pathFull)
      const { data: urlPreview } = supabaseStorage.storage.from('songs').getPublicUrl(pathPreview)

      // UPDATE atómico: solo persiste si audio_url sigue siendo null.
      // Si otro proceso ya entregó esta canción, data quedará vacío y saltamos el WhatsApp.
      const { data: claimed } = await supabase
        .from('songs')
        .update({ audio_url: urlPreview.publicUrl, audio_url_full: urlFull.publicUrl, musicapi_task_id: null } as never)
        .eq('id', song.id)
        .is('audio_url', null)
        .select('id') as unknown as { data: { id: string }[] | null }

      if (!claimed || claimed.length === 0) {
        console.log(`[music/poll] song ${song.id} already claimed by another process, skipping`)
        continue
      }

      // Enviar preview al cliente — continuar aunque falle el audio (payment message sigue siendo útil)
      const audioSent = await sendWhatsAppAudio(phone, urlPreview.publicUrl)
      if (!audioSent.success) {
        console.error(`[music/poll] WhatsApp audio send failed for ${phone}: ${audioSent.error}`)
      } else {
        await storeMessage({ leadId, role: 'assistant', contentText: AUDIO_PREVIEW_MESSAGE })
      }

      const paymentMsg = buildPaymentRequestMessage()
      const textSent = await sendWhatsAppText(phone, paymentMsg)
      if (textSent.success) {
        await storeMessage({ leadId, role: 'assistant', contentText: paymentMsg })
      }

      console.log(`[music/poll] delivered song ${song.id} to ${phone}`)
      delivered++
    } catch (err) {
      console.error(`[music/poll] error song ${song.id}:`, err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ ok: true, processed: pendingSongs.length, delivered })
}

import { NextRequest, NextResponse, after } from 'next/server'
import { getOrCreateLead } from '@/features/whatsapp-bot/services/get-or-create-lead'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'
import { countUserMessages } from '@/features/whatsapp-bot/conversation/services/count-user-messages'
import { getConversationContext } from '@/features/whatsapp-bot/qualifier/services/get-conversation-context'
import { runQualifier } from '@/features/whatsapp-bot/qualifier/services/run-qualifier'
import { detectStoryDone } from '@/features/whatsapp-bot/conversation/services/detect-story-done'
import { logAiUsage } from '@/features/whatsapp-bot/services/log-ai-usage'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import {
  GREETING_MESSAGE,
  CLOSE_NOT_QUALIFIED_MESSAGE,
  NEXT_STEP_QUALIFIED_MESSAGE,
  ASK_STORY_MESSAGE,
  STORY_RECEIVED_ASK_STYLE_MESSAGE,
  GENERATING_LYRICS_MESSAGE,
  LYRICS_INTRO_MESSAGE,
  ORDER_ALREADY_PROCESSED_MESSAGE,
  buildPaymentRequestMessage,
  PAYMENT_PROOF_RECEIVED_MESSAGE,
  PAYMENT_PROOF_FAILED_MESSAGE,
  VIDEO_REJECTED_MESSAGE,
  ASK_PHOTOS_MESSAGE,
  PHOTOS_RECEIVED_MESSAGE,
  PHOTOS_CONFIRMED_MESSAGE,
  buildVideoReadyMessage,
  VIDEO_PAYMENT_PROOF_RECEIVED_MESSAGE,
  VIDEO_PAYMENT_PROOF_FAILED_MESSAGE,
} from '@/features/whatsapp-bot/constants/copy'
import { getOrCreateOrder } from '@/features/orders/services/get-or-create-order'
import { updateOrderStatus } from '@/features/orders/services/update-order-status'
import { appendStoryChunk } from '@/features/orders/services/append-story-chunk'
import { generateLyrics, splitLyricsForWhatsApp } from '@/features/orders/services/generate-lyrics'
import { storePaymentProof } from '@/features/orders/services/store-payment-proof'
import { generateAndSendAudioPreview } from '@/features/orders/services/generate-and-send-audio'
import { createVideoRecord } from '@/features/video-generation/services/create-video-record'
import { storePhoto } from '@/features/video-generation/services/store-photo'
import { generateAndDeliverVideo } from '@/features/video-generation/services/generate-and-deliver-video'
import { extractAndSaveLocation } from '@/features/whatsapp-bot/conversation/services/extract-location'
import { buildMusicPrompt } from '@/features/orders/prompts/music-prompt'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODELS } from '@/lib/ai/openrouter'
import type { OrderStatus } from '@/types/database'

/** Verificación del webhook por Meta (GET) */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Invalid verification' }, { status: 403 })
}

/** Mensajes entrantes (POST) */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (appSecret && signature) {
    const isValid = await verifySignature(body, signature, appSecret)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: WhatsAppWebhookPayload
  try {
    payload = JSON.parse(body) as WhatsAppWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = extractIncomingMessage(payload)
  if (!message) {
    return NextResponse.json({ ok: true })
  }

  const { from: phone, text, imageMediaId, imageMimeType, messageId } = message

  // Ignorar mensajes sin texto ni imagen
  if (!text?.trim() && !imageMediaId) {
    return NextResponse.json({ ok: true })
  }

  try {
    const { lead, isNew: isNewLead } = await getOrCreateLead({
      phone,
      source: 'facebook',
    })

    await storeMessage({
      leadId: lead.id,
      role: 'user',
      contentText: text,
      messageIdWhatsApp: messageId,
    })

    if (isNewLead) {
      const sent = await sendWhatsAppText(phone, GREETING_MESSAGE)
      if (sent.success) {
        await storeMessage({
          leadId: lead.id,
          role: 'assistant',
          contentText: GREETING_MESSAGE,
        })
      }
      return NextResponse.json({ ok: true })
    }

    // --- Rama: lead ya calificado → flujo conversacional post-calificacion ---
    if (lead.qualification_status === 'calificado') {
      await handleQualifiedLead({ leadId: lead.id, phone, text: text ?? '', imageMediaId, imageMimeType })
      return NextResponse.json({ ok: true })
    }

    // Lead no calificado (nurturing) o estado desconocido → ignorar
    if (lead.qualification_status !== 'pending') {
      return NextResponse.json({ ok: true })
    }

    const userMessageCount = await countUserMessages(lead.id)
    if (userMessageCount < 1) {
      return NextResponse.json({ ok: true })
    }

    const conversationText = await getConversationContext(lead.id)
    if (!conversationText.trim()) {
      return NextResponse.json({ ok: true })
    }

    const { result, usage } = await runQualifier({ conversationText })

    const supabase = createAdminClient()
    const qualifiedAt = new Date().toISOString()
    const status = result.qualified ? 'calificado' : 'no_calificado'

    await supabase
      .from('leads')
      .update({
        qualification_status: status,
        qualified_at: qualifiedAt,
      } as never)
      .eq('id', lead.id)

    await logAiUsage({
      leadId: lead.id,
      model: MODELS.basic,
      tokensInput: usage?.promptTokens ?? null,
      tokensOutput: usage?.completionTokens ?? null,
      costUsd: null,
    })

    if (result.qualified) {
      await sendWhatsAppText(phone, NEXT_STEP_QUALIFIED_MESSAGE)
      await storeMessage({
        leadId: lead.id,
        role: 'assistant',
        contentText: NEXT_STEP_QUALIFIED_MESSAGE,
      })
    } else {
      await supabase
        .from('nurturing_list')
        .insert({
          lead_id: lead.id,
          reason: result.reason ?? null,
        } as never)
      await sendWhatsAppText(phone, CLOSE_NOT_QUALIFIED_MESSAGE)
      await storeMessage({
        leadId: lead.id,
        role: 'assistant',
        contentText: CLOSE_NOT_QUALIFIED_MESSAGE,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook whatsapp]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

async function handleQualifiedLead(params: {
  leadId: string
  phone: string
  text: string
  imageMediaId?: string | null
  imageMimeType?: string | null
}): Promise<void> {
  const { leadId, phone, text, imageMediaId, imageMimeType } = params
  const { order, isNew } = await getOrCreateOrder(leadId)

  // Order recién creado → pedir historia
  if (isNew) {
    await sendAndStore(phone, leadId, ASK_STORY_MESSAGE)
    return
  }

  const status = order.status as OrderStatus

  if (status === 'recopilando_historia') {
    if (detectStoryDone(text)) {
      await updateOrderStatus(order.id, 'recopilando_estilo')
      await sendAndStore(phone, leadId, STORY_RECEIVED_ASK_STYLE_MESSAGE)
    } else {
      await appendStoryChunk(order.id, text)
      // Fire-and-forget: extraer origen/residencia mientras el cliente sigue contando
      void extractAndSaveLocation({ leadId, storyText: text })
    }
    return
  }

  if (status === 'recopilando_estilo') {
    const supabase = createAdminClient()

    // Obtener origin/residence del lead para enriquecer el prompt musical
    const { data: leadData } = await supabase
      .from('leads')
      .select('origin, residence')
      .eq('id', leadId)
      .single()

    const musicalStyle = text.trim()
    const musicPrompt = buildMusicPrompt(
      musicalStyle,
      (leadData as { origin: string | null; residence: string | null } | null)?.origin ?? null,
      (leadData as { origin: string | null; residence: string | null } | null)?.residence ?? null
    )

    await supabase
      .from('orders')
      .update({
        musical_style: musicalStyle,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', order.id)

    await updateOrderStatus(order.id, 'generando_letra')
    await sendAndStore(phone, leadId, GENERATING_LYRICS_MESSAGE)

    const storyText = order.story_text ?? text
    const { lyricsText, songId } = await generateLyrics({
      orderId: order.id,
      leadId,
      storyText,
      musicalStyle,
      musicPrompt,
    })

    // Persistir musicPrompt en la canción
    await supabase
      .from('songs')
      .update({ music_prompt: musicPrompt } as never)
      .eq('id', songId)

    await updateOrderStatus(order.id, 'letra_generada')

    // Enviar letra + solicitud de pago al cliente (respuesta inmediata)
    await sendAndStore(phone, leadId, LYRICS_INTRO_MESSAGE)
    const chunks = splitLyricsForWhatsApp(lyricsText)
    for (const chunk of chunks) {
      await sendAndStore(phone, leadId, chunk)
    }
    await sendAndStore(phone, leadId, buildPaymentRequestMessage())
    await updateOrderStatus(order.id, 'pago_pendiente')

    // Generar audio en background (after() — no bloquea la respuesta a Meta)
    after(async () => {
      await generateAndSendAudioPreview({
        orderId: order.id,
        songId,
        phone,
        musicPrompt,
        lyricsText,
      })
    })
    return
  }

  if (status === 'pago_pendiente') {
    // Si llega una imagen → es el comprobante
    if (imageMediaId) {
      try {
        const { url } = await storePaymentProof({
          mediaId: imageMediaId,
          orderId: order.id,
          mimeType: imageMimeType ?? 'image/jpeg',
        })
        const supabase = createAdminClient()
        await supabase
          .from('orders')
          .update({
            payment_proof_url: url,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', order.id)

        await sendAndStore(phone, leadId, PAYMENT_PROOF_RECEIVED_MESSAGE)
      } catch {
        // No bloquear el webhook si falla el upload
        await updateOrderStatus(order.id, 'requiere_procesamiento_manual')
        await sendAndStore(phone, leadId, PAYMENT_PROOF_FAILED_MESSAGE)
      }
      return
    }

    // Texto mientras espera pago → recordar instrucciones
    await sendAndStore(phone, leadId, buildPaymentRequestMessage())
    return
  }

  // Estado: pago_confirmado → el admin acaba de confirmar el pago de la canción.
  // deliver-song ya ofreció el video; esperamos respuesta del cliente.
  if (status === 'pago_confirmado') {
    const lowerText = text.toLowerCase().trim()
    if (lowerText === 'sí' || lowerText === 'si' || lowerText === 's' || lowerText === 'yes') {
      await createVideoRecord(order.id)
      await updateOrderStatus(order.id, 'recopilando_fotos')
      await sendAndStore(phone, leadId, ASK_PHOTOS_MESSAGE)
    } else if (lowerText === 'no') {
      await updateOrderStatus(order.id, 'video_rechazado')
      await sendAndStore(phone, leadId, VIDEO_REJECTED_MESSAGE)
    } else {
      // Reenviar oferta si no entendemos la respuesta
      const { buildVideoOfferMessage } = await import('@/features/whatsapp-bot/constants/copy')
      await sendAndStore(phone, leadId, buildVideoOfferMessage())
    }
    return
  }

  // Estado: recopilando_fotos → recibir fotos o confirmar fin
  if (status === 'recopilando_fotos') {
    const supabase = createAdminClient()

    if (imageMediaId) {
      // Obtener cuántas fotos ya hay
      const { data: videoData } = await supabase
        .from('videos')
        .select('photo_count')
        .eq('order_id', order.id)
        .single()

      const currentCount = (videoData as { photo_count: number } | null)?.photo_count ?? 0

      if (currentCount >= 10) {
        await sendAndStore(phone, leadId, `Ya tienes 10 fotos, compa. Escribe *listo* para continuar con el video. 📸`)
        return
      }

      try {
        await storePhoto({
          mediaId: imageMediaId,
          orderId: order.id,
          sortOrder: currentCount,
          mimeType: imageMimeType ?? 'image/jpeg',
        })
        await sendAndStore(phone, leadId, PHOTOS_RECEIVED_MESSAGE)

        // Auto-disparar si llegó a 10 fotos
        if (currentCount + 1 >= 10) {
          await updateOrderStatus(order.id, 'generando_video')
          await sendAndStore(phone, leadId, PHOTOS_CONFIRMED_MESSAGE)
          after(async () => {
            await generateAndDeliverVideo({ orderId: order.id, phone, leadId })
          })
        }
      } catch {
        await sendAndStore(phone, leadId, `Hubo un problema con esa foto, compa. Intenta mandarla de nuevo. 📸`)
      }
      return
    }

    // Texto "listo" → confirmar y disparar pipeline
    const lowerText = text.toLowerCase().trim()
    if (lowerText === 'listo' || lowerText === 'ya' || lowerText === 'ok') {
      const { data: videoData } = await supabase
        .from('videos')
        .select('photo_count')
        .eq('order_id', order.id)
        .single()

      const photoCount = (videoData as { photo_count: number } | null)?.photo_count ?? 0

      if (photoCount === 0) {
        await sendAndStore(phone, leadId, `Todavía no recibo ninguna foto, compa. Mándame al menos una. 📸`)
        return
      }

      await updateOrderStatus(order.id, 'generando_video')
      await sendAndStore(phone, leadId, PHOTOS_CONFIRMED_MESSAGE)
      after(async () => {
        await generateAndDeliverVideo({ orderId: order.id, phone, leadId })
      })
    }
    return
  }

  // Estado: video_listo → esperando comprobante de pago del video
  if (status === 'video_listo') {
    if (imageMediaId) {
      try {
        const { url } = await storePaymentProof({
          mediaId: imageMediaId,
          orderId: order.id,
          mimeType: imageMimeType ?? 'image/jpeg',
        })
        const supabase = createAdminClient()
        await supabase
          .from('videos')
          .update({
            payment_proof_url: url,
            payment_status: 'comprobante_enviado',
            updated_at: new Date().toISOString(),
          } as never)
          .eq('order_id', order.id)

        await updateOrderStatus(order.id, 'video_pago_enviado')
        await sendAndStore(phone, leadId, VIDEO_PAYMENT_PROOF_RECEIVED_MESSAGE)
      } catch {
        await sendAndStore(phone, leadId, VIDEO_PAYMENT_PROOF_FAILED_MESSAGE)
      }
      return
    }
    // Texto mientras espera → recordar datos de pago
    await sendAndStore(phone, leadId, buildVideoReadyMessage())
    return
  }

  // Cualquier otro estado → mensaje informativo
  if (['video_pago_enviado', 'video_pago_confirmado', 'video_rechazado', 'generando_video', 'entregado', 'requiere_procesamiento_manual'].includes(status)) {
    await sendAndStore(phone, leadId, ORDER_ALREADY_PROCESSED_MESSAGE)
  }
}

/** Envía un mensaje por WhatsApp y lo registra en conversations. */
async function sendAndStore(phone: string, leadId: string, message: string): Promise<void> {
  const sent = await sendWhatsAppText(phone, message)
  if (sent.success) {
    await storeMessage({ leadId, role: 'assistant', contentText: message })
  }
}

function extractIncomingMessage(
  payload: WhatsAppWebhookPayload
): { from: string; text: string | null; imageMediaId: string | null; imageMimeType: string | null; messageId: string } | null {
  const entry = payload.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value
  const msg = value?.messages?.[0]
  if (!msg || change?.field !== 'messages') return null

  if (msg.type === 'text' && msg.text?.body) {
    return {
      from: String(msg.from),
      text: msg.text.body,
      imageMediaId: null,
      imageMimeType: null,
      messageId: msg.id,
    }
  }

  if (msg.type === 'image' && msg.image?.id) {
    return {
      from: String(msg.from),
      text: null,
      imageMediaId: msg.image.id,
      imageMimeType: msg.image.mime_type ?? null,
      messageId: msg.id,
    }
  }

  return null
}

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const [algo, hash] = signature.split('=')
  if (algo !== 'sha256' || !hash) return false
  const crypto = await import('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expected = hmac.digest('hex')
  const hashBuf = Buffer.from(hash, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (hashBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(hashBuf, expectedBuf)
}

interface WhatsAppWebhookPayload {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        messaging_product?: string
        metadata?: { phone_number_id?: string }
        messages?: Array<{
          from: string
          id: string
          type: string
          text?: { body: string }
          image?: { id: string; mime_type?: string }
        }>
      }
    }>
  }>
}

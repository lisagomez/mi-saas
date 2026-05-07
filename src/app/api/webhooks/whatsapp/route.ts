import { NextRequest, NextResponse, after } from 'next/server'

export const maxDuration = 300 // Vercel Pro: permite hasta 300s (necesario para polling MusicAPI)
import { getOrCreateLead } from '@/features/whatsapp-bot/services/get-or-create-lead'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'
import { countUserMessages } from '@/features/whatsapp-bot/conversation/services/count-user-messages'
import { getConversationContext } from '@/features/whatsapp-bot/qualifier/services/get-conversation-context'
import { runQualifier } from '@/features/whatsapp-bot/qualifier/services/run-qualifier'
import { runStoryGuideAgent, type StoryGuideResult } from '@/features/whatsapp-bot/conversation/services/run-story-guide-agent'
import { logAiUsage } from '@/features/whatsapp-bot/services/log-ai-usage'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import {
  GREETING_MESSAGE,
  CLOSE_NOT_QUALIFIED_MESSAGE,
  NEXT_STEP_QUALIFIED_MESSAGE,
  ASK_STORY_MESSAGE,
  STORY_RECEIVED_ASK_STYLE_MESSAGE,
  GENERATING_LYRICS_MESSAGE,
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
import { transcribeWhatsAppAudio } from '@/features/whatsapp-bot/conversation/services/transcribe-whatsapp-audio'
import { buildMusicPromptDb } from '@/features/catalogs/services/build-music-prompt-db'
import { resolveArtistStyle } from '@/features/orders/prompts/music-prompt'
import { detectOccasion } from '@/features/catalogs/services/detect-occasion'
import { getActivePromotion, formatPromotionMessage } from '@/features/catalogs/services/get-active-promotion'
import { guardedAiCall, BudgetLimitError } from '@/features/catalogs/services/guarded-ai-call'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODELS, estimateCost } from '@/lib/ai/openrouter'
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
      console.error('[webhook] signature mismatch — sig_prefix:', signature.slice(0, 15), 'secret_len:', appSecret.length, 'body_len:', body.length)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[webhook] skipping signature check — appSecret present:', !!appSecret, 'signature present:', !!signature)
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

  let { from: phone, text, imageMediaId, imageMimeType, messageId, campaignSource } = message
  const { audioMediaId } = message

  // Transcribir audio a texto antes de entrar al flujo principal
  if (audioMediaId && !imageMediaId) {
    try {
      const transcription = await transcribeWhatsAppAudio(audioMediaId)
      if (transcription) {
        text = transcription
      }
    } catch (err) {
      console.error('[webhook whatsapp] transcribeWhatsAppAudio failed', err)
      // No bloqueamos el webhook; continuamos sin texto
    }
  }

  // Ignorar mensajes sin texto ni imagen
  if (!text?.trim() && !imageMediaId) {
    return NextResponse.json({ ok: true })
  }

  try {
    const { lead, isNew: isNewLead } = await getOrCreateLead({
      phone,
      source: campaignSource ?? 'facebook',
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
      costUsd: usage
        ? estimateCost(MODELS.basic, usage.promptTokens ?? 0, usage.completionTokens ?? 0)
        : null,
    })

    if (result.qualified) {
      // Detectar ocasión especial y ofrecer promoción vigente si existe
      const occasion = await detectOccasion(conversationText)
      if (occasion && occasion !== 'otro') {
        const promo = await getActivePromotion(occasion)
        if (promo) {
          const promoMsg = formatPromotionMessage(promo)
          await sendWhatsAppText(phone, promoMsg)
          await storeMessage({ leadId: lead.id, role: 'assistant', contentText: promoMsg })
        }
      }

      // Si el mensaje que disparó la calificación ya parece una historia (>150 chars),
      // guardarlo directamente y pedir el estilo — el cliente no tiene que repetirla.
      if (text && text.trim().length > 150) {
        const { order } = await getOrCreateOrder(lead.id)
        await appendStoryChunk(order.id, text)
        void extractAndSaveLocation({ leadId: lead.id, storyText: text })
        await updateOrderStatus(order.id, 'recopilando_estilo')
        await sendAndStore(phone, lead.id, STORY_RECEIVED_ASK_STYLE_MESSAGE)
      } else {
        await sendWhatsAppText(phone, NEXT_STEP_QUALIFIED_MESSAGE)
        await storeMessage({
          leadId: lead.id,
          role: 'assistant',
          contentText: NEXT_STEP_QUALIFIED_MESSAGE,
        })
      }
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

  // Order recién creado → si el mensaje es muy corto, pedir historia; si no, correr el agente
  if (isNew) {
    if (text.trim().length < 30) {
      await sendAndStore(phone, leadId, ASK_STORY_MESSAGE)
      return
    }

    await appendStoryChunk(order.id, text)
    void extractAndSaveLocation({ leadId, storyText: text })

    const supabase = createAdminClient()
    const { data: leadData } = await supabase
      .from('leads')
      .select('origin, residence')
      .eq('id', leadId)
      .single()

    const leadMeta = leadData as { origin: string | null; residence: string | null } | null
    let guideResult: StoryGuideResult
    try {
      guideResult = await runStoryGuideAgent({
        storyAccumulated: text,
        newMessage: text,
        leadMeta: leadMeta ?? { origin: null, residence: null },
      })
    } catch (err) {
      console.error('[webhook] runStoryGuideAgent failed on new order', err)
      await sendAndStore(phone, leadId, ASK_STORY_MESSAGE)
      return
    }

    if (guideResult.action === 'complete') {
      await updateOrderStatus(order.id, 'recopilando_estilo')
      await sendAndStore(phone, leadId, STORY_RECEIVED_ASK_STYLE_MESSAGE)
    } else if (guideResult.reply) {
      await sendAndStore(phone, leadId, guideResult.reply)
    } else {
      await sendAndStore(phone, leadId, ASK_STORY_MESSAGE)
    }
    return
  }

  const status = order.status as OrderStatus

  if (status === 'recopilando_historia') {
    await appendStoryChunk(order.id, text)
    void extractAndSaveLocation({ leadId, storyText: text })

    const supabaseStory = createAdminClient()
    const [{ data: freshOrder }, { data: leadDataStory }] = await Promise.all([
      supabaseStory.from('orders').select('story_text').eq('id', order.id).single(),
      supabaseStory.from('leads').select('origin, residence').eq('id', leadId).single(),
    ])

    const leadMetaStory = leadDataStory as { origin: string | null; residence: string | null } | null
    let storyResult: StoryGuideResult
    try {
      storyResult = await runStoryGuideAgent({
        storyAccumulated: (freshOrder as { story_text: string | null } | null)?.story_text ?? '',
        newMessage: text,
        leadMeta: leadMetaStory ?? { origin: null, residence: null },
      })
    } catch (err) {
      console.error('[webhook] runStoryGuideAgent failed', err)
      return // Chunk guardado, responder en el siguiente mensaje
    }

    if (storyResult.action === 'complete') {
      await updateOrderStatus(order.id, 'recopilando_estilo')
      await sendAndStore(phone, leadId, STORY_RECEIVED_ASK_STYLE_MESSAGE)
    } else if (storyResult.reply) {
      await sendAndStore(phone, leadId, storyResult.reply)
    }
    // action='collecting' sin reply → silencio (chunk muy corto, no interrumpir)
    return
  }

  if (status === 'recopilando_estilo') {
    const supabase = createAdminClient()
    const musicalStyle = resolveArtistStyle(text.trim())

    await supabase
      .from('orders')
      .update({
        musical_style: musicalStyle,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', order.id)

    await handleGenerateLyrics({
      order: { ...order, story_text: order.story_text, musical_style: musicalStyle },
      leadId,
      phone,
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

    // Texto mientras espera pago → verificar si el audio ya llegó o sigue generando
    const supabaseCheck = createAdminClient()
    const { data: songData } = await supabaseCheck
      .from('songs')
      .select('audio_url, id, music_prompt, lyrics_text, musicapi_task_id')
      .eq('order_id', order.id)
      .single()

    const song = songData as { audio_url: string | null; id: string; music_prompt: string | null; lyrics_text: string | null; musicapi_task_id: string | null } | null

    if (!song?.audio_url) {
      await sendAndStore(phone, leadId, '🎵 Tu canción está en proceso, compa. En unos minutos te la mando al WhatsApp. ¡No te desesperes!')
      // Si no hay task_id activo, submitir el job directamente (solo es un POST rápido)
      if (song?.id && song?.lyrics_text && !song.musicapi_task_id) {
        await generateAndSendAudioPreview({
          songId: song.id,
          musicPrompt: song.music_prompt ?? '',
          lyricsText: song.lyrics_text ?? '',
        })
      }
    } else {
      // Audio ya fue enviado → recordar instrucciones de pago (con precio de campaña si aplica)
      await sendAndStore(phone, leadId, buildPaymentRequestMessage((order as { price_label?: string | null }).price_label))
    }
    return
  }

  // Estado: pago_confirmado → el admin acaba de confirmar el pago de la canción.
  // deliver-song ya ofreció el video; esperamos respuesta del cliente.
  if (status === 'pago_confirmado') {
    const lowerText = text.toLowerCase().trim()
    if (isAffirmative(lowerText)) {
      await createVideoRecord(order.id)
      await updateOrderStatus(order.id, 'recopilando_fotos')
      await sendAndStore(phone, leadId, ASK_PHOTOS_MESSAGE)
    } else if (isNegative(lowerText)) {
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
    // Acepta variantes naturales: "listo ya las mande", "ya listo", "ok primo", etc.
    const lowerText = text.toLowerCase().trim()
    const isDone = lowerText === 'listo' || lowerText === 'ya' || lowerText === 'ok'
      || lowerText.startsWith('listo ') || lowerText.startsWith('ya ') || lowerText.startsWith('ok ')
    if (isDone) {
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
  if (['video_pago_enviado', 'video_rechazado', 'generando_video', 'entregado', 'requiere_procesamiento_manual'].includes(status)) {
    await sendAndStore(phone, leadId, ORDER_ALREADY_PROCESSED_MESSAGE)
  }
}

/**
 * Genera la letra, la envía al cliente y queda a la espera del pago.
 * Reutilizable desde recopilando_estilo y aclarando_detalles.
 */
async function handleGenerateLyrics(params: {
  order: { id: string; story_text: string | null; musical_style: string | null }
  leadId: string
  phone: string
}): Promise<void> {
  const { order, leadId, phone } = params
  const supabase = createAdminClient()

  const { data: leadData } = await supabase
    .from('leads')
    .select('origin, residence')
    .eq('id', leadId)
    .single()

  const musicalStyle = order.musical_style ?? 'corrido'
  const leadMeta = leadData as { origin: string | null; residence: string | null } | null
  const musicPrompt = await buildMusicPromptDb(
    musicalStyle,
    leadMeta?.origin ?? null,
    leadMeta?.residence ?? null
  )

  await updateOrderStatus(order.id, 'generando_letra')
  await sendAndStore(phone, leadId, GENERATING_LYRICS_MESSAGE)

  const storyText = order.story_text ?? ''
  let lyricsText: string
  let songId: string

  try {
    const result = await guardedAiCall(order.id, () =>
      generateLyrics({ orderId: order.id, leadId, storyText, musicalStyle, musicPrompt })
    )
    lyricsText = result.lyricsText
    songId = result.songId
  } catch (err) {
    if (err instanceof BudgetLimitError) {
      await sendAndStore(phone, leadId, '⏳ Tu canción está en proceso. Te la enviamos pronto, compa.')
      return
    }
    throw err
  }

  await supabase
    .from('songs')
    .update({ music_prompt: musicPrompt } as never)
    .eq('id', songId)

  // Parar aquí: el rol 'creativo' revisa la letra en el dashboard antes de avanzar.
  // approveLyrics() enviará AUDIO_COMING_MESSAGE y disparará el audio job al aprobar.
  await updateOrderStatus(order.id, 'letra_generada')
}

/** Envía un mensaje por WhatsApp y lo registra en conversations. */
async function sendAndStore(phone: string, leadId: string, message: string): Promise<void> {
  const sent = await sendWhatsAppText(phone, message)
  if (sent.success) {
    await storeMessage({ leadId, role: 'assistant', contentText: message })
  }
}

/**
 * Detecta afirmativos naturales de migrantes latinos.
 * El bot pide "SÍ" pero los clientes responden de múltiples formas.
 */
function isAffirmative(text: string): boolean {
  const AFFIRMATIVES = ['sí', 'si', 's', 'yes', 'dale', 'ándale', 'andale', 'claro', 'simon', 'simón', 'simas', 'pos si', 'pues si', 'pues sí', 'órale', 'orale', 'sale']
  if (AFFIRMATIVES.includes(text)) return true
  // "si quiero", "si primo", "si por favor", etc.
  if (text.startsWith('si ') || text.startsWith('sí ')) return true
  return false
}

/**
 * Detecta negativos naturales.
 */
function isNegative(text: string): boolean {
  const NEGATIVES = ['no', 'nel', 'nop', 'nope', 'no gracias', 'no quiero', 'nel pastel']
  if (NEGATIVES.includes(text)) return true
  if (text.startsWith('no ')) return true
  return false
}

function extractCampaignSource(msg: { referral?: { source_url?: string } }): string | undefined {
  const sourceUrl = msg.referral?.source_url
  if (!sourceUrl) return undefined
  try {
    const url = new URL(sourceUrl)
    const utmCampaign = url.searchParams.get('utm_campaign')
    if (utmCampaign) return `fb_${utmCampaign}`
  } catch {
    // URL inválida — ignorar
  }
  return undefined
}

function extractIncomingMessage(
  payload: WhatsAppWebhookPayload
): { from: string; text: string | null; imageMediaId: string | null; imageMimeType: string | null; audioMediaId: string | null; messageId: string; campaignSource?: string } | null {
  const entry = payload.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value
  const msg = value?.messages?.[0]
  if (!msg || change?.field !== 'messages') return null

  const campaignSource = extractCampaignSource(msg)

  if (msg.type === 'text' && msg.text?.body) {
    return {
      from: String(msg.from),
      text: msg.text.body,
      imageMediaId: null,
      imageMimeType: null,
      audioMediaId: null,
      messageId: msg.id,
      campaignSource,
    }
  }

  if (msg.type === 'image' && msg.image?.id) {
    return {
      from: String(msg.from),
      text: null,
      imageMediaId: msg.image.id,
      imageMimeType: msg.image.mime_type ?? null,
      audioMediaId: null,
      messageId: msg.id,
      campaignSource,
    }
  }

  if (msg.type === 'audio' && msg.audio?.id) {
    return {
      from: String(msg.from),
      text: null,
      imageMediaId: null,
      imageMimeType: null,
      audioMediaId: msg.audio.id,
      messageId: msg.id,
      campaignSource,
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
          audio?: { id: string; mime_type?: string }
          referral?: { source_url?: string; source_id?: string; headline?: string }
        }>
      }
    }>
  }>
}

import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateLead } from '@/features/whatsapp-bot/services/get-or-create-lead'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'
import { countUserMessages } from '@/features/whatsapp-bot/conversation/services/count-user-messages'
import { getConversationContext } from '@/features/whatsapp-bot/qualifier/services/get-conversation-context'
import { runQualifier } from '@/features/whatsapp-bot/qualifier/services/run-qualifier'
import { logAiUsage } from '@/features/whatsapp-bot/services/log-ai-usage'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import {
  GREETING_MESSAGE,
  CLOSE_NOT_QUALIFIED_MESSAGE,
  NEXT_STEP_QUALIFIED_MESSAGE,
} from '@/features/whatsapp-bot/constants/copy'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODELS } from '@/lib/ai/openrouter'

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

  const { from: phone, text, messageId } = message
  if (!text?.trim()) {
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

function extractIncomingMessage(
  payload: WhatsAppWebhookPayload
): { from: string; text: string; messageId: string } | null {
  const entry = payload.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value
  const msg = value?.messages?.[0]
  if (!msg || change?.field !== 'messages') return null
  if (msg.type !== 'text' || !msg.text?.body) return null
  return {
    from: String(msg.from),
    text: msg.text.body,
    messageId: msg.id,
  }
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
        }>
      }
    }>
  }>
}

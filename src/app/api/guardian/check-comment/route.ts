import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { comment_text?: string; post_url?: string }
  const { comment_text, post_url } = body

  if (!comment_text?.trim()) {
    return NextResponse.json({ error: 'comment_text is required' }, { status: 400 })
  }

  const { data: config } = await supabase
    .from('guardian_config')
    .select('prohibited_words, alert_phone, publishing_paused, is_active')
    .eq('is_active', true)
    .single()

  if (!config) {
    return NextResponse.json({ error: 'guardian_config not found' }, { status: 500 })
  }

  const words: string[] = config.prohibited_words ?? []
  const lowerComment = comment_text.toLowerCase()
  const foundWord = words.find((w) => lowerComment.includes(w.toLowerCase()))

  if (!foundWord) {
    return NextResponse.json({ triggered: false, message: 'No se detectaron palabras prohibidas.' })
  }

  // ── Trigger stop-publishing ────────────────────────────────────────────────
  if (!config.publishing_paused) {
    const reason = `Palabra prohibida detectada en comentario: "${foundWord}"${post_url ? ` — Post: ${post_url}` : ''}`

    await supabase.from('guardian_config').update({
      publishing_paused: true,
      publishing_paused_reason: reason,
      publishing_paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('is_active', true)

    const { data: alertRow } = await supabase.from('guardian_alerts').insert({
      trigger_type: 'prohibited_word',
      trigger_detail: {
        word_found: foundWord,
        comment_text: comment_text.slice(0, 500),
        post_url: post_url ?? null,
        reason,
      },
      posts_affected: 0,
      alert_sent: false,
    }).select('id').single()

    // Send WhatsApp alert
    if (config.alert_phone) {
      const msg =
        `🚨 ALERTA GUARDIAN — Publicación pausada\n\n` +
        `Motivo: Palabra prohibida detectada\n` +
        `Palabra: "${foundWord}"\n` +
        (post_url ? `Post: ${post_url}\n` : '') +
        `\nPublicación bloqueada. Ve a Dashboard → Guardian → Reanudar publicación cuando sea seguro.`

      await sendWhatsAppText(config.alert_phone, msg)

      if (alertRow?.id) {
        await supabase.from('guardian_alerts').update({ alert_sent: true }).eq('id', alertRow.id)
      }
    }
  }

  return NextResponse.json({
    triggered: true,
    word_found: foundWord,
    publishing_paused: true,
    message: `Palabra prohibida detectada: "${foundWord}". Publicación pausada y alerta enviada.`,
  })
}

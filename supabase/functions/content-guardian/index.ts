import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''

// ─── WhatsApp send ─────────────────────────────────────────────────────────────
async function sendWhatsAppAlert(to: string, message: string): Promise<void> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN || !to) return

  const normalizedTo = to.replace(/\D/g, '')
  await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: { body: message },
    }),
  })
}

// ─── Engagement rate calculation ───────────────────────────────────────────────
function calcEngagementPct(row: Record<string, number>): number {
  const { likes_count = 0, comments_count = 0, shares_count = 0, views_count = 0, reach_count = 0 } = row
  const numerator = likes_count * 1 + comments_count * 3 + shares_count * 5
  const denominator = Math.max(views_count, reach_count, 1)
  return (numerator / denominator) * 100
}

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Validate secret (cron or manual trigger)
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (token !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const startedAt = Date.now()
  const log: string[] = []

  try {
    // ── 1. Load guardian config ────────────────────────────────────────────────
    const { data: config, error: configErr } = await supabase
      .from('guardian_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configErr || !config) {
      return new Response(JSON.stringify({ error: 'guardian_config not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const {
      engagement_threshold_pct,
      min_posts_for_trigger,
      monitoring_window_days,
      alert_phone,
      publishing_paused,
    } = config

    log.push(`Config loaded — threshold: ${engagement_threshold_pct}% | window: ${monitoring_window_days}d | min_posts: ${min_posts_for_trigger}`)

    // Skip check if already paused
    if (publishing_paused) {
      log.push('Publishing already paused — skipping engagement check')
      return new Response(
        JSON.stringify({ status: 'already_paused', log }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Load recent content_outcomes with engagement data ───────────────────
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - monitoring_window_days)

    const { data: outcomes, error: outcomesErr } = await supabase
      .from('content_outcomes')
      .select('id, likes_count, comments_count, shares_count, views_count, reach_count, variant_type, platform, published_at, post_url')
      .in('scrape_status', ['success', 'manual'])
      .gte('published_at', windowStart.toISOString())
      .order('published_at', { ascending: false })

    if (outcomesErr) {
      return new Response(JSON.stringify({ error: outcomesErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!outcomes || outcomes.length < min_posts_for_trigger) {
      log.push(`Not enough posts to evaluate (${outcomes?.length ?? 0}/${min_posts_for_trigger} required)`)
      return new Response(
        JSON.stringify({ status: 'insufficient_data', posts_found: outcomes?.length ?? 0, log }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Calculate engagement rates for the last N posts ────────────────────
    const recentPosts = outcomes.slice(0, min_posts_for_trigger)
    const rates = recentPosts.map((o) => ({
      id: o.id,
      post_url: o.post_url,
      rate: calcEngagementPct(o as Record<string, number>),
      variant_type: o.variant_type,
      published_at: o.published_at,
    }))

    const avgRate = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length
    const belowThreshold = rates.filter((r) => r.rate < engagement_threshold_pct)

    log.push(`Last ${min_posts_for_trigger} posts avg engagement: ${avgRate.toFixed(2)}% (threshold: ${engagement_threshold_pct}%)`)
    log.push(`Posts below threshold: ${belowThreshold.length}/${min_posts_for_trigger}`)

    // Trigger if ALL of the last N posts are below threshold
    if (belowThreshold.length < min_posts_for_trigger) {
      log.push('Engagement OK — no action needed')
      return new Response(
        JSON.stringify({ status: 'ok', avg_engagement_pct: avgRate, log }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Trigger: stop publishing ────────────────────────────────────────────
    const reason = `Engagement promedio ${avgRate.toFixed(2)}% — por debajo del umbral ${engagement_threshold_pct}% en los últimos ${min_posts_for_trigger} posts`

    await supabase.from('guardian_config').update({
      publishing_paused: true,
      publishing_paused_reason: reason,
      publishing_paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('is_active', true)

    log.push('publishing_paused = true set in guardian_config')

    // ── 5. Log the alert ───────────────────────────────────────────────────────
    const { data: alertRow } = await supabase.from('guardian_alerts').insert({
      trigger_type: 'low_engagement',
      trigger_detail: {
        avg_engagement_pct: avgRate,
        threshold_pct: engagement_threshold_pct,
        posts_evaluated: recentPosts.map((p) => ({ id: p.id, post_url: p.post_url, rate: calcEngagementPct(p as Record<string, number>) })),
        reason,
      },
      posts_affected: belowThreshold.length,
      avg_engagement_pct: avgRate,
      alert_sent: false,
    }).select('id').single()

    // ── 6. Send WhatsApp alert ─────────────────────────────────────────────────
    const alertMessage =
      `🚨 ALERTA GUARDIAN — Publicación pausada\n\n` +
      `Motivo: Engagement bajo\n` +
      `Promedio: ${avgRate.toFixed(2)}% (umbral: ${engagement_threshold_pct}%)\n` +
      `Posts analizados: ${min_posts_for_trigger}\n\n` +
      `Todos los posts en estado "Aprobado" están bloqueados hasta que reanudes la publicación desde el dashboard.\n\n` +
      `Para reanudar: ve a Dashboard → Guardian → Reanudar publicación.`

    await sendWhatsAppAlert(alert_phone, alertMessage)

    if (alertRow?.id) {
      await supabase.from('guardian_alerts').update({ alert_sent: true }).eq('id', alertRow.id)
    }

    log.push(`WhatsApp alert sent to ${alert_phone || '(no phone configured)'}`)

    return new Response(
      JSON.stringify({
        status: 'triggered',
        trigger_type: 'low_engagement',
        avg_engagement_pct: avgRate,
        posts_affected: belowThreshold.length,
        execution_ms: Date.now() - startedAt,
        log,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message, log }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

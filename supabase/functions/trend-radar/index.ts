import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Fallback niche description (used when business_domain has no niche field) ───
const NICHE_DESCRIPTION =
  'CancioBot: negocio que crea canciones personalizadas para latinos migrantes en EE.UU. ' +
  'que quieren regalar algo emocionalmente significativo para ocasiones especiales ' +
  '(Día de las Madres, cumpleaños, boda, aniversario). ' +
  'Avatar: migrante latino en EE.UU., 28-45 años, familia en México, Honduras, Guatemala, Cuba o Puerto Rico. ' +
  'Gasto promedio $40-60 USD por regalo. Canal principal: WhatsApp y Facebook.'

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// ─── Tavily search helper ──────────────────────────────────────────────────────
async function tavilySearch(query: string, apiKey: string): Promise<Record<string, unknown> | null> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 5,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

function summarizeResults(result: Record<string, unknown> | null): string {
  if (!result) return 'Sin resultados'
  const parts: string[] = []
  if (result.answer) parts.push(`Resumen: ${result.answer}`)
  const results = result.results as Array<{ title: string; content?: string }> | undefined
  if (results?.length) {
    parts.push(
      ...results.slice(0, 3).map((r) => `- ${r.title}: ${r.content?.slice(0, 200) ?? ''}`)
    )
  }
  return parts.join('\n') || 'Sin resultados útiles'
}

// ─── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const startTime = Date.now()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Auth — validate cron secret (skip if CRON_SECRET not set, for local dev)
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (cronSecret) {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Create row early (status='running') for live observability
  const { data: trendRow, error: initErr } = await supabase
    .from('weekly_trends')
    .insert({ status: 'running', theme_json: {}, reasoning: '', source: 'cron' })
    .select('id')
    .single()

  if (initErr || !trendRow) {
    return new Response(
      JSON.stringify({ error: 'DB init failed', detail: initErr?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const trendId: string = trendRow.id

  try {
    // ── Phase 1: Most recent avatar ──────────────────────────────────────────
    const { data: avatar } = await supabase
      .from('avatars')
      .select('id, name, origin, residence, musical_style, profile_json')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ── Phase 2: Avatar pains ────────────────────────────────────────────────
    const pains: string[] = []

    if (avatar?.id) {
      const { data: insights } = await supabase
        .from('avatar_insights')
        .select('insight_type, content')
        .eq('avatar_id', avatar.id)
        .in('insight_type', ['pain_point', 'emotional_trigger'])

      if (insights) {
        pains.push(...insights.map((i) => `[${i.insight_type}] ${i.content}`))
      }
    }

    // Supplement with profile_json barriers
    if (avatar?.profile_json && typeof avatar.profile_json === 'object') {
      const profile = avatar.profile_json as Record<string, unknown>
      const barriers = profile.top_barriers as string[] | undefined
      if (barriers) {
        pains.push(...barriers.map((b) => `[barrier] ${b}`))
      }
    }

    // ── Phase 3: Tavily searches ─────────────────────────────────────────────
    const tavilyKey = Deno.env.get('TAVILY_API_KEY')!
    const now = new Date()
    const mes = MONTHS_ES[now.getMonth()]
    const anio = now.getFullYear()

    const [r1, r2, r3] = await Promise.all([
      tavilySearch(
        `canciones personalizadas regalos latinos tendencias ${mes} ${anio}`,
        tavilyKey
      ),
      tavilySearch(
        `fechas especiales familia latina ${mes} ${anio} Estados Unidos`,
        tavilyKey
      ),
      tavilySearch(
        `contenido viral Instagram Facebook latinos migrantes ${mes} ${anio}`,
        tavilyKey
      ),
    ])

    const searchResultsRaw = { query1: r1, query2: r2, query3: r3 }

    const searchSummary = `
BÚSQUEDA 1 — Tendencias del nicho (${mes} ${anio}):
${summarizeResults(r1)}

BÚSQUEDA 2 — Fechas culturales y familiares:
${summarizeResults(r2)}

BÚSQUEDA 3 — Comportamiento de contenido viral latinos migrantes:
${summarizeResults(r3)}
    `.trim()

    // ── Phase 4: IA intersection ─────────────────────────────────────────────
    const avatarContext = avatar
      ? `Avatar activo: ${avatar.name} | ${avatar.origin} → ${avatar.residence} | Estilo: ${avatar.musical_style}`
      : 'Avatar: perfil genérico de migrante latino en EE.UU.'

    const painsText =
      pains.length > 0
        ? pains.join('\n')
        : 'Datos de avatar no disponibles — usar perfil genérico CancioBot'

    const iaPrompt = `Eres un estratega de marketing para negocios latinos en EE.UU.

NEGOCIO:
${NICHE_DESCRIPTION}

${avatarContext}

DOLORES ACTIVOS DEL AVATAR:
${painsText}

RESULTADOS DE BÚSQUEDA (${mes} ${anio}):
${searchSummary}

TAREA:
Analiza las tendencias encontradas y los dolores del avatar. Genera el "tema semanal" de contenido que:
1. Conecta UNA tendencia real con UN dolor emocional del avatar
2. Sea urgente para esta semana específica (${mes} ${anio})
3. Tenga potencial de resonancia emocional alta (nostalgia, familia, logro, distancia)
4. Se pueda convertir en 7 posts de contenido (reel, carousel, ad, broadcast)

Responde SOLO con JSON válido — sin texto adicional, sin markdown, sin bloques de código:
{
  "weekly_theme": "frase de 5-10 palabras en español — el tema de la semana",
  "reasoning": "mínimo 100 palabras explicando POR QUÉ este tema esta semana: qué tendencia usaste, qué dolor conecta, por qué es urgente ahora",
  "trend_applied": {
    "titulo": "nombre de la tendencia usada",
    "fuente": "de cuál búsqueda viene (búsqueda 1, 2 o 3)",
    "por_que_esta_y_no_las_otras": "razón en 30 palabras"
  },
  "trend_why_now": "por qué esta tendencia es más fuerte ESTA semana vs otras",
  "pain_addressed": {
    "tipo": "pain_point | emotional_trigger | barrier",
    "descripcion": "el dolor específico que conecta"
  },
  "pain_mechanism": "el puente emocional exacto entre la tendencia y el dolor",
  "confidence": "high | medium | low",
  "confidence_reason": "por qué ese nivel de confianza",
  "urgency": {
    "nivel": "alta | media | baja",
    "explicacion": "por qué ahora y no en 2 semanas"
  },
  "suggested_channels": ["Instagram", "Facebook"],
  "risks": "qué podría salir mal con este tema",
  "alternative_theme": {
    "theme": "tema alternativo si el principal no convence",
    "reasoning": "por qué este también podría funcionar"
  }
}`

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.3,
        messages: [{ role: 'user', content: iaPrompt }],
      }),
    })

    if (!orRes.ok) {
      throw new Error(`OpenRouter error ${orRes.status}: ${await orRes.text()}`)
    }

    const orData = await orRes.json()
    const rawContent: string = orData.choices[0].message.content.trim()

    // Strip markdown fences if model adds them
    const cleanContent = rawContent
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim()

    const themeJson = JSON.parse(cleanContent)

    const executionMs = Date.now() - startTime

    // ── Phase 5: Persist results ─────────────────────────────────────────────
    await supabase
      .from('weekly_trends')
      .update({
        avatar_id: avatar?.id ?? null,
        avatar_name: avatar?.name ?? 'Perfil genérico',
        theme_json: themeJson,
        reasoning: themeJson.reasoning ?? '',
        status: 'success',
        search_results_raw: searchResultsRaw,
        execution_ms: executionMs,
      })
      .eq('id', trendId)

    // ── Phase 6: WhatsApp notification to admin ──────────────────────────────
    const adminNumber = Deno.env.get('ADMIN_WHATSAPP_NUMBER') ?? ''
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''

    if (adminNumber && waPhoneId && waToken) {
      const urgencyEmoji =
        themeJson.urgency?.nivel === 'alta' ? '🔥' : themeJson.urgency?.nivel === 'media' ? '⚡' : '📌'

      const notifMsg =
        `🎯 *Tema Semanal — Trend Radar*\n\n` +
        `*"${themeJson.weekly_theme}"*\n\n` +
        `📊 Confianza: ${themeJson.confidence}\n` +
        `${urgencyEmoji} Urgencia: ${themeJson.urgency?.nivel}\n\n` +
        `📌 Tendencia: ${themeJson.trend_applied?.titulo ?? 'N/A'}\n` +
        `💔 Dolor: ${themeJson.pain_addressed?.descripcion ?? 'N/A'}\n\n` +
        `_${String(themeJson.reasoning ?? '').slice(0, 220)}..._\n\n` +
        `→ Corre /feed-generator con este tema`

      await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: adminNumber.replace(/\D/g, ''),
          type: 'text',
          text: { body: notifMsg },
        }),
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        trend_id: trendId,
        weekly_theme: themeJson.weekly_theme,
        confidence: themeJson.confidence,
        urgency: themeJson.urgency?.nivel,
        execution_ms: executionMs,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await supabase
      .from('weekly_trends')
      .update({
        status: 'error',
        error_message: errorMessage,
        execution_ms: Date.now() - startTime,
      })
      .eq('id', trendId)

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, trend_id: trendId }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

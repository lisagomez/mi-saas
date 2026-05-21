import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { openrouter, MODELS, estimateCost } from '@/lib/ai/openrouter'
import { logAiUsage } from '@/features/whatsapp-bot/services/log-ai-usage'

const MODEL = MODELS.fast

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawPost {
  id: string
  format: string
  status: string
  avatar_id: string | null
  prompt_template: string | null
  body: string | null
}

interface RawAvatar {
  name: string
  origin: string
  residence: string
  musical_style: string | null
  profile_json: Record<string, unknown>
}

interface RawInsight {
  insight_type: string
  content: string
}

interface OrganicJson {
  reel?: { hook: string; script: string; cta: string; hashtags: string[] }
  carousel?: { slide_1: string; slides_desarrollo: string[]; slide_cierre: string; caption: string }
  post?: { apertura: string; desarrollo: string; cta: string }
}

interface PaidJson {
  fb_ad?: { headline: string; body: string; cta: string }
  whatsapp_broadcast?: { mensaje: string; cta: string }
}

interface AuditResult {
  brand_voice: { pass: boolean }
  cta_compliance: { pass: boolean }
  avatar_pain_alignment: { pass: boolean }
  framework_integrity: { pass: boolean }
  overall: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dialectRule(origin: string): string {
  const o = origin.toLowerCase()
  if (o.includes('honduras') || o.includes('guatemala') || o.includes('el salvador') || o.includes('méx') || o.includes('mex') || o.includes('cuba') || o.includes('puerto rico') || o.includes('colombia') || o.includes('perú') || o.includes('venezuela')) {
    return `TUTEO OBLIGATORIO — origen: ${origin}
❌ PROHIBIDO ABSOLUTAMENTE: imaginá, regalá, hacé, sentís, extrañás, acordate, mirá, decile, podés, tenés, sos, querés, vas, sabés, venís, chequeá (cualquier forma de "vos")
✅ CORRECTO: imagina, regala, haz, sientes, extrañas, recuerda, mira, dile, puedes, tienes, eres, quieres, vas, sabes, vienes, chequea
Ejemplos correctos: "¿Te acuerdas de Honduras?", "Regálale una canción", "¿Puedes imaginar su sonrisa?", "Hazlo especial"
VERIFICA CADA VERBO ANTES DE ESCRIBIRLO: si termina en -ás, -és, -ís → es voseo → REEMPLÁZALO con la forma de tú.`
  }
  if (o.includes('argentin') || o.includes('uruguay')) {
    return `VOSEO RIOPLATENSE OBLIGATORIO — origen: ${origin}
Usar siempre: imaginá, regalá, hacé, sentís, extrañás, acordate, mirá, podés, tenés, sos
PROHIBIDO: imagina, regala, haz, sientes, extrañas (formas de tú)`
  }
  return `TUTEO OBLIGATORIO (forma por defecto)
❌ PROHIBIDO: imaginá, regalá, hacé, sentís, extrañás, acordate (voseo rioplatense)
✅ CORRECTO: imagina, regala, haz, sientes, extrañas, recuerda`
}

function parseJsonSafe(text: string): Record<string, unknown> | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try { return JSON.parse(match[0]) as Record<string, unknown> } catch { return null }
  }
}

function formatOrganicReel(r: OrganicJson['reel']): string {
  if (!r) return ''
  const tags = Array.isArray(r.hashtags) ? r.hashtags.join(' ') : ''
  return `🎬 Hook:\n${r.hook}\n\n📝 Script:\n${r.script}\n\n💬 CTA: ${r.cta}\n#️⃣ ${tags}`
}

function formatOrganicCarousel(c: OrganicJson['carousel']): string {
  if (!c) return ''
  const dev = Array.isArray(c.slides_desarrollo)
    ? c.slides_desarrollo.map((s, i) => `Slide ${i + 2}: ${s}`).join('\n')
    : String(c.slides_desarrollo ?? '')
  return `Slide 1 (Portada):\n${c.slide_1}\n\n${dev}\n\nCierre:\n${c.slide_cierre}\n\n📋 Caption:\n${c.caption}`
}

function formatOrganicPost(p: OrganicJson['post']): string {
  if (!p) return ''
  return `${p.apertura}\n\n${p.desarrollo}\n\n${p.cta}`
}

function formatFbAd(a: PaidJson['fb_ad']): string {
  if (!a) return ''
  return `📣 ${a.headline}\n\n${a.body}\n\n👉 ${a.cta}`
}

function formatWhatsApp(w: PaidJson['whatsapp_broadcast']): string {
  if (!w) return ''
  return `${w.mensaje}\n\n${w.cta}`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { post_id } = (await req.json()) as { post_id: string }
    if (!post_id) return NextResponse.json({ error: 'post_id requerido' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // 1. Cargar post
    const { data: post } = await supabase
      .from('posts')
      .select('id, format, status, avatar_id, prompt_template, body')
      .eq('id', post_id)
      .single() as { data: RawPost | null }

    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
    if (post.status !== 'Aprobado') {
      return NextResponse.json({ error: 'Solo posts en estado Aprobado pueden generar piezas' }, { status: 400 })
    }

    // 2. Idempotencia — si ya hay piezas para este post, devolver las existentes
    const { data: existing } = await supabase
      .from('content_pieces')
      .select('id')
      .eq('post_id', post_id)
      .limit(1) as { data: { id: string }[] | null }

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Piezas ya generadas para este post', post_id }, { status: 200 })
    }

    // 3. Cargar avatar
    let avatarProfile = ''
    let avatarOrigin = ''
    if (post.avatar_id) {
      const { data: avatar } = await supabase
        .from('avatars')
        .select('name, origin, residence, musical_style, profile_json')
        .eq('id', post.avatar_id)
        .single() as { data: RawAvatar | null }

      if (avatar) {
        avatarOrigin = avatar.origin ?? ''
        const profile = avatar.profile_json ?? {}
        const motivators = Array.isArray(profile.top_motivators)
          ? (profile.top_motivators as string[]).join('; ') : ''
        const barriers = Array.isArray(profile.top_barriers)
          ? (profile.top_barriers as string[]).join('; ') : ''
        avatarProfile = `Avatar: ${avatar.name}
Origen: ${avatar.origin} | Residencia: ${avatar.residence}
Estilo musical: ${avatar.musical_style ?? ''}
Motivadores: ${motivators}
Barreras: ${barriers}
Gancho recomendado: ${String(profile.recommended_hook ?? '')}`
      }
    }

    // 4. Cargar insights
    let insightsBlock = ''
    if (post.avatar_id) {
      const { data: insights } = await supabase
        .from('avatar_insights')
        .select('insight_type, content')
        .eq('avatar_id', post.avatar_id)
        .order('created_at', { ascending: false })
        .limit(5) as { data: RawInsight[] | null }
      if (insights?.length) {
        insightsBlock = '\nInsights:\n' + insights.map((i) => `[${i.insight_type}] ${i.content}`).join('\n')
      }
    }

    const fullProfile = [avatarProfile, insightsBlock].filter(Boolean).join('\n')
    const insightToWork = post.prompt_template ?? post.body ?? `Contenido ${post.format} para CancioBot`
    const dialect = dialectRule(avatarOrigin)

    let totalInput = 0
    let totalOutput = 0

    // ── LLAMADA 1: Orgánico PAS (3 formatos) ──────────────────────────────────
    const { text: organicText, usage: organicUsage } = await generateText({
      model: openrouter(MODEL),
      system: `Eres copywriter para migrantes latinos en EE.UU. Tono cálido, coloquial. Responde SOLO con JSON válido. Sin markdown.`,
      prompt: `⚠️ REGLA DIALECTAL — APLICAR EN CADA PALABRA DEL OUTPUT:
${dialect}

AVATAR:\n${fullProfile}\n\nINSIGHT:\n${insightToWork}

FRAMEWORK: PAS (Problem → Agitation → Solution). Contenido ORGÁNICO para engagement.
Genera los 3 formatos en un solo JSON:

{
  "reel": {
    "hook": "Primera línea que detiene el scroll (máx 8 palabras)",
    "script": "Guión Reel, máx 45s de lectura",
    "cta": "Llamado a comentar/compartir (NO comprar)",
    "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
  },
  "carousel": {
    "slide_1": "Portada — el problema en una frase",
    "slides_desarrollo": ["slide 2","slide 3","slide 4"],
    "slide_cierre": "Slide final con solución + CTA suave",
    "caption": "Texto del post, máx 150 palabras"
  },
  "post": {
    "apertura": "Primera línea (problema nombrado)",
    "desarrollo": "Agitación + solución, 3-4 párrafos cortos",
    "cta": "Pregunta que invite a comentar"
  }
}`,
      maxOutputTokens: 2500,
      temperature: 0.7,
    })
    totalInput += organicUsage?.inputTokens ?? 0
    totalOutput += organicUsage?.outputTokens ?? 0

    const organicJson = parseJsonSafe(organicText) as OrganicJson | null

    // ── LLAMADA 2: Pauta AIDA ─────────────────────────────────────────────────
    const { text: paidText, usage: paidUsage } = await generateText({
      model: openrouter(MODEL),
      system: `Eres copywriter de performance marketing para migrantes latinos en EE.UU. Responde SOLO con JSON válido. Sin markdown.`,
      prompt: `⚠️ REGLA DIALECTAL — APLICAR EN CADA PALABRA DEL OUTPUT:
${dialect}

AVATAR:\n${fullProfile}\n\nINSIGHT:\n${insightToWork}

FRAMEWORK: AIDA (Attention → Interest → Desire → Action). Contenido PAGADO orientado a CONVERSIÓN.
Genera ambos formatos en un solo JSON:

{
  "fb_ad": {
    "headline": "Titular del anuncio (máx 10 palabras, fuerza el problema)",
    "body": "Cuerpo del ad: interés + deseo + urgencia (máx 200 palabras)",
    "cta": "Llamado a acción directo (ej: Pídela aquí → [LINK])"
  },
  "whatsapp_broadcast": {
    "mensaje": "Mensaje conversacional, personalizado, como si fuera de amigo (máx 150 palabras)",
    "cta": "CTA directo con link o instrucción"
  }
}`,
      maxOutputTokens: 1200,
      temperature: 0.7,
    })
    totalInput += paidUsage?.inputTokens ?? 0
    totalOutput += paidUsage?.outputTokens ?? 0

    const paidJson = parseJsonSafe(paidText) as PaidJson | null

    // ── LLAMADA 3: Auditoría del copy orgánico ────────────────────────────────
    const organicSample = organicJson?.reel ? formatOrganicReel(organicJson.reel) : (post.body ?? '')
    let auditScore = 0
    if (organicSample) {
      const { text: auditText, usage: auditUsage } = await generateText({
        model: openrouter(MODEL),
        system: 'Eres auditor de marketing. Responde SOLO con JSON válido.',
        prompt: `Evalúa el copy orgánico. AVATAR: ${avatarProfile}

COPY:
${organicSample}

Responde SOLO con JSON:
{
  "brand_voice": { "pass": true },
  "cta_compliance": { "pass": true },
  "avatar_pain_alignment": { "pass": true },
  "framework_integrity": { "pass": true },
  "overall": true
}

REGLAS:
C1 brand_voice: PASS si tono cálido, familiar, español coloquial.
C2 cta_compliance: PASS si CTA invita a comentar/compartir/guardar (NO venta directa).
C3 avatar_pain_alignment: PASS si nombra un dolor específico del avatar.
C4 framework_integrity: PASS si Problem→Agitation→Solution es reconocible.`,
        maxOutputTokens: 400,
        temperature: 0.1,
      })
      totalInput += auditUsage?.inputTokens ?? 0
      totalOutput += auditUsage?.outputTokens ?? 0
      const auditParsed = parseJsonSafe(auditText) as AuditResult | null
      if (auditParsed) {
        auditScore = [
          auditParsed.brand_voice?.pass,
          auditParsed.cta_compliance?.pass,
          auditParsed.avatar_pain_alignment?.pass,
          auditParsed.framework_integrity?.pass,
        ].filter(Boolean).length
      }
    }

    // ── Calcular costo total ──────────────────────────────────────────────────
    const totalCostUsd = estimateCost(MODEL, totalInput, totalOutput) ?? 0
    const costPerPiece = totalCostUsd / 5 // 5 piezas en total

    // ── Construir piezas ──────────────────────────────────────────────────────
    type PieceInsert = {
      post_id: string
      format: string
      tipo: string
      red_social: string[]
      body: string
      token_cost_usd: number
      audit_score: number | null
    }

    const pieces: PieceInsert[] = []

    if (organicJson?.reel) {
      const body = formatOrganicReel(organicJson.reel)
      if (body) pieces.push({ post_id, format: 'Reel', tipo: 'organico', red_social: ['Instagram', 'TikTok'], body, token_cost_usd: costPerPiece, audit_score: auditScore })
    }
    if (organicJson?.carousel) {
      const body = formatOrganicCarousel(organicJson.carousel)
      if (body) pieces.push({ post_id, format: 'Carousel', tipo: 'organico', red_social: ['Instagram', 'Facebook'], body, token_cost_usd: costPerPiece, audit_score: auditScore })
    }
    if (organicJson?.post) {
      const body = formatOrganicPost(organicJson.post)
      if (body) pieces.push({ post_id, format: 'Post', tipo: 'organico', red_social: ['Facebook', 'Instagram'], body, token_cost_usd: costPerPiece, audit_score: auditScore })
    }
    if (paidJson?.fb_ad) {
      const body = formatFbAd(paidJson.fb_ad)
      if (body) pieces.push({ post_id, format: 'FB Ad', tipo: 'pauta', red_social: ['Facebook'], body, token_cost_usd: costPerPiece, audit_score: null })
    }
    if (paidJson?.whatsapp_broadcast) {
      const body = formatWhatsApp(paidJson.whatsapp_broadcast)
      if (body) pieces.push({ post_id, format: 'WhatsApp Broadcast', tipo: 'pauta', red_social: ['WhatsApp'], body, token_cost_usd: costPerPiece, audit_score: null })
    }

    if (pieces.length === 0) {
      return NextResponse.json({ error: 'No se pudo generar ninguna pieza (error de parseo LLM)' }, { status: 500 })
    }

    await supabase.from('content_pieces').insert(pieces)

    logAiUsage({
      leadId: null,
      model: MODEL,
      tokensInput: totalInput,
      tokensOutput: totalOutput,
      costUsd: totalCostUsd,
    }).catch(() => {})

    return NextResponse.json({
      pieces_created: pieces.length,
      audit_score: auditScore,
      token_cost_usd: totalCostUsd,
      post_id,
    })
  } catch (err) {
    console.error('[content/generate-pieces]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando piezas' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { openrouter, MODELS, estimateCost } from '@/lib/ai/openrouter'
import { logAiUsage } from '@/features/whatsapp-bot/services/log-ai-usage'

const PAS_FORMATS = ['Reel', 'Carousel', 'Post', 'Story']
const MODEL_GEN = MODELS.fast   // temperature 0.7
const MODEL_AUDIT = MODELS.fast // temperature 0.1

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawPost {
  id: string
  format: string
  status: string
  avatar_id: string | null
  prompt_template: string | null
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

interface AuditResult {
  brand_voice: { pass: boolean; reason: string; fixes: string }
  cta_compliance: { pass: boolean; reason: string; fixes: string }
  avatar_pain_alignment: { pass: boolean; reason: string; fixes: string }
  framework_integrity: { pass: boolean; reason: string; fixes: string }
  overall: boolean
  correction_brief: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dialectRule(origin: string): string {
  const o = origin.toLowerCase()
  if (o.includes('honduras') || o.includes('guatemala') || o.includes('el salvador') || o.includes('méx') || o.includes('mex')) {
    return 'Usar "tú": "¿Te acuerdas?", "Regálale", "Comenta". PROHIBIDO voseo rioplatense ("regalás", "acordás").'
  }
  if (o.includes('argentin') || o.includes('uruguay')) {
    return 'Usar voseo rioplatense: "¿Te acordás?", "Regalá", "Comentá". PROHIBIDO formas de tú.'
  }
  return 'Usar "tú" o "usted" según contexto. PROHIBIDO voseo rioplatense.'
}

function formatCopy(format: string, parsed: Record<string, unknown>): string {
  if (format === 'Reel' || format === 'Story') {
    const r = parsed.formato_reel as Record<string, unknown> | undefined
    if (!r) return JSON.stringify(parsed, null, 2)
    const hashtags = Array.isArray(r.hashtags) ? (r.hashtags as string[]).join(' ') : String(r.hashtags ?? '')
    return `🎬 Hook:\n${r.hook}\n\n📝 Script:\n${r.script}\n\n💬 CTA: ${r.cta}\n#️⃣ ${hashtags}`
  }
  if (format === 'Carousel') {
    const c = parsed.formato_carousel as Record<string, unknown> | undefined
    if (!c) return JSON.stringify(parsed, null, 2)
    const dev = Array.isArray(c.slides_desarrollo)
      ? (c.slides_desarrollo as string[]).map((s, i) => `Slide ${i + 2}: ${s}`).join('\n')
      : String(c.slides_desarrollo ?? '')
    return `Slide 1 (Portada):\n${c.slide_1}\n\n${dev}\n\nCierre:\n${c.slide_cierre}\n\n📋 Caption:\n${c.caption}`
  }
  if (format === 'Post') {
    const p = parsed.formato_facebook_post as Record<string, unknown> | undefined
    if (!p) return JSON.stringify(parsed, null, 2)
    return `${p.apertura}\n\n${p.desarrollo}\n\n${p.cta}`
  }
  return JSON.stringify(parsed, null, 2)
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

// ─── Generation ───────────────────────────────────────────────────────────────

async function generateCopy(
  format: string,
  fullProfile: string,
  insightToWork: string,
  dialect: string,
  correctionBrief?: string
): Promise<{ body: string; rawText: string; inputTokens: number; outputTokens: number }> {
  const correctionBlock = correctionBrief
    ? `\nEl intento anterior falló la auditoría.\nProblemas específicos a corregir:\n${correctionBrief}\nRe-genera el copy corrigiendo exactamente esos puntos. No cambies lo que no falló.\n`
    : ''

  const { text, usage } = await generateText({
    model: openrouter(MODEL_GEN),
    system: `Eres un copywriter especialista en marketing para migrantes latinos en EE.UU.
Tu tono: cálido, directo, en español latinoamericano coloquial. Sin anglicismos forzados.
VARIANTE DIALECTAL OBLIGATORIA: ${dialect}
Responde SOLO con JSON válido. Sin markdown, sin explicaciones adicionales.`,
    prompt: `AVATAR:
${fullProfile}
${correctionBlock}
INSIGHT A TRABAJAR:
${insightToWork}

FRAMEWORK: PAS (Problem → Agitation → Solution)
Genera copy orgánico para engagement. El objetivo es que comenten, compartan y guarden.
NO es venta directa. Es identificación emocional.

Responde SOLO con JSON válido:
{
  "formato_reel": {
    "hook": "Primera línea que para el scroll (máx 8 palabras)",
    "script": "Guión completo del Reel, máx 45 segundos de lectura",
    "cta": "Llamado a comentar o compartir (NO a comprar)",
    "hashtags": ["#tag1", "#tag2"]
  },
  "formato_carousel": {
    "slide_1": "Portada — el problema en una frase",
    "slides_desarrollo": ["slide 2", "slide 3", "slide 4"],
    "slide_cierre": "Slide final con solución + CTA suave",
    "caption": "Texto del post, máx 150 palabras"
  },
  "formato_facebook_post": {
    "apertura": "Primera línea (el problema nombrado)",
    "desarrollo": "Agitación + solución en 3-4 párrafos cortos",
    "cta": "Pregunta que invite a comentar"
  }
}`,
    maxOutputTokens: 2000,
    temperature: 0.7,
  })

  const parsed = parseJsonSafe(text)
  if (!parsed) throw new Error('No se pudo parsear la respuesta del LLM')
  const body = formatCopy(format, parsed)
  return { body, rawText: text, inputTokens: usage?.inputTokens ?? 0, outputTokens: usage?.outputTokens ?? 0 }
}

// ─── Audit ────────────────────────────────────────────────────────────────────

async function auditCopy(
  body: string,
  format: string,
  avatarProfile: string
): Promise<AuditResult> {
  const frameworkDescription = 'PAS: Problem → Agitation → Solution'

  const { text } = await generateText({
    model: openrouter(MODEL_AUDIT),
    system: 'Eres un auditor de contenido de marketing. Responde SOLO con JSON válido.',
    prompt: `Eres un auditor de contenido de marketing para negocios de migrantes latinos en EE.UU.
Tu única función: evaluar el copy generado contra 4 criterios y dar feedback accionable.
No opines sobre el negocio. No mejores lo que no falló. Solo audita.

CONTENIDO A AUDITAR:
${body}

FORMATO: ${format}
FRAMEWORK ESPERADO: ${frameworkDescription}

PERFIL DEL AVATAR:
${avatarProfile}

---

Evalúa los 4 criterios. Responde SOLO con JSON válido (sin fences, sin texto extra):

{
  "brand_voice": { "pass": true, "reason": "...", "fixes": "" },
  "cta_compliance": { "pass": true, "reason": "...", "fixes": "" },
  "avatar_pain_alignment": { "pass": true, "reason": "...", "fixes": "" },
  "framework_integrity": { "pass": true, "reason": "...", "fixes": "" },
  "overall": true,
  "correction_brief": ""
}

REGLAS:
C1 — brand_voice: PASS si tono cálido, familiar, español coloquial. Sin anglicismos ni frases genéricas. FAIL si usa "check out", "upgrade", "la mejor calidad", etc.
C2 — cta_compliance (PAS): PASS si CTA invita a comentar/compartir/guardar. FAIL si empuja a compra directa.
C3 — avatar_pain_alignment: PASS si nombra un dolor específico del avatar y activa nostalgia/culpa/orgullo/urgencia. FAIL si dolor genérico.
C4 — framework_integrity (PAS): PASS si Problem → Agitation → Solution es reconocible en ese orden. FAIL si pasos desordenados o ausentes.

overall = true SOLO si los 4 criterios tienen pass=true.
correction_brief: instrucciones específicas para re-generar si hay fallas. Vacío si overall=true.`,
    maxOutputTokens: 800,
    temperature: 0.1,
  })

  const parsed = parseJsonSafe(text)
  if (!parsed) {
    return {
      brand_voice: { pass: false, reason: 'Error de parseo del auditor', fixes: '' },
      cta_compliance: { pass: false, reason: 'Error de parseo del auditor', fixes: '' },
      avatar_pain_alignment: { pass: false, reason: 'Error de parseo del auditor', fixes: '' },
      framework_integrity: { pass: false, reason: 'Error de parseo del auditor', fixes: '' },
      overall: false,
      correction_brief: 'Error de parseo — reintentar',
    }
  }
  return parsed as unknown as AuditResult
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { post_id } = (await req.json()) as { post_id: string }
    if (!post_id) return NextResponse.json({ error: 'post_id requerido' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // 1. Load post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, format, status, avatar_id, prompt_template')
      .eq('id', post_id)
      .single() as { data: RawPost | null; error: unknown }

    if (postError || !post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
    if (post.status !== 'Ideado') {
      return NextResponse.json({ error: 'Solo posts en estado Ideado pueden generarse' }, { status: 400 })
    }
    if (!PAS_FORMATS.includes(post.format)) {
      return NextResponse.json({ error: `Formato "${post.format}" no soportado aún` }, { status: 400 })
    }

    // 2. Load guardian config (autonomous_mode + publishing_paused)
    const { data: guardianRow } = await supabase
      .from('guardian_config')
      .select('autonomous_mode, publishing_paused, publishing_paused_reason')
      .eq('is_active', true)
      .single() as { data: { autonomous_mode: boolean; publishing_paused: boolean; publishing_paused_reason: string | null } | null }

    const autonomousMode = guardianRow?.autonomous_mode ?? false
    const publishingPaused = guardianRow?.publishing_paused ?? false
    const pausedReason = guardianRow?.publishing_paused_reason ?? null

    // 3. Load avatar profile
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
Gancho recomendado: ${profile.recommended_hook ?? ''}`
      }
    }

    // 4. Load avatar insights
    let insightsBlock = ''
    if (post.avatar_id) {
      const { data: insights } = await supabase
        .from('avatar_insights')
        .select('insight_type, content')
        .eq('avatar_id', post.avatar_id)
        .order('created_at', { ascending: false })
        .limit(5) as { data: RawInsight[] | null }

      if (insights?.length) {
        insightsBlock = '\nInsights del avatar:\n' + insights.map((i) => `[${i.insight_type}] ${i.content}`).join('\n')
      }
    }

    // 5. Load preferences directives
    let directivesBlock = ''
    {
      const { data: prefs } = await supabase
        .from('preferences_catalog')
        .select('directives')
        .eq('is_active', true)
        .limit(1) as { data: { directives: unknown }[] | null }

      if (prefs?.[0]?.directives) directivesBlock = `\nDirectivas del catálogo:\n${String(prefs[0].directives)}`
    }

    const fullProfile = [avatarProfile, insightsBlock, directivesBlock].filter(Boolean).join('\n')
    const insightToWork = post.prompt_template ?? `Generar contenido de formato ${post.format} para CancioBot`
    const dialect = dialectRule(avatarOrigin)

    let totalInputTokens = 0
    let totalOutputTokens = 0

    // ── MODO AUTÓNOMO: loop de hasta 3 intentos con auditoría ─────────────────
    if (autonomousMode) {
      const auditHistory: AuditResult[] = []
      let lastBody = ''
      let correctionBrief: string | undefined

      for (let attempt = 1; attempt <= 3; attempt++) {
        // Generar
        const gen = await generateCopy(post.format, fullProfile, insightToWork, dialect, correctionBrief)
        lastBody = gen.body
        totalInputTokens += gen.inputTokens
        totalOutputTokens += gen.outputTokens

        // Auditar
        const audit = await auditCopy(gen.body, post.format, avatarProfile)
        auditHistory.push(audit)

        if (audit.overall) {
          // PASS — determinar estado final según publishing_paused
          const finalStatus = publishingPaused ? 'Generado' : 'Aprobado'
          const pausedNote = publishingPaused
            ? `⛔ Guardian pausó la publicación: ${pausedReason ?? 'sin motivo registrado'}. Copy guardado en Generado.`
            : null

          await supabase
            .from('posts')
            .update({ body: gen.body, status: finalStatus, notes: pausedNote })
            .eq('id', post_id)

          logAiUsage({ leadId: null, orderId: null, model: MODEL_GEN, tokensInput: totalInputTokens, tokensOutput: totalOutputTokens, costUsd: estimateCost(MODEL_GEN, totalInputTokens, totalOutputTokens) }).catch(() => {})

          return NextResponse.json({
            body: gen.body,
            status: finalStatus,
            autonomous: true,
            attempts: attempt,
            audit_passed: true,
            publishing_paused: publishingPaused,
          })
        }

        correctionBrief = audit.correction_brief
      }

      // FAIL×3 — regresar a Ideado con el historial de audits en notes
      const failedCriteria = Object.entries(auditHistory[2])
        .filter(([k, v]) => k !== 'overall' && k !== 'correction_brief' && typeof v === 'object' && v !== null && !(v as AuditResult['brand_voice']).pass)
        .map(([k]) => k)

      const failNotes = `⚠️ ALERTA AUTÓNOMA: 3 intentos fallidos sin aprobar.\nFormato: ${post.format} | ${new Date().toISOString()}\nCriterios fallidos: ${failedCriteria.join(', ')}\nAudits: ${JSON.stringify(auditHistory)}`

      await supabase
        .from('posts')
        .update({ body: lastBody, status: 'Ideado', notes: failNotes })
        .eq('id', post_id)

      logAiUsage({ leadId: null, orderId: null, model: MODEL_GEN, tokensInput: totalInputTokens, tokensOutput: totalOutputTokens, costUsd: estimateCost(MODEL_GEN, totalInputTokens, totalOutputTokens) }).catch(() => {})

      return NextResponse.json({
        body: lastBody,
        status: 'Ideado',
        autonomous: true,
        attempts: 3,
        audit_passed: false,
        failed_criteria: failedCriteria,
        error: `Copy regresó a Ideado tras 3 intentos. Criterios fallidos: ${failedCriteria.join(', ')}`,
      }, { status: 422 })
    }

    // ── MODO MANUAL (human in the loop): generar una vez, dejar en Generado ──
    const gen = await generateCopy(post.format, fullProfile, insightToWork, dialect)
    totalInputTokens += gen.inputTokens
    totalOutputTokens += gen.outputTokens

    await supabase
      .from('posts')
      .update({ body: gen.body, status: 'Generado', notes: null })
      .eq('id', post_id)

    logAiUsage({ leadId: null, orderId: null, model: MODEL_GEN, tokensInput: totalInputTokens, tokensOutput: totalOutputTokens, costUsd: estimateCost(MODEL_GEN, totalInputTokens, totalOutputTokens) }).catch(() => {})

    return NextResponse.json({ body: gen.body, status: 'Generado', autonomous: false })
  } catch (err) {
    console.error('[content/generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando copy' },
      { status: 500 }
    )
  }
}

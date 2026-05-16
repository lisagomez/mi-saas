'use server'

import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { createAdminClient } from '@/lib/supabase/admin'
import type { JudgeRanking } from '../types/judge'

const JUDGE_MODEL = MODELS.fast // google/gemini-2.0-flash-001

interface AvatarInsightRow {
  id: string
  insight_type: string
  content: string
}

interface ProactiveInsightRow {
  id: string
  insight_type: string
  title: string
  body: string
  confidence: string
}

interface StrategyScoreRow {
  proactive_insight_id: string
  composite_score: number | null
  engagement_score: number | null
  dm_count: number | null
  save_count: number | null
  conversions: number | null
}

interface OverrideRow {
  suggested_id: string
  chosen_id: string
}

export async function rankInsightsWithJudge(avatarId: string): Promise<JudgeRanking[]> {
  const admin = createAdminClient()

  // 1. Cargar proactive_insights del avatar
  const { data: piRaw } = await admin
    .from('proactive_insights')
    .select('id, insight_type, title, body, confidence')
    .eq('avatar_id', avatarId)
    .order('created_at', { ascending: true })

  const insights = (piRaw ?? []) as ProactiveInsightRow[]
  if (insights.length === 0) return []

  // 2. Cargar avatar_insights (perfil del avatar — cold-start data)
  const { data: aiRaw } = await admin
    .from('avatar_insights')
    .select('id, insight_type, content')
    .eq('avatar_id', avatarId)

  const avatarInsights = (aiRaw ?? []) as AvatarInsightRow[]

  // 3. Cargar historial de éxito desde v_strategy_scores (vacío en cold-start)
  const { data: scoresRaw } = await admin
    .from('v_strategy_scores')
    .select('proactive_insight_id, composite_score, engagement_score, dm_count, save_count, conversions')
    .eq('avatar_id', avatarId)

  const scores = (scoresRaw ?? []) as StrategyScoreRow[]

  // 4. Cargar overrides previos de la usuaria (señal de aprendizaje)
  const { data: overridesRaw } = await admin
    .from('judge_overrides')
    .select('suggested_id, chosen_id')
    .eq('avatar_id', avatarId)
    .order('created_at', { ascending: false })
    .limit(20)

  const overrides = (overridesRaw ?? []) as OverrideRow[]

  // 5. Construir prompt
  const isColdStart = scores.length === 0 && overrides.length === 0

  const insightsText = insights
    .map((i) => {
      const score = scores.find((s) => s.proactive_insight_id === i.id)
      const overridedCount = overrides.filter((o) => o.suggested_id === i.id).length
      const chosenCount = overrides.filter((o) => o.chosen_id === i.id).length
      return [
        `- ID: ${i.id}`,
        `  Tipo: ${i.insight_type} | Confianza: ${i.confidence}`,
        `  Título: ${i.title}`,
        `  Cuerpo: ${i.body}`,
        score ? `  Score histórico: ${score.composite_score ?? 'N/A'} | DMs: ${score.dm_count ?? 0} | Saves: ${score.save_count ?? 0} | Conversiones: ${score.conversions ?? 0}` : '  Sin historial real',
        overridedCount > 0 ? `  Veces ignorado por override: ${overridedCount}` : '',
        chosenCount > 0 ? `  Veces elegido manualmente: ${chosenCount}` : '',
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')

  const avatarContext = avatarInsights.length > 0
    ? avatarInsights.map((ai) => `- [${ai.insight_type}] ${ai.content}`).join('\n')
    : 'Sin insights de perfil disponibles.'

  const coldStartNote = isColdStart
    ? '\nNOTA: No hay historial real ni overrides. Basar el ranking SOLO en el perfil del avatar y la probabilidad de resonancia emocional.'
    : ''

  const prompt = `Eres el Judge de estrategias de contenido para CancioBot.
Tu tarea: rankear estos proactive_insights de mayor a menor probabilidad de conversión para este avatar específico.

PERFIL DEL AVATAR (avatar_insights):
${avatarContext}
${coldStartNote}

INSIGHTS A RANKEAR:
${insightsText}

INSTRUCCIONES:
- Asigna rank 1 al insight con mayor probabilidad de convertir para este avatar
- score_judge: 0-100 (100 = certeza total de alto impacto)
- reasoning: 1 oración corta en español explicando POR QUÉ ese rank (menciona el motivador específico del avatar)
- Si hay historial real (composite_score > 0), priorizarlo sobre la inferencia
- Si hay overrides, considera que los insights más elegidos manualmente tienen preferencia demostrada

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{
  "rankings": [
    { "insight_id": "uuid", "rank": 1, "score_judge": 87, "reasoning": "..." },
    ...
  ]
}`

  // 6. Llamada IA
  let rankings: JudgeRanking[] = []
  try {
    const { text } = await generateText({
      model: openrouter(JUDGE_MODEL),
      prompt,
      temperature: 0.2,
    })

    // JSON.parse manual (NUNCA generateObject con OpenRouter)
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean) as { rankings: Array<{ insight_id: string; rank: number; score_judge: number; reasoning: string }> }

    rankings = parsed.rankings.map((r) => ({
      insight_id: r.insight_id,
      rank: r.rank,
      score_judge: r.score_judge,
      reasoning: r.reasoning,
      override_count: overrides.filter((o) => o.suggested_id === r.insight_id).length,
    }))
  } catch {
    // Si la IA falla, devolver orden original con scores neutros
    return insights.map((i, idx) => ({
      insight_id: i.id,
      rank: idx + 1,
      score_judge: 50,
      reasoning: 'Ranking no disponible temporalmente.',
      override_count: 0,
    }))
  }

  // 7. Persistir en judge_rankings (cache)
  const upsertRows = rankings.map((r) => ({
    avatar_id: avatarId,
    insight_id: r.insight_id,
    rank: r.rank,
    score_judge: r.score_judge,
    reasoning: r.reasoning,
    computed_at: new Date().toISOString(),
    override_count: r.override_count,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('judge_rankings')
    .upsert(upsertRows, { onConflict: 'avatar_id,insight_id' })

  return rankings
}

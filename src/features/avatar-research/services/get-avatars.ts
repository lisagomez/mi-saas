'use server'

import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rankInsightsWithJudge } from './rank-insights-with-judge'
import type { JudgeRankingRow } from '../types/judge'

export interface InsightClassification {
  canal: string
  tipo: 'organico' | 'inorganico'
  formato: string
  estrategia_venta: string
}

export interface ProactiveInsight {
  id: string
  insight_type: string
  title: string
  body: string
  confidence: string
  status: string
  classification: InsightClassification | null
  prompt_template: string | null
  // Judge fields (null si el cache aún no está disponible)
  judge_rank: number | null
  judge_score: number | null
  judge_reasoning: string | null
  judge_override_count: number
}

export interface AvatarWithInsights {
  id: string
  name: string
  origin: string
  residence: string
  age_range: string | null
  musical_style: string | null
  profile_json: Record<string, unknown>
  created_at: string
  pending_insights: number
  actioned_insights: number
  total_avatar_insights: number
  proactive_insights: ProactiveInsight[]
}

interface RawAvatar {
  id: string
  name: string
  origin: string
  residence: string
  age_range: string | null
  musical_style: string | null
  profile_json: Record<string, unknown>
  created_at: string
  proactive_insights: ProactiveInsight[]
  avatar_insights: { id: string }[]
}

export async function getAvatars(): Promise<AvatarWithInsights[]> {
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: avatars } = await (admin as any)
    .from('avatars')
    .select(`
      id, name, origin, residence, age_range, musical_style, profile_json, created_at,
      proactive_insights (id, insight_type, title, body, confidence, status, classification, prompt_template),
      avatar_insights (id)
    `)
    .order('created_at', { ascending: false }) as { data: RawAvatar[] | null }

  if (!avatars) return []

  // Cargar rankings cacheados para todos los avatares en una sola query
  const avatarIds = avatars.map((a) => a.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rankingsRaw } = await (admin as any)
    .from('judge_rankings')
    .select('avatar_id, insight_id, rank, score_judge, reasoning, override_count')
    .in('avatar_id', avatarIds) as { data: JudgeRankingRow[] | null }

  const rankings = (rankingsRaw ?? []) as JudgeRankingRow[]

  return avatars.map((a) => {
    const pi = (a.proactive_insights ?? []) as Omit<ProactiveInsight, 'judge_rank' | 'judge_score' | 'judge_reasoning' | 'judge_override_count'>[]
    const ai = (a.avatar_insights ?? []) as { id: string }[]
    const avatarRankings = rankings.filter((r) => r.avatar_id === a.id)

    // Enriquecer cada insight con datos del Judge
    const enrichedInsights: ProactiveInsight[] = pi.map((insight) => {
      const ranking = avatarRankings.find((r) => r.insight_id === insight.id)
      return {
        ...insight,
        judge_rank: ranking?.rank ?? null,
        judge_score: ranking ? Number(ranking.score_judge) : null,
        judge_reasoning: ranking?.reasoning ?? null,
        judge_override_count: ranking?.override_count ?? 0,
      }
    })

    // Ordenar por rank si hay cache; si no, mantener orden de inserción
    const hasRankings = avatarRankings.length > 0
    const sortedInsights = hasRankings
      ? [...enrichedInsights].sort((a, b) => (a.judge_rank ?? 99) - (b.judge_rank ?? 99))
      : enrichedInsights

    // Si no hay cache para este avatar, disparar Judge en background
    if (!hasRankings && pi.length > 0) {
      after(async () => {
        await rankInsightsWithJudge(a.id)
      })
    }

    return {
      id: a.id,
      name: a.name,
      origin: a.origin,
      residence: a.residence,
      age_range: a.age_range,
      musical_style: a.musical_style,
      profile_json: (a.profile_json ?? {}) as Record<string, unknown>,
      created_at: a.created_at,
      pending_insights: pi.filter(i => i.status === 'pending').length,
      actioned_insights: pi.filter(i => i.status === 'actioned').length,
      total_avatar_insights: ai.length,
      proactive_insights: sortedInsights,
    }
  })
}


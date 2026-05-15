'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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

  return avatars.map((a) => {
    const pi = (a.proactive_insights ?? []) as ProactiveInsight[]
    const ai = (a.avatar_insights ?? []) as { id: string }[]
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
      proactive_insights: pi,
    }
  })
}


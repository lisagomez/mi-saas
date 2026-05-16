'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { TrendLog } from '../types'

interface RawTrendLog {
  id: string
  avatar_name: string | null
  theme_json: Record<string, unknown>
  reasoning: string
  status: string
  error_message: string | null
  execution_ms: number | null
  source: string
  created_at: string
  relevance_score: number | null
  decision_type: string | null
  decision_log: Record<string, unknown> | null
}

export async function getTrendLogs(limit = 10): Promise<TrendLog[]> {
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('weekly_trends')
    .select('id, avatar_name, theme_json, reasoning, status, error_message, execution_ms, source, created_at, relevance_score, decision_type, decision_log')
    .order('created_at', { ascending: false })
    .limit(limit) as { data: RawTrendLog[] | null }

  if (!data) return []

  return data.map((row) => ({
    id: row.id,
    avatar_name: row.avatar_name,
    theme_json: row.theme_json ?? {},
    reasoning: row.reasoning,
    status: row.status as TrendLog['status'],
    error_message: row.error_message,
    execution_ms: row.execution_ms,
    source: row.source,
    created_at: row.created_at,
    relevance_score: row.relevance_score,
    decision_type: row.decision_type as TrendLog['decision_type'],
    decision_log: row.decision_log,
  }))
}

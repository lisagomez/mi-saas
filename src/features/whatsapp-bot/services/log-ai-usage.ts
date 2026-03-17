import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

export interface LogAiUsageParams {
  leadId: string | null
  orderId?: string | null
  model: string
  tokensInput?: number | null
  tokensOutput?: number | null
  costUsd?: number | null
}

type AiUsageInsert = Database['public']['Tables']['ai_usage']['Insert']

export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  const supabase = createAdminClient()
  const row: AiUsageInsert = {
    lead_id: params.leadId,
    order_id: params.orderId ?? null,
    model: params.model,
    tokens_input: params.tokensInput ?? null,
    tokens_output: params.tokensOutput ?? null,
    cost_usd: params.costUsd ?? null,
  }
  await supabase.from('ai_usage').insert(row as never)
}

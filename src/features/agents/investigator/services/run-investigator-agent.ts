'use server'

import { generateText } from 'ai'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { guardedAiCall, BudgetLimitError } from '@/features/catalogs/services/guarded-ai-call'
import { INVESTIGATOR_SYSTEM_PROMPT, buildInvestigatorPrompt } from '../prompts/investigator-prompt'
import type { Competitor } from '@/types/database'

export interface InvestigatorReport {
  summary: string
  canciobot_position: string
  competitors_analysis: Array<{
    name: string
    ventajas_canciobot: string
    desventajas_canciobot: string
    estrategia: string
  }>
  price_recommendation: string
  key_opportunities: string[]
  risks: string[]
}

export interface InvestigatorResult {
  success: boolean
  report?: InvestigatorReport
  reportId?: string
  insufficientData?: boolean
  error?: string
}

const MIN_COMPETITORS = 2
// Placeholder para guardedAiCall cuando no hay pedido asociado
const AGENT_CALL_ID = '00000000-0000-0000-0000-000000000000'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') throw new Error('Sin permiso')
}

export async function runInvestigatorAgent(): Promise<InvestigatorResult> {
  try {
    await assertAdmin()
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error de autenticación' }
  }

  const admin = createAdminClient()

  const { data: competitors, error: compErr } = await admin.from('competitors').select('*')
  if (compErr) return { success: false, error: compErr.message }

  const comps = (competitors ?? []) as Competitor[]

  if (comps.length < MIN_COMPETITORS) {
    return { success: true, insufficientData: true }
  }

  let report: InvestigatorReport
  let aiUsageId: string | null = null

  try {
    const { text, usage } = await guardedAiCall(AGENT_CALL_ID, () =>
      generateText({
        model: openrouter(MODELS.basic),
        system: INVESTIGATOR_SYSTEM_PROMPT,
        prompt: buildInvestigatorPrompt(comps),
      })
    )

    try {
      report = JSON.parse(text.trim()) as InvestigatorReport
    } catch {
      return { success: false, error: 'El modelo no devolvió JSON válido. Intenta de nuevo.' }
    }

    const costUsd = usage
      ? (usage.inputTokens ?? 0) * 0.00000015 + (usage.outputTokens ?? 0) * 0.0000006
      : null

    const { data: usageRow } = await admin.from('ai_usage').insert({
      lead_id: null,
      order_id: null,
      model: MODELS.basic,
      tokens_input: usage?.inputTokens ?? null,
      tokens_output: usage?.outputTokens ?? null,
      cost_usd: costUsd,
    } as never).select('id').single()

    aiUsageId = (usageRow as { id: string } | null)?.id ?? null
  } catch (err) {
    if (err instanceof BudgetLimitError) {
      return { success: false, error: 'Presupuesto mensual de IA agotado.' }
    }
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }

  const { data: reportRow, error: reportErr } = await admin.from('agent_reports').insert({
    agent_type: 'investigator',
    report_json: report as unknown as Record<string, unknown>,
    ai_usage_id: aiUsageId,
  } as never).select('id').single()

  if (reportErr) return { success: false, error: reportErr.message }

  return {
    success: true,
    report,
    reportId: (reportRow as { id: string } | null)?.id ?? undefined,
  }
}

export async function getLatestInvestigatorReport(): Promise<InvestigatorReport | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('agent_reports')
    .select('report_json')
    .eq('agent_type', 'investigator')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return (data as { report_json: InvestigatorReport }).report_json
}

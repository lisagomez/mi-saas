'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getGlobalRoas } from '@/features/facebook-ads/services/get-campaigns-with-metrics'
import type { EnrichedFinancialMetrics } from '@/types/database'

const PRICE_PER_SONG_USD = Number(process.env.SONG_PRICE_USD ?? 25)
// Tasa de cambio para convertir gastos registrados en MXN → USD
const MXN_TO_USD = 1 / Number(process.env.USD_TO_MXN ?? 17)

function insuf(metric: string): string {
  return `Datos insuficientes para calcular ${metric}`
}

export async function runFinancialAgent(): Promise<{ success: boolean; metrics?: EnrichedFinancialMetrics; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') return { success: false, error: 'Sin permiso' }

  const admin = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Leer todos los datos en paralelo
  const [
    { data: ordersDeliveredRaw },
    { data: expensesRaw },
    { data: aiUsageRaw },
    { count: leadsTotal },
    { count: leadsQualified },
  ] = await Promise.all([
    admin.from('orders').select('id, created_at').eq('status', 'entregado'),
    admin.from('expenses').select('category, amount_mxn'),
    admin.from('ai_usage').select('cost_usd').gte('created_at', startOfMonth),
    admin.from('leads').select('*', { count: 'exact', head: true }),
    admin.from('leads').select('*', { count: 'exact', head: true }).eq('qualification_status', 'calificado'),
  ])

  const ordersDelivered = (ordersDeliveredRaw ?? []).length
  const expenses = (expensesRaw ?? []) as { category: string; amount_mxn: number }[]
  const aiRows = (aiUsageRaw ?? []) as { cost_usd: number | null }[]
  const totalAiCostUsd = aiRows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0)

  // Ingresos en USD
  const totalRevenueUsd = ordersDelivered * PRICE_PER_SONG_USD

  // Gastos reales por categoría (expenses registrados en MXN → convertir a USD)
  const totalMarketingUsd = expenses
    .filter(e => e.category === 'marketing')
    .reduce((s, e) => s + Number(e.amount_mxn) * MXN_TO_USD, 0)
  const totalExpensesUsd = expenses.reduce((s, e) => s + Number(e.amount_mxn) * MXN_TO_USD, 0) + totalAiCostUsd

  // Métricas — con regla anti-alucinación
  const insufficientData: string[] = []

  // CAC = Gasto marketing / Leads calificados
  let cac: number | null = null
  if ((leadsQualified ?? 0) > 0 && totalMarketingUsd > 0) {
    cac = totalMarketingUsd / (leadsQualified ?? 1)
  } else {
    insufficientData.push(insuf('CAC'))
  }

  // LTV simplificado = Ticket promedio
  let ltv: number | null = null
  if (ordersDelivered > 0) {
    ltv = totalRevenueUsd / ordersDelivered
  } else {
    insufficientData.push(insuf('LTV'))
  }

  // ROI = (Ingresos - Todos los gastos) / Todos los gastos × 100
  let roi: number | null = null
  if (totalExpensesUsd > 0 && totalRevenueUsd > 0) {
    roi = ((totalRevenueUsd - totalExpensesUsd) / totalExpensesUsd) * 100
  } else {
    insufficientData.push(insuf('ROI'))
  }

  // Punto de equilibrio = Gastos fijos / precio unitario
  let puntoEquilibrio: number | null = null
  const gastosFijosUsd = expenses
    .filter(e => ['suscripciones', 'operacion'].includes(e.category))
    .reduce((s, e) => s + Number(e.amount_mxn) * MXN_TO_USD, 0)
  if (gastosFijosUsd > 0 && PRICE_PER_SONG_USD > 0) {
    puntoEquilibrio = Math.ceil(gastosFijosUsd / PRICE_PER_SONG_USD)
  } else {
    insufficientData.push(insuf('Punto de equilibrio'))
  }

  // Flujo de caja = Ingresos confirmados - Gastos comprometidos del período
  let flujoCaja: number | null = null
  if (totalRevenueUsd > 0 || totalExpensesUsd > 0) {
    flujoCaja = totalRevenueUsd - totalExpensesUsd
  } else {
    insufficientData.push(insuf('Flujo de caja'))
  }

  // ROAS global desde Facebook Ads
  const roas = await getGlobalRoas()
  if (roas === null) {
    insufficientData.push(insuf('ROAS (sin datos de campañas Facebook)'))
  }

  // Flujo mensual (últimos 6 meses)
  const monthlyCashFlow = buildMonthlyCashFlow(ordersDeliveredRaw ?? [], PRICE_PER_SONG_USD)

  const metrics: EnrichedFinancialMetrics = {
    totalRevenueUsd,
    totalExpensesUsd,
    totalAiCostUsd,
    ordersDelivered,
    leadsTotal: leadsTotal ?? 0,
    leadsQualified: leadsQualified ?? 0,
    roi,
    roas,
    cac,
    ltv,
    puntoEquilibrio,
    flujoCaja,
    monthlyCashFlow,
    insufficientData,
  }

  // Persistir reporte (sin costo de IA — solo cálculo matemático)
  await admin.from('agent_reports').insert({
    agent_type: 'financial',
    report_json: metrics as unknown as Record<string, unknown>,
    ai_usage_id: null,
  } as never)

  return { success: true, metrics }
}

function buildMonthlyCashFlow(orders: { created_at: string }[], pricePerOrder: number) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
    const count = orders.filter(o => {
      const od = new Date(o.created_at)
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
    }).length
    return { month: label, revenue: count * pricePerOrder }
  })
}

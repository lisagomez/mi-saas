import { createAdminClient } from '@/lib/supabase/admin'
import { getGlobalRoas } from '@/features/facebook-ads/services/get-campaigns-with-metrics'
import type { FinancialMetrics } from '@/types/database'

// Precio por canción en USD (configurable via env)
const PRICE_PER_SONG_USD = Number(process.env.SONG_PRICE_USD ?? 25)

export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  const supabase = createAdminClient()

  // Pedidos entregados
  const { data: delivered } = await supabase
    .from('orders')
    .select('id, created_at')
    .eq('status', 'entregado')

  const ordersDelivered = delivered?.length ?? 0
  const totalRevenueUsd = ordersDelivered * PRICE_PER_SONG_USD

  // Costo total IA (ya en USD)
  const { data: aiRowsRaw } = await supabase
    .from('ai_usage')
    .select('cost_usd')

  const aiRows = (aiRowsRaw ?? []) as { cost_usd: number | null }[]
  const totalAiCostUsd = aiRows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0)
  const aiSpendUsd = totalAiCostUsd

  // Leads totales y convertidos
  const { count: leadsTotal } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  const { count: leadsConverted } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('qualification_status', 'calificado')

  const roi = totalAiCostUsd > 0
    ? ((totalRevenueUsd - totalAiCostUsd) / totalAiCostUsd) * 100
    : null

  const cac = (leadsConverted ?? 0) > 0
    ? totalAiCostUsd / (leadsConverted ?? 1)
    : null

  const ltv = ordersDelivered > 0
    ? totalRevenueUsd / ordersDelivered
    : null

  // ROAS global desde Facebook Ads
  const roas = await getGlobalRoas()

  // Flujo de caja mensual (últimos 6 meses)
  const monthlyCashFlow = buildMonthlyCashFlow(delivered ?? [], PRICE_PER_SONG_USD)

  return {
    totalRevenueUsd,
    totalAiCostUsd,
    ordersDelivered,
    leadsTotal: leadsTotal ?? 0,
    leadsConverted: leadsConverted ?? 0,
    cac,
    ltv,
    roi,
    roas,
    aiSpendUsd,
    monthlyCashFlow,
  }
}

function buildMonthlyCashFlow(
  orders: { created_at: string }[],
  pricePerSong: number
): { month: string; revenue: number }[] {
  const now = new Date()
  const months: { month: string; revenue: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
    const count = orders.filter(o => {
      const od = new Date(o.created_at)
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
    }).length
    months.push({ month: label, revenue: count * pricePerSong })
  }

  return months
}

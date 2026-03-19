import { createAdminClient } from '@/lib/supabase/admin'
import type { CampaignWithMetrics, FacebookCampaign, CampaignSpend } from '@/types/database'

const PRICE_PER_SONG_USD = Number(process.env.SONG_PRICE_USD ?? 25)

/**
 * Calcula métricas de campañas de Facebook Ads.
 *
 * Atribución: leads.source = 'fb_{source_key}'
 * ROAS = ingresos USD atribuidos / gasto USD de campaña
 */
export async function getCampaignsWithMetrics(): Promise<CampaignWithMetrics[]> {
  const admin = createAdminClient()

  const [
    { data: campaignsRaw },
    { data: spendRaw },
    { data: leadsRaw },
    { data: ordersDeliveredRaw },
  ] = await Promise.all([
    admin.from('facebook_campaigns').select('*').order('start_date', { ascending: false }),
    admin.from('campaign_spend').select('campaign_id, amount_usd'),
    admin.from('leads').select('id, source').like('source', 'fb_%'),
    admin.from('orders').select('id, lead_id').eq('status', 'entregado'),
  ])

  const campaigns = (campaignsRaw ?? []) as FacebookCampaign[]
  const spends = (spendRaw ?? []) as Pick<CampaignSpend, 'campaign_id' | 'amount_usd'>[]
  const fbLeads = (leadsRaw ?? []) as { id: string; source: string }[]
  const deliveredOrders = (ordersDeliveredRaw ?? []) as { id: string; lead_id: string }[]

  // Calificación de leads: solo calificados
  const { data: qualifiedRaw } = await admin
    .from('leads')
    .select('id')
    .like('source', 'fb_%')
    .eq('qualification_status', 'calificado')
  const qualifiedIds = new Set((qualifiedRaw ?? []).map((l: { id: string }) => l.id))

  return campaigns.map((campaign): CampaignWithMetrics => {
    // Gasto total de la campaña
    const totalSpendUsd = spends
      .filter(s => s.campaign_id === campaign.id)
      .reduce((sum, s) => sum + Number(s.amount_usd), 0)

    // Leads atribuidos: source = 'fb_{source_key}'
    const sourceValue = `fb_${campaign.source_key}`
    const attributedLeads = fbLeads.filter(l => l.source === sourceValue)
    const attributedLeadIds = new Set(attributedLeads.map(l => l.id))

    const leadsTotal = attributedLeads.length
    const leadsQualified = attributedLeads.filter(l => qualifiedIds.has(l.id)).length

    // Pedidos entregados de leads atribuidos
    const attributedDelivered = deliveredOrders.filter(o => attributedLeadIds.has(o.lead_id))
    const ordersDelivered = attributedDelivered.length
    const revenueUsd = ordersDelivered * PRICE_PER_SONG_USD

    // ROAS = ingresos / gasto (null si no hay gasto)
    const roas = totalSpendUsd > 0 ? revenueUsd / totalSpendUsd : null

    return {
      ...campaign,
      totalSpendUsd,
      leadsTotal,
      leadsQualified,
      ordersDelivered,
      revenueUsd,
      roas,
    }
  })
}

/**
 * Calcula el ROAS global (todas las campañas) para el Agente Financiero.
 * Retorna null si no hay datos de campañas ni gasto registrado.
 */
export async function getGlobalRoas(): Promise<number | null> {
  const admin = createAdminClient()

  const [
    { data: spendRaw },
    { data: fbLeadsRaw },
    { data: ordersDeliveredRaw },
  ] = await Promise.all([
    admin.from('campaign_spend').select('amount_usd'),
    admin.from('leads').select('id').like('source', 'fb_%'),
    admin.from('orders').select('lead_id').eq('status', 'entregado'),
  ])

  const totalSpendUsd = (spendRaw ?? []).reduce(
    (sum, r: { amount_usd: number }) => sum + Number(r.amount_usd),
    0
  )

  if (totalSpendUsd === 0) return null

  const fbLeadIds = new Set((fbLeadsRaw ?? []).map((l: { id: string }) => l.id))
  const attributedDelivered = (ordersDeliveredRaw ?? []).filter(
    (o: { lead_id: string }) => fbLeadIds.has(o.lead_id)
  )
  const revenueUsd = attributedDelivered.length * PRICE_PER_SONG_USD

  return revenueUsd / totalSpendUsd
}

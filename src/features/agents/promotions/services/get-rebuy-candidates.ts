import { createAdminClient } from '@/lib/supabase/admin'

export interface RebuyCandidate {
  leadId: string
  phone: string
  ordersDelivered: number
  lastOrderAt: string
}

/**
 * Leads con al menos 1 pedido entregado y sin recompra en los últimos 30 días.
 */
export async function getRebuyCandidates(): Promise<RebuyCandidate[]> {
  const admin = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Leads con pedidos entregados
  const { data: ordersRaw, error } = await admin
    .from('orders')
    .select('lead_id, created_at, leads!inner(phone)')
    .in('status', ['entregado', 'pago_confirmado', 'video_pago_confirmado'])
    .order('created_at', { ascending: false })

  if (error || !ordersRaw) return []

  // Agrupar por lead
  const byLead = new Map<string, { phone: string; count: number; lastOrderAt: string }>()
  for (const row of ordersRaw as Array<{ lead_id: string; created_at: string; leads: { phone: string } | { phone: string }[] }>) {
    const leads = Array.isArray(row.leads) ? row.leads[0] : row.leads
    const phone = leads?.phone ?? ''
    if (!byLead.has(row.lead_id)) {
      byLead.set(row.lead_id, { phone, count: 1, lastOrderAt: row.created_at })
    } else {
      byLead.get(row.lead_id)!.count++
    }
  }

  // Filtrar los que ya tienen recompra reciente
  const { data: recentRebuys } = await admin
    .from('rebuys')
    .select('lead_id')
    .gte('sent_at', thirtyDaysAgo)

  const recentLeadIds = new Set((recentRebuys ?? []).map((r: { lead_id: string }) => r.lead_id))

  return Array.from(byLead.entries())
    .filter(([leadId]) => !recentLeadIds.has(leadId))
    .map(([leadId, data]) => ({
      leadId,
      phone: data.phone,
      ordersDelivered: data.count,
      lastOrderAt: data.lastOrderAt,
    }))
}

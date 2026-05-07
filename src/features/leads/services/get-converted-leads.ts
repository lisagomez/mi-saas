import { createAdminClient } from '@/lib/supabase/admin'

export interface ConvertedLead {
  leadId: string
  phone: string
  origin: string | null
  residence: string | null
  ordersDelivered: number
  lastOrderAt: string
}

/**
 * Leads con al menos 1 pedido entregado (convertidos).
 */
export async function getConvertedLeads(): Promise<ConvertedLead[]> {
  const admin = createAdminClient()

  const { data: ordersRaw, error } = await admin
    .from('orders')
    .select('lead_id, created_at, leads!inner(phone, origin, residence)')
    .in('status', ['entregado', 'pago_confirmado'])
    .order('created_at', { ascending: false })

  if (error || !ordersRaw) return []

  const byLead = new Map<string, { phone: string; origin: string | null; residence: string | null; count: number; lastOrderAt: string }>()

  for (const row of ordersRaw as Array<{
    lead_id: string
    created_at: string
    leads: { phone: string; origin: string | null; residence: string | null } | { phone: string; origin: string | null; residence: string | null }[]
  }>) {
    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads
    if (!byLead.has(row.lead_id)) {
      byLead.set(row.lead_id, {
        phone: lead?.phone ?? '',
        origin: lead?.origin ?? null,
        residence: lead?.residence ?? null,
        count: 1,
        lastOrderAt: row.created_at,
      })
    } else {
      byLead.get(row.lead_id)!.count++
    }
  }

  return Array.from(byLead.entries()).map(([leadId, data]) => ({
    leadId,
    phone: data.phone,
    origin: data.origin,
    residence: data.residence,
    ordersDelivered: data.count,
    lastOrderAt: data.lastOrderAt,
  }))
}

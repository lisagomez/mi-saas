import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Devuelve el precio (price_label) de la campaña activa que aplica al lead.
 * Prioridad: specific > new_leads > all
 * Si no hay campaña activa, devuelve null → el caller usa el env var PAYMENT_PRICE.
 */
export async function getActivePriceForLead(leadId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Traer todas las campañas activas y vigentes, ordenadas por prioridad
  const { data: campaigns } = await supabase
    .from('pricing_campaigns')
    .select('assignment, price_label, lead_ids, valid_from')
    .eq('is_active', true)
    .lte('valid_from', now)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('created_at', { ascending: false }) as unknown as {
      data: {
        assignment: 'all' | 'new_leads' | 'specific'
        price_label: string
        lead_ids: string[]
        valid_from: string
      }[] | null
    }

  if (!campaigns || campaigns.length === 0) return null

  // 1. Specific: el lead está explícitamente en la lista
  const specific = campaigns.find(
    c => c.assignment === 'specific' && c.lead_ids.includes(leadId)
  )
  if (specific) return specific.price_label

  // 2. New leads: el lead fue creado después del valid_from de la campaña
  const { data: lead } = await supabase
    .from('leads')
    .select('created_at')
    .eq('id', leadId)
    .single() as unknown as { data: { created_at: string } | null }

  if (lead) {
    const newLeads = campaigns.find(
      c => c.assignment === 'new_leads' && lead.created_at >= c.valid_from
    )
    if (newLeads) return newLeads.price_label
  }

  // 3. All: aplica a todos
  const all = campaigns.find(c => c.assignment === 'all')
  if (all) return all.price_label

  return null
}

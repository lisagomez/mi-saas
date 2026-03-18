import { createAdminClient } from '@/lib/supabase/admin'
import type { Order } from '@/types/database'

export interface GetOrCreateOrderResult {
  order: Order
  isNew: boolean
}

/**
 * Obtiene el order activo de un lead o lo crea en estado 'recopilando_historia'.
 * Un lead calificado tiene máximo un order activo en V1 (UNIQUE constraint).
 */
export async function getOrCreateOrder(leadId: string): Promise<GetOrCreateOrderResult> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('orders')
    .select('*')
    .eq('lead_id', leadId)
    .single()

  if (existing) return { order: existing as Order, isNew: false }

  const { data: created, error } = await supabase
    .from('orders')
    .insert({ lead_id: leadId, status: 'recopilando_historia' } as never)
    .select()
    .single()

  if (error) throw new Error(`getOrCreateOrder: ${error.message}`)
  return { order: created as Order, isNew: true }
}

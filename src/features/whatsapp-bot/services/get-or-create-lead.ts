import { createAdminClient } from '@/lib/supabase/admin'
import type { Lead } from '@/types/database'

export interface GetOrCreateLeadParams {
  phone: string
  source?: string
}

export interface GetOrCreateLeadResult {
  lead: Lead
  isNew: boolean
}

/**
 * Obtiene el lead por teléfono o lo crea si no existe.
 * Usar desde el webhook al recibir un mensaje entrante.
 */
export async function getOrCreateLead(
  params: GetOrCreateLeadParams
): Promise<GetOrCreateLeadResult> {
  const supabase = createAdminClient()
  const source = params.source ?? 'facebook'

  const phone = params.phone.startsWith('+') ? params.phone : `+${params.phone}`

  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', phone)
    .single()

  if (existing) return { lead: existing as Lead, isNew: false }

  const { data: created, error } = await supabase
    .from('leads')
    .insert({ phone, source } as never)
    .select()
    .single()

  if (error) throw new Error(`getOrCreateLead: ${error.message}`)
  return { lead: created as Lead, isNew: true }
}

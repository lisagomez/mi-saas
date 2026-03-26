'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function checkDuplicateLeads(
  leadIds: string[],
  promotionId: string
): Promise<{ duplicateCount: number; duplicateLeadIds: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()
  const { data } = await admin
    .from('rebuys')
    .select('lead_id')
    .eq('promotion_id', promotionId)
    .eq('status', 'sent')
    .in('lead_id', leadIds)

  const duplicateLeadIds = (data ?? []).map((r) => (r as { lead_id: string }).lead_id)
  return { duplicateCount: duplicateLeadIds.length, duplicateLeadIds }
}

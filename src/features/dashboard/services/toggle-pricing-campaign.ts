'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  campaignId: z.string().uuid(),
  isActive: z.boolean(),
})

export async function togglePricingCampaign(
  input: z.infer<typeof Schema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'admin_pagos'].includes((profile as { role: string }).role)) {
    return { success: false, error: 'Sin permisos' }
  }

  const { error } = await supabase
    .from('pricing_campaigns')
    .update({ is_active: parsed.data.isActive } as never)
    .eq('id', parsed.data.campaignId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

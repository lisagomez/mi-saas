'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  campaignNumber: z.number().int().positive(),
  campaignName: z.string().min(1),
  priceLabel: z.string().min(1),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  assignment: z.enum(['all', 'new_leads', 'specific']),
  leadIds: z.array(z.string().uuid()).default([]),
})

export type CreatePricingCampaignInput = z.infer<typeof Schema>

export async function createPricingCampaign(
  input: CreatePricingCampaignInput
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

  const { campaignNumber, campaignName, priceLabel, validFrom, validUntil, assignment, leadIds } = parsed.data

  const { error } = await supabase
    .from('pricing_campaigns')
    .insert({
      campaign_number: campaignNumber,
      campaign_name: campaignName,
      price_label: priceLabel,
      valid_from: validFrom,
      valid_until: validUntil,
      assignment,
      lead_ids: leadIds,
      created_by: user.id,
    } as never)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

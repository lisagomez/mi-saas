'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({
  campaign_id: z.string().uuid('ID de campaña inválido'),
  spend_date: z.string().min(1, 'Fecha requerida'),
  amount_usd: z.coerce.number().positive('El monto debe ser mayor a 0'),
  notes: z.string().optional().nullable(),
})

export async function logCampaignSpend(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') return { error: 'Sin permiso' }

  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin.from('campaign_spend').insert({
    ...parsed.data,
    notes: parsed.data.notes ?? null,
    created_by: user.id,
  } as never)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

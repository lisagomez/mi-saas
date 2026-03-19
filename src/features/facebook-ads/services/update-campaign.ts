'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Nombre requerido'),
  start_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().optional().nullable(),
  budget_usd: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean(),
})

export async function updateCampaign(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') return { error: 'Sin permiso' }

  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { id, ...updates } = parsed.data
  const admin = createAdminClient()
  const { error } = await admin.from('facebook_campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() } as never)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

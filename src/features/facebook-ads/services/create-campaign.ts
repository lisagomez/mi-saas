'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  source_key: z.string().min(1, 'Clave de fuente requerida').regex(/^[a-z0-9_-]+$/, 'Solo letras minúsculas, números, guiones y guiones bajos'),
  start_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().optional().nullable(),
  budget_usd: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export async function createCampaign(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') return { error: 'Sin permiso' }

  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin.from('facebook_campaigns').insert({
    ...parsed.data,
    end_date: parsed.data.end_date ?? null,
    budget_usd: parsed.data.budget_usd ?? null,
    notes: parsed.data.notes ?? null,
  } as never)

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una campaña con esa clave de fuente' }
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

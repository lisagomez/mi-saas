'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpsertCompetitorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.string().nullable().optional(),
  proposal: z.string().nullable().optional(),
  advantages: z.string().nullable().optional(),
  disadvantages: z.string().nullable().optional(),
})

export async function upsertCompetitor(
  input: z.infer<typeof UpsertCompetitorSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const parsed = UpsertCompetitorSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Input inválido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'agente_investigador'].includes(profile.role)) {
    return { success: false, error: 'Sin permisos' }
  }

  const { id, ...fields } = parsed.data
  const payload = { ...fields, updated_at: new Date().toISOString() }

  if (id) {
    const { error } = await supabase.from('competitors').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true, id }
  }

  const { data, error } = await supabase
    .from('competitors').insert(payload).select('id').single()
  if (error) return { success: false, error: error.message }
  return { success: true, id: (data as { id: string }).id }
}

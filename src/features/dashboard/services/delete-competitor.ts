'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DeleteSchema = z.object({ id: z.string().uuid() })

export async function deleteCompetitor(
  input: { id: string }
): Promise<{ success: boolean; error?: string }> {
  const parsed = DeleteSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Input inválido' }

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'agente_investigador'].includes((profile as { role: string }).role)) {
    return { success: false, error: 'Sin permisos' }
  }

  const { error } = await supabase.from('competitors').delete().eq('id', parsed.data.id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

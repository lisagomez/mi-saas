'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({ id: z.string().uuid() })

export async function deleteCampaign(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') return { error: 'Sin permiso' }

  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin.from('facebook_campaigns').delete().eq('id', parsed.data.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

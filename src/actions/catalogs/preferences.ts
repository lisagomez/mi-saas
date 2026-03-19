'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const PreferenceSchema = z.object({
  regions: z.array(z.string()),
  styles: z.array(z.string().min(1)),
  directives: z.string().min(1),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') throw new Error('Sin permiso')
}

export async function createPreference(input: z.infer<typeof PreferenceSchema>) {
  await assertAdmin()
  const data = PreferenceSchema.parse(input)
  const admin = createAdminClient()
  const { error } = await admin.from('preferences_catalog').insert(data as never)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/preferences')
  return { success: true }
}

export async function updatePreference(id: string, input: Partial<z.infer<typeof PreferenceSchema>>) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('preferences_catalog').update({ ...input, updated_at: new Date().toISOString() } as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/preferences')
  return { success: true }
}

export async function deletePreference(id: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('preferences_catalog').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/preferences')
  return { success: true }
}

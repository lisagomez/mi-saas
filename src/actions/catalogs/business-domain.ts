'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const DomainSchema = z.object({
  name: z.string().min(1),
  formula: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['rentabilidad', 'experiencia', 'operacion']),
  is_active: z.boolean(),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') throw new Error('Sin permiso')
}

export async function createDomainEntry(input: z.infer<typeof DomainSchema>) {
  await assertAdmin()
  const data = DomainSchema.parse(input)
  const admin = createAdminClient()
  const { error } = await admin.from('business_domain').insert(data as never)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/business-domain')
  return { success: true }
}

export async function updateDomainEntry(id: string, input: Partial<z.infer<typeof DomainSchema>>) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('business_domain').update({ ...input, updated_at: new Date().toISOString() } as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/business-domain')
  return { success: true }
}

export async function deleteDomainEntry(id: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('business_domain').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/business-domain')
  return { success: true }
}

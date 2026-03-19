'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const PromotionSchema = z.object({
  name: z.string().min(1),
  occasion: z.string().min(1),
  description: z.string().optional(),
  discount_percent: z.number().min(0).max(100).nullable(),
  discount_fixed_mxn: z.number().min(0).nullable(),
  valid_from: z.string().min(1),
  valid_to: z.string().min(1),
  is_active: z.boolean(),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') throw new Error('Sin permiso')
}

export async function createPromotion(input: z.infer<typeof PromotionSchema>) {
  await assertAdmin()
  const data = PromotionSchema.parse(input)
  const admin = createAdminClient()
  const { error } = await admin.from('promotions_catalog').insert(data as never)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/promotions')
  return { success: true }
}

export async function updatePromotion(id: string, input: Partial<z.infer<typeof PromotionSchema>>) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('promotions_catalog').update({ ...input, updated_at: new Date().toISOString() } as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/promotions')
  return { success: true }
}

export async function deletePromotion(id: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('promotions_catalog').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/catalogs/promotions')
  return { success: true }
}

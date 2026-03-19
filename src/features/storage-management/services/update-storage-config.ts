'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({
  bucket_name: z.string().min(1),
  limit_mb: z.coerce.number().int().positive('El límite debe ser mayor a 0'),
  cleanup_after_days: z.coerce.number().int().positive('Los días deben ser mayor a 0'),
})

export async function updateStorageConfig(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') return { error: 'Sin permiso' }

  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin
    .from('storage_config')
    .update({
      limit_mb: parsed.data.limit_mb,
      cleanup_after_days: parsed.data.cleanup_after_days,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('bucket_name', parsed.data.bucket_name)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

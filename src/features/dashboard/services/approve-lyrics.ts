'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ApproveLyricsSchema = z.object({ orderId: z.string().uuid() })

export async function approveLyrics(
  input: z.infer<typeof ApproveLyricsSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = ApproveLyricsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Input inválido' }

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'creativo'].includes(profile.role)) {
    return { success: false, error: 'Sin permisos' }
  }

  const supabase = createAdminClient()
  const { data: orderRaw } = await supabase
    .from('orders').select('status').eq('id', parsed.data.orderId).single()

  const order = orderRaw as { status: string } | null
  if (!order) return { success: false, error: 'Order no encontrado' }
  if (order.status !== 'letra_generada') {
    return { success: false, error: `Estado actual: ${order.status}` }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'pago_pendiente', updated_at: new Date().toISOString() } as never)
    .eq('id', parsed.data.orderId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

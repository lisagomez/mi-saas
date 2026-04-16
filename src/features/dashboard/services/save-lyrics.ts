'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SaveLyricsSchema = z.object({
  orderId: z.string().uuid(),
  lyricsText: z.string().min(1, 'La letra no puede estar vacía'),
})

export async function saveLyrics(
  input: z.infer<typeof SaveLyricsSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = SaveLyricsSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'creativo'].includes((profile as { role: string }).role)) {
    return { success: false, error: 'Sin permisos' }
  }

  // Solo editable si la orden está en letra_generada
  const { data: orderRaw } = await supabase
    .from('orders')
    .select('status, songs(id)')
    .eq('id', parsed.data.orderId)
    .single()

  const order = orderRaw as { status: string; songs: { id: string }[] | null } | null
  if (!order) return { success: false, error: 'Order no encontrado' }
  if (order.status !== 'letra_generada') {
    return { success: false, error: `No se puede editar en estado: ${order.status}` }
  }

  const songId = order.songs?.[0]?.id
  if (!songId) return { success: false, error: 'Canción no encontrada' }

  const { error } = await supabase
    .from('songs')
    .update({ lyrics_text: parsed.data.lyricsText, updated_at: new Date().toISOString() } as never)
    .eq('id', songId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus } from './update-order-status'
import { deliverSong } from './deliver-song'

const ConfirmPaymentSchema = z.object({
  orderId: z.string().uuid(),
})

export interface ConfirmPaymentResult {
  success: boolean
  error?: string
}

/**
 * Server Action: confirma el pago de un order y entrega la canción al cliente.
 *
 * Solo admin_pagos y administrador pueden ejecutar esta acción.
 * Es idempotente: verifica que el status sea 'pago_pendiente' antes de actuar.
 */
export async function confirmPayment(
  input: z.infer<typeof ConfirmPaymentSchema>
): Promise<ConfirmPaymentResult> {
  const parsed = ConfirmPaymentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Input inválido' }

  const { orderId } = parsed.data

  // Verificar que el usuario tiene el rol correcto
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['administrador', 'admin_pagos'].includes((profile as { role: string }).role)) {
    return { success: false, error: 'Sin permisos' }
  }

  interface OrderWithRelations {
    id: string
    status: string
    lead_id: string
    leads: { phone: string } | { phone: string }[]
    songs: { lyrics_text: string }[] | null
  }

  // Obtener el order con datos del lead y la canción (idempotencia)
  const { data: orderRaw, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      lead_id,
      leads!inner(phone),
      songs(lyrics_text, audio_url_full)
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !orderRaw) return { success: false, error: 'Order no encontrado' }

  const order = orderRaw as unknown as OrderWithRelations

  // Idempotencia: solo actuar en pago_pendiente
  if (order.status !== 'pago_pendiente') {
    return { success: false, error: `Estado actual: ${order.status}. Solo se puede confirmar desde pago_pendiente` }
  }

  // Actualizar a pago_confirmado
  await updateOrderStatus(orderId, 'pago_confirmado')

  // Registrar quién confirmó y cuándo
  await supabase
    .from('orders')
    .update({
      payment_confirmed_at: new Date().toISOString(),
      payment_confirmed_by: user.id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId)

  // Obtener teléfono y letra
  const phone = Array.isArray(order.leads) ? order.leads[0]?.phone : order.leads?.phone
  const lyricsText = order.songs?.[0]?.lyrics_text
  const audioUrlFull = (order.songs?.[0] as { lyrics_text?: string; audio_url_full?: string | null })?.audio_url_full ?? null

  if (!phone) return { success: false, error: 'Teléfono del lead no encontrado' }
  if (!lyricsText) return { success: false, error: 'Letra de la canción no encontrada' }

  // Entregar canción completa al cliente
  const deliveryResult = await deliverSong({ phone, lyricsText, audioUrl: audioUrlFull })
  if (!deliveryResult.success) {
    // Si falla la entrega, no revertir el pago_confirmado — dejar para reintento manual
    return { success: false, error: `Pago confirmado pero fallo la entrega: ${deliveryResult.error}` }
  }

  // Actualizar a entregado
  await supabase
    .from('orders')
    .update({
      status: 'entregado',
      song_delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId)

  return { success: true }
}

'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { buildVideoDeliveryMessage } from '@/features/whatsapp-bot/constants/copy'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'

const Schema = z.object({ orderId: z.string().uuid() })

export interface ConfirmVideoPaymentResult {
  success: boolean
  error?: string
}

/**
 * Server Action: confirma el pago del video y envía el enlace de YouTube al cliente.
 *
 * Solo admin_pagos y administrador pueden ejecutar esta acción.
 * Idempotente: solo actúa desde estado `video_pago_enviado`.
 */
export async function confirmVideoPayment(
  input: z.infer<typeof Schema>
): Promise<ConfirmVideoPaymentResult> {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Input inválido' }

  const { orderId } = parsed.data

  // Verificar rol
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['administrador', 'admin_pagos'].includes((profile as { role: string }).role)) {
    return { success: false, error: 'Sin permisos' }
  }

  // Obtener order + video + lead (para el teléfono y youtube_url)
  interface VideoOrder {
    id: string
    status: string
    lead_id: string
    leads: { id: string; phone: string } | { id: string; phone: string }[]
    videos: { youtube_url: string | null; status: string }[] | null
  }

  const { data: orderRaw, error: orderError } = await supabase
    .from('orders')
    .select(`
      id, status, lead_id,
      leads!inner(id, phone),
      videos(youtube_url, status)
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !orderRaw) return { success: false, error: 'Order no encontrado' }

  const order = orderRaw as unknown as VideoOrder

  // Idempotencia
  if (order.status !== 'video_pago_enviado') {
    return { success: false, error: `Estado actual: ${order.status}. Solo se puede confirmar desde video_pago_enviado` }
  }

  const youtubeUrl = order.videos?.[0]?.youtube_url
  if (!youtubeUrl) return { success: false, error: 'No hay URL de YouTube para este pedido' }

  const lead = Array.isArray(order.leads) ? order.leads[0] : order.leads
  const phone = lead?.phone
  const leadId = lead?.id
  if (!phone || !leadId) return { success: false, error: 'Teléfono del lead no encontrado' }

  // Marcar video como confirmado y entregado en una sola escritura
  await supabase
    .from('videos')
    .update({
      payment_status: 'confirmado',
      status: 'entregado',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('order_id', orderId)

  // Enviar enlace de YouTube al cliente
  const deliveryMessage = buildVideoDeliveryMessage(youtubeUrl)
  await sendWhatsAppText(phone, deliveryMessage)
  await storeMessage({ leadId, role: 'assistant', contentText: deliveryMessage })

  // Avanzar la orden directo a entregado (sin parada en video_pago_confirmado)
  await supabase
    .from('orders')
    .update({
      status: 'entregado',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId)

  return { success: true }
}

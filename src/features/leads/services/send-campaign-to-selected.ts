'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { formatPromotionMessage } from '@/features/catalogs/services/get-active-promotion'
import type { PromotionsCatalog } from '@/types/database'

export interface SelectiveCampaignResult {
  total: number
  sent: number
  failed: number
  promotionName: string
}

const TEMPLATE_VARS = ['{{pedidos}}', '{{fecha_ultimo_pedido}}'] as const

function hasTemplateVars(template: string): boolean {
  return TEMPLATE_VARS.some((v) => template.includes(v))
}

function applyVars(template: string, pedidos: number, lastOrderAt: string): string {
  const fecha = new Date(lastOrderAt).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  return template
    .replace(/\{\{pedidos\}\}/g, String(pedidos))
    .replace(/\{\{fecha_ultimo_pedido\}\}/g, fecha)
}

export async function sendCampaignToSelected(
  leadIds: string[],
  promotionId: string,
  messageTemplate?: string,
  whatsappTemplateName?: string
): Promise<SelectiveCampaignResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()

  const { data: promoData } = await admin
    .from('promotions_catalog')
    .select('*')
    .eq('id', promotionId)
    .single()
  const promotion = promoData as PromotionsCatalog | null
  if (!promotion) throw new Error('Promoción no encontrada')

  const { data: leadsRaw } = await admin
    .from('leads')
    .select('id, phone')
    .in('id', leadIds)
  const leads = (leadsRaw ?? []) as { id: string; phone: string }[]

  // Query orders data only if template uses variables
  let ordersByLead: Map<string, { count: number; lastOrderAt: string }> | null = null
  if (messageTemplate && hasTemplateVars(messageTemplate)) {
    const { data: ordersRaw } = await admin
      .from('orders')
      .select('lead_id, created_at')
      .in('lead_id', leadIds)
      .in('status', ['entregado', 'pago_confirmado'])

    ordersByLead = new Map()
    for (const order of (ordersRaw ?? []) as Array<{ lead_id: string; created_at: string }>) {
      const existing = ordersByLead.get(order.lead_id)
      if (!existing) {
        ordersByLead.set(order.lead_id, { count: 1, lastOrderAt: order.created_at })
      } else {
        existing.count++
        if (order.created_at > existing.lastOrderAt) existing.lastOrderAt = order.created_at
      }
    }
  }

  const promoMessage = formatPromotionMessage(promotion)
  const defaultText = `¡Hola! 👋 Tenemos algo especial para ti:\n\n${promoMessage}\n\n¿Te interesa? Escríbenos y te ayudamos a crear algo único. 🎵`

  let sent = 0
  let failed = 0

  for (const lead of leads) {
    let text = defaultText
    if (messageTemplate) {
      const data = ordersByLead?.get(lead.id)
      text = applyVars(messageTemplate, data?.count ?? 0, data?.lastOrderAt ?? new Date().toISOString())
    }

    const result = whatsappTemplateName
      ? await sendWhatsAppTemplate(lead.phone, whatsappTemplateName)
      : await sendWhatsAppText(lead.phone, text)
    const status = result.success ? 'sent' : 'failed'

    await admin.from('rebuys').insert({
      lead_id: lead.id,
      promotion_id: promotionId,
      status,
    } as never)

    if (result.success) sent++
    else failed++
  }

  return { total: leads.length, sent, failed, promotionName: promotion.name }
}

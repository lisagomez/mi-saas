'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { formatPromotionMessage } from '@/features/catalogs/services/get-active-promotion'
import type { PromotionsCatalog } from '@/types/database'

export interface SelectiveCampaignResult {
  total: number
  sent: number
  failed: number
  promotionName: string
}

export async function sendCampaignToSelected(
  leadIds: string[],
  promotionId: string
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

  const promoMessage = formatPromotionMessage(promotion)
  const text = `¡Hola! 👋 Te escribimos de CancioBot. Tenemos algo especial para ti:\n\n${promoMessage}\n\n¿Te interesa? Escríbenos y te ayudamos a crear algo único. 🎵`

  let sent = 0
  let failed = 0

  for (const lead of leads) {
    const result = await sendWhatsAppText(lead.phone, text)
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

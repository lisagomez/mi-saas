'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/features/whatsapp-bot/services/send-whatsapp-message'
import { getActivePromotion, formatPromotionMessage } from '@/features/catalogs/services/get-active-promotion'
import { getRebuyCandidates } from './get-rebuy-candidates'
import type { PromotionsCatalog } from '@/types/database'

export interface CampaignResult {
  total: number
  sent: number
  failed: number
  promotionName: string
}

export async function getCampaignPreview(promotionId?: string): Promise<{
  candidates: Awaited<ReturnType<typeof getRebuyCandidates>>
  promotion: PromotionsCatalog | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()
  let promotion: PromotionsCatalog | null = null

  if (promotionId) {
    const { data } = await admin.from('promotions_catalog').select('*').eq('id', promotionId).single()
    promotion = data as PromotionsCatalog | null
  } else {
    // Buscar cualquier promoción activa vigente hoy
    const today = new Date().toISOString().split('T')[0]
    const { data } = await admin
      .from('promotions_catalog')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', today)
      .gte('valid_to', today)
      .limit(1)
      .maybeSingle()
    promotion = data as PromotionsCatalog | null
  }

  const candidates = await getRebuyCandidates()
  return { candidates, promotion }
}

export async function sendRebuyCampaign(promotionId: string): Promise<CampaignResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'administrador') throw new Error('Sin permiso')

  const admin = createAdminClient()

  const { data: promoData } = await admin.from('promotions_catalog').select('*').eq('id', promotionId).single()
  const promotion = promoData as PromotionsCatalog | null
  if (!promotion) throw new Error('Promoción no encontrada')

  const candidates = await getRebuyCandidates()
  const promoMessage = formatPromotionMessage(promotion)
  const rebuyText = `¡Hola! 👋 Te escribimos de CancioBot. Tenemos algo especial para ti:\n\n${promoMessage}\n\n¿Te interesa? Escríbenos y te ayudamos a crear algo único. 🎵`

  let sent = 0
  let failed = 0

  for (const candidate of candidates) {
    const result = await sendWhatsAppText(candidate.phone, rebuyText)
    const status = result.success ? 'sent' : 'failed'

    await admin.from('rebuys').insert({
      lead_id: candidate.leadId,
      promotion_id: promotionId,
      status,
    } as never)

    if (result.success) sent++
    else failed++
  }

  // Persistir reporte
  await admin.from('agent_reports').insert({
    agent_type: 'promotions',
    report_json: { total: candidates.length, sent, failed, promotionName: promotion.name } as unknown as Record<string, unknown>,
    ai_usage_id: null,
  } as never)

  return { total: candidates.length, sent, failed, promotionName: promotion.name }
}

import { createAdminClient } from '@/lib/supabase/admin'
import type { PromotionsCatalog } from '@/types/database'

/**
 * Busca una promoción activa para la ocasión y fecha indicadas.
 * Retorna null si no hay ninguna vigente.
 */
export async function getActivePromotion(
  occasion: string
): Promise<PromotionsCatalog | null> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('promotions_catalog')
    .select('*')
    .eq('occasion', occasion)
    .eq('is_active', true)
    .lte('valid_from', today)
    .gte('valid_to', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getActivePromotion error:', error.message)
    return null
  }

  return data as PromotionsCatalog | null
}

/**
 * Formatea el texto de la promoción para incluirlo en el mensaje del bot.
 */
export function formatPromotionMessage(promo: PromotionsCatalog): string {
  const parts: string[] = [`🎉 *${promo.name}*`]

  if (promo.description) parts.push(promo.description)

  if (promo.discount_percent) {
    parts.push(`🏷️ ${promo.discount_percent}% de descuento`)
  } else if (promo.discount_fixed_mxn) {
    parts.push(`🏷️ $${promo.discount_fixed_mxn} USD de descuento`)
  }

  return parts.join('\n')
}

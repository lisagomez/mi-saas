import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Lee el límite mensual de AI tokens configurado para el mes en curso.
 * Retorna null si no existe presupuesto configurado (= ilimitado).
 */
export async function getMonthlyBudget(): Promise<number | null> {
  const supabase = createAdminClient()
  const now = new Date()
  const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('budgets')
    .select('limit_usd')
    .eq('category', 'ai_tokens')
    .eq('period_month', periodMonth)
    .maybeSingle()

  if (error) {
    console.error('getMonthlyBudget error:', error.message)
    return null
  }

  return (data as { limit_usd: number | null } | null)?.limit_usd ?? null
}

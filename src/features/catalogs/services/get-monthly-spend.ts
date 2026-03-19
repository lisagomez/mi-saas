import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Suma el costo total en USD de ai_usage en el mes en curso.
 * Retorna 0 si no hay registros.
 */
export async function getMonthlySpend(): Promise<number> {
  const supabase = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('ai_usage')
    .select('cost_usd')
    .gte('created_at', startOfMonth)

  if (error) {
    console.error('getMonthlySpend error:', error.message)
    return 0
  }

  return (data ?? []).reduce((sum, row) => sum + ((row as { cost_usd: number | null }).cost_usd ?? 0), 0)
}

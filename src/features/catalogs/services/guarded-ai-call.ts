import { createAdminClient } from '@/lib/supabase/admin'
import { getMonthlySpend } from './get-monthly-spend'
import { getMonthlyBudget } from './get-monthly-budget'

export class BudgetLimitError extends Error {
  constructor() {
    super('BUDGET_LIMIT_REACHED')
    this.name = 'BudgetLimitError'
  }
}

/**
 * Wrapper de seguridad para llamadas IA.
 * Verifica gasto mensual vs. límite configurado antes de ejecutar.
 * Si no hay límite configurado, deja pasar (presupuesto ilimitado).
 * Si el límite se supera: marca el pedido como requiere_procesamiento_manual
 * y lanza BudgetLimitError.
 */
export async function guardedAiCall<T>(
  orderId: string,
  fn: () => Promise<T>
): Promise<T> {
  const [spend, limit] = await Promise.all([getMonthlySpend(), getMonthlyBudget()])

  if (limit !== null && spend >= limit) {
    const supabase = createAdminClient()
    await supabase
      .from('orders')
      .update({ status: 'requiere_procesamiento_manual' } as never)
      .eq('id', orderId)

    throw new BudgetLimitError()
  }

  return fn()
}

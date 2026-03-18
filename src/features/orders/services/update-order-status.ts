import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus } from '@/types/database'

/**
 * Actualiza el status de un order. Registra updated_at automáticamente vía DB trigger (si existe)
 * o lo establece explícitamente.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq('id', orderId)

  if (error) throw new Error(`updateOrderStatus: ${error.message}`)
}

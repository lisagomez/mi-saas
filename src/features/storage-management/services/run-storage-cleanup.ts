import { createAdminClient } from '@/lib/supabase/admin'
import type { StorageConfig } from '@/types/database'

const BUCKETS = ['songs', 'order-photos', 'videos', 'payment-proofs'] as const

interface CleanupDetail {
  bucket: string
  order_id: string
  path: string
}

export interface CleanupResult {
  deletedFiles: number
  freedMb: number
  details: CleanupDetail[]
}

/**
 * Limpia archivos de pedidos terminados/rechazados que superan el umbral de días.
 * Cada bucket tiene su propio `cleanup_after_days` en storage_config.
 */
export async function runStorageCleanup(triggeredBy: 'cron' | 'manual' = 'cron'): Promise<CleanupResult> {
  const admin = createAdminClient()

  // Leer configuración de retención por bucket
  const { data: configsRaw } = await admin.from('storage_config').select('*')
  const configs = (configsRaw ?? []) as StorageConfig[]

  const details: CleanupDetail[] = []
  let totalBytesFreed = 0

  for (const bucket of BUCKETS) {
    const config = configs.find(c => c.bucket_name === bucket)
    const retentionDays = config?.cleanup_after_days ?? 30

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // Buscar pedidos elegibles para limpieza en este bucket:
    // - status 'entregado' o 'video_rechazado' con updated_at anterior al cutoff
    const { data: ordersRaw } = await admin
      .from('orders')
      .select('id')
      .in('status', ['entregado', 'video_rechazado'])
      .lt('updated_at', cutoffDate.toISOString())

    const orderIds = (ordersRaw ?? []).map((o: { id: string }) => o.id)
    if (orderIds.length === 0) continue

    for (const orderId of orderIds) {
      // Listar archivos de este pedido en el bucket
      const { data: files, error: listError } = await admin.storage
        .from(bucket)
        .list(orderId, { limit: 1000 })

      if (listError || !files || files.length === 0) continue

      const paths = files
        .filter((f: { name: string; metadata?: { size?: number } | null }) => f.name && !f.name.endsWith('/'))
        .map((f: { name: string; metadata?: { size?: number } | null }) => {
          totalBytesFreed += f.metadata?.size ?? 0
          return `${orderId}/${f.name}`
        })

      if (paths.length === 0) continue

      const { error: removeError } = await admin.storage.from(bucket).remove(paths)
      if (!removeError) {
        paths.forEach(path => details.push({ bucket, order_id: orderId, path }))
      }
    }
  }

  const freedMb = totalBytesFreed / (1024 * 1024)

  // Registrar en log
  await admin.from('storage_cleanup_log').insert({
    deleted_files: details.length,
    freed_mb: freedMb,
    triggered_by: triggeredBy,
    details: details as unknown as Record<string, unknown>[],
  } as never)

  return { deletedFiles: details.length, freedMb, details }
}

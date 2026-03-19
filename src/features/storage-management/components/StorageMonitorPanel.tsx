import { StorageBucketCard } from './StorageBucketCard'
import { StorageCleanupButton } from './StorageCleanupButton'
import type { StorageConfig, StorageCleanupLog } from '@/types/database'
import type { BucketStats } from '../services/get-storage-stats'

interface Props {
  stats: BucketStats[]
  configs: StorageConfig[]
  cleanupLog: StorageCleanupLog[]
}

export function StorageMonitorPanel({ stats, configs, cleanupLog }: Props) {
  const totalMb = stats.reduce((s, b) => s + b.sizeMb, 0)
  const totalFiles = stats.reduce((s, b) => s + b.files, 0)
  const hasAlert = stats.some(b => {
    const cfg = configs.find(c => c.bucket_name === b.bucket)
    const limit = cfg?.limit_mb ?? 500
    return (b.sizeMb / limit) >= 0.8
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            💾 Storage
            {hasAlert && (
              <span className="ml-2 text-xs font-medium bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                ⚠ Alerta de capacidad
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalFiles} archivos · {totalMb.toFixed(1)} MB total
          </p>
        </div>
        <StorageCleanupButton />
      </div>

      {/* Tarjetas por bucket */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map(bucketStats => (
          <StorageBucketCard
            key={bucketStats.bucket}
            stats={bucketStats}
            config={configs.find(c => c.bucket_name === bucketStats.bucket)}
          />
        ))}
      </div>

      {/* Log de limpiezas */}
      {cleanupLog.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Historial de limpiezas</p>
          <div className="space-y-2">
            {cleanupLog.map(log => (
              <div key={log.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                <div>
                  <span className="text-gray-700">
                    {log.deleted_files} archivo{log.deleted_files !== 1 ? 's' : ''} eliminado{log.deleted_files !== 1 ? 's' : ''}
                  </span>
                  {log.freed_mb !== null && (
                    <span className="text-gray-400 ml-2">· {Number(log.freed_mb).toFixed(2)} MB liberados</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className={`rounded-full px-1.5 py-0.5 ${log.triggered_by === 'manual' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                    {log.triggered_by}
                  </span>
                  <span>{new Date(log.ran_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cleanupLog.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Sin limpiezas registradas. El cron se ejecuta diariamente a las 3:00 AM UTC.
        </p>
      )}
    </div>
  )
}

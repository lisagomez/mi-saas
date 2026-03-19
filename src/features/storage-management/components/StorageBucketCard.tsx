'use client'

import { useState, useTransition } from 'react'
import { updateStorageConfig } from '../services/update-storage-config'
import type { StorageConfig } from '@/types/database'
import type { BucketStats } from '../services/get-storage-stats'

interface Props {
  stats: BucketStats
  config: StorageConfig | undefined
}

const BUCKET_LABELS: Record<string, string> = {
  'songs': '🎵 Songs (Audio)',
  'order-photos': '📷 Fotos de pedidos',
  'videos': '🎬 Videos',
  'payment-proofs': '🧾 Comprobantes de pago',
}

export function StorageBucketCard({ stats, config }: Props) {
  const limitMb = config?.limit_mb ?? 500
  const cleanupDays = config?.cleanup_after_days ?? 30
  const pct = Math.min(100, (stats.sizeMb / limitMb) * 100)
  const isAlert = pct >= 80

  const [editing, setEditing] = useState(false)
  const [limitInput, setLimitInput] = useState(String(limitMb))
  const [daysInput, setDaysInput] = useState(String(cleanupDays))
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await updateStorageConfig({
        bucket_name: stats.bucket,
        limit_mb: limitInput,
        cleanup_after_days: daysInput,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setEditing(false)
      }
    })
  }

  const barColor = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-indigo-500'

  return (
    <div className={`rounded-xl border bg-white p-5 ${isAlert ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {BUCKET_LABELS[stats.bucket] ?? stats.bucket}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{stats.files} archivo{stats.files !== 1 ? 's' : ''}</p>
        </div>
        {isAlert && (
          <span className="text-xs font-semibold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
            ⚠ {pct.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>{stats.sizeMb.toFixed(1)} MB usados</span>
        <span>límite: {limitMb} MB</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Config editable */}
      {editing ? (
        <div className="mt-4 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Límite (MB)</label>
              <input
                type="number"
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Limpiar después de (días)</label>
              <input
                type="number"
                value={daysInput}
                onChange={e => setDaysInput(e.target.value)}
                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">Limpieza: {cleanupDays} días post-entrega</p>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 hover:underline"
          >
            Editar
          </button>
        </div>
      )}
    </div>
  )
}

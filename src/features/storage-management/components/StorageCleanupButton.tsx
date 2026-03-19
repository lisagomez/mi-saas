'use client'

import { useState } from 'react'

interface CleanupResult {
  deleted_files: number
  freed_mb: string
}

export function StorageCleanupButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState('')

  async function handleCleanup() {
    if (!confirm('¿Ejecutar limpieza ahora? Se eliminarán archivos de pedidos entregados/rechazados que superen el umbral de días configurado.')) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const cronSecret = ''  // No se expone en cliente — el endpoint acepta requests sin CRON_SECRET si no está configurado
      const res = await fetch('/api/storage/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
        body: JSON.stringify({ triggered_by: 'manual' }),
      })

      const data = await res.json() as { ok?: boolean; error?: string; deleted_files?: number; freed_mb?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Error al ejecutar limpieza')
      } else {
        setResult({ deleted_files: data.deleted_files ?? 0, freed_mb: data.freed_mb ?? '0.00' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleCleanup}
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
      >
        {loading ? '⏳ Limpiando...' : '🗑 Limpiar ahora'}
      </button>

      {result && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
          ✓ {result.deleted_files} archivo{result.deleted_files !== 1 ? 's' : ''} eliminado{result.deleted_files !== 1 ? 's' : ''} · {result.freed_mb} MB liberados
        </p>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>
      )}
    </div>
  )
}

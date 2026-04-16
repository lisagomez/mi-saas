'use client'

import { useState } from 'react'
import { approveLyrics } from '../services/approve-lyrics'
import { saveLyrics } from '../services/save-lyrics'
import { VideoStatusBadge } from '@/features/video-generation/components/video-status-badge'
import type { VideoStatus } from '@/types/database'

interface LyricsOrder {
  id: string
  lead_phone: string
  story_text: string | null
  musical_style: string | null
  lyrics_text: string | null
  created_at: string
  video_status?: VideoStatus | null
}

export function CreativoView({ orders }: { orders: LyricsOrder[] }) {
  const [approving, setApproving] = useState<string | null>(null)
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  // Letra local actualizada tras guardar (sin recargar página)
  const [savedLyrics, setSavedLyrics] = useState<Record<string, string>>({})

  const pending = orders.filter(o => !approved.has(o.id))

  async function handleApprove(orderId: string) {
    setApproving(orderId)
    const result = await approveLyrics({ orderId })
    if (result.success) {
      setApproved(prev => new Set([...prev, orderId]))
    } else {
      setErrors(prev => ({ ...prev, [orderId]: result.error ?? 'Error desconocido' }))
    }
    setApproving(null)
  }

  function handleStartEdit(orderId: string, currentLyrics: string) {
    setEditDraft(prev => ({ ...prev, [orderId]: currentLyrics }))
    setEditing(orderId)
  }

  function handleCancelEdit(orderId: string) {
    setEditing(null)
    setEditDraft(prev => { const next = { ...prev }; delete next[orderId]; return next })
  }

  async function handleSaveEdit(orderId: string) {
    setSaving(orderId)
    const result = await saveLyrics({ orderId, lyricsText: editDraft[orderId] ?? '' })
    if (result.success) {
      setSavedLyrics(prev => ({ ...prev, [orderId]: editDraft[orderId] }))
      setEditing(null)
    } else {
      setErrors(prev => ({ ...prev, [orderId]: result.error ?? 'Error al guardar' }))
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Letras Pendientes de Revisión</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {pending.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-2xl">🎶</p>
          <p className="mt-2 font-medium text-gray-700">Todo al día</p>
          <p className="text-sm text-gray-400">No hay letras pendientes de revisión.</p>
        </div>
      )}

      {pending.map(order => (
        <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">📱 {order.lead_phone}</p>
              <p className="text-xs text-gray-400">
                {order.musical_style && <span className="mr-2">🎸 {order.musical_style}</span>}
                {new Date(order.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            {order.video_status && (
              <VideoStatusBadge status={order.video_status} />
            )}
          </div>

          {order.story_text && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Historia</p>
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {order.story_text}
              </p>
            </div>
          )}

          {(savedLyrics[order.id] ?? order.lyrics_text) && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Letra generada</p>
                {editing !== order.id && (
                  <button
                    onClick={() => handleStartEdit(order.id, savedLyrics[order.id] ?? order.lyrics_text ?? '')}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    ✏️ Editar
                  </button>
                )}
              </div>

              {editing === order.id ? (
                <textarea
                  value={editDraft[order.id] ?? ''}
                  onChange={e => setEditDraft(prev => ({ ...prev, [order.id]: e.target.value }))}
                  rows={16}
                  className="w-full rounded-lg border border-indigo-300 bg-indigo-50 p-3 text-sm text-gray-800 font-sans whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                />
              ) : (
                <pre className="max-h-64 overflow-y-auto rounded-lg bg-indigo-50 p-3 text-sm text-gray-800 whitespace-pre-wrap font-sans">
                  {savedLyrics[order.id] ?? order.lyrics_text}
                </pre>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {editing === order.id ? (
              <>
                <button
                  onClick={() => handleSaveEdit(order.id)}
                  disabled={saving === order.id}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving === order.id ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
                <button
                  onClick={() => handleCancelEdit(order.id)}
                  disabled={saving === order.id}
                  className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => handleApprove(order.id)}
                disabled={approving === order.id}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {approving === order.id ? 'Aprobando...' : '✅ Aprobar letra'}
              </button>
            )}
            {errors[order.id] && (
              <p className="text-xs text-red-500">{errors[order.id]}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

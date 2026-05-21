'use client'

import { useState } from 'react'
import { approveLyrics } from '../services/approve-lyrics'
import { saveLyrics } from '../services/save-lyrics'
import { VideoStatusBadge } from '@/features/video-generation/components/video-status-badge'
import { TiCard, TiButton } from '@/shared/components/ti'
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
        <h2 className="text-xl font-semibold text-[#F0F2F7]">Letras Pendientes de Revisión</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-[#4A7FBD]/20 px-3 py-1 text-sm font-medium text-[#4A7FBD]">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {pending.length === 0 && (
        <TiCard className="p-8 text-center">
          <p className="text-2xl">🎶</p>
          <p className="mt-2 font-medium text-[#F0F2F7]">Todo al día</p>
          <p className="text-sm text-[#555B6E]">No hay letras pendientes de revisión.</p>
        </TiCard>
      )}

      {pending.map(order => (
        <TiCard key={order.id} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-[#F0F2F7]">📱 {order.lead_phone}</p>
              <p className="text-xs text-[#555B6E]">
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
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#8C93A8]">Historia</p>
              <div
                className="rounded-lg p-3 text-sm text-[#8C93A8] whitespace-pre-wrap shadow-ti-inset"
                style={{ background: '#171920' }}
              >
                {order.story_text}
              </div>
            </div>
          )}

          {(savedLyrics[order.id] ?? order.lyrics_text) && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C93A8]">Letra generada</p>
                {editing !== order.id && (
                  <button
                    onClick={() => handleStartEdit(order.id, savedLyrics[order.id] ?? order.lyrics_text ?? '')}
                    className="text-xs text-[#4A7FBD] hover:text-[#22D3EE] font-medium transition-colors"
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
                  className="w-full rounded-lg border border-[#4A7FBD]/40 bg-[#171920] p-3 text-sm text-[#F0F2F7] font-sans whitespace-pre-wrap focus:outline-none focus:border-[#4A7FBD] resize-y"
                />
              ) : (
                <pre
                  className="max-h-64 overflow-y-auto rounded-lg p-3 text-sm text-[#8C93A8] whitespace-pre-wrap font-sans shadow-ti-inset"
                  style={{ background: '#171920' }}
                >
                  {savedLyrics[order.id] ?? order.lyrics_text}
                </pre>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {editing === order.id ? (
              <>
                <TiButton
                  onClick={() => handleSaveEdit(order.id)}
                  disabled={saving === order.id}
                >
                  {saving === order.id ? 'Guardando...' : '💾 Guardar cambios'}
                </TiButton>
                <TiButton
                  variant="ghost"
                  onClick={() => handleCancelEdit(order.id)}
                  disabled={saving === order.id}
                >
                  Cancelar
                </TiButton>
              </>
            ) : (
              <TiButton
                onClick={() => handleApprove(order.id)}
                disabled={approving === order.id}
              >
                {approving === order.id ? 'Aprobando...' : '✅ Aprobar letra'}
              </TiButton>
            )}
            {errors[order.id] && (
              <p className="text-xs text-[#FB923C]">{errors[order.id]}</p>
            )}
          </div>
        </TiCard>
      ))}
    </div>
  )
}

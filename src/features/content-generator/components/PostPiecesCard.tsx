'use client'

import { useState } from 'react'
import { TiCard, TiButton } from '@/shared/components/ti'
import { ContentPieceCard } from './ContentPieceCard'
import type { PostWithPieces } from '../types'

const FORMAT_ICON: Record<string, string> = {
  'Reel': '🎬', 'Carousel': '🎠', 'Post': '📝', 'Story': '📸',
}

interface Props {
  post: PostWithPieces
  piecesAutonomousMode: boolean
}

export function PostPiecesCard({ post, piecesAutonomousMode }: Props) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pieces, setPieces] = useState(post.pieces)
  const [open, setOpen] = useState(post.pieces.length > 0)

  const organicCount = pieces.filter((p) => p.tipo === 'organico').length
  const pautaCount = pieces.filter((p) => p.tipo === 'pauta').length
  const formats = [...new Set(pieces.map((p) => p.format))]

  const date = new Date(post.created_at).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short',
  })

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/content/generate-pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Error generando variantes')
        return
      }
      // Recargar piezas
      const refresh = await fetch(`/api/content/pieces?post_id=${post.id}`)
      if (refresh.ok) {
        const { pieces: newPieces } = await refresh.json() as { pieces: typeof pieces }
        setPieces(newPieces)
        setOpen(true)
      } else {
        // Forzar recarga de página si no hay endpoint de lectura
        window.location.reload()
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <TiCard variant="elevated" className="overflow-hidden">
      {/* Header del post */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left hover:bg-[#2C303C]/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{FORMAT_ICON[post.format] ?? '📄'}</span>
            <span className="text-sm font-semibold text-[#F0F2F7] truncate">
              {post.avatar_name ?? 'Sin avatar'}
            </span>
            {post.status === 'Publicado' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/20">
                Publicado
              </span>
            )}
          </div>
          {post.weekly_theme && (
            <p className="mt-0.5 text-xs text-[#555B6E] truncate">{post.weekly_theme}</p>
          )}
          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-[#555B6E]">
            <span>{date}</span>
            {pieces.length > 0 ? (
              <>
                <span>{organicCount} orgánico{organicCount !== 1 ? 's' : ''}</span>
                <span>{pautaCount} pauta{pautaCount !== 1 ? '' : ''}</span>
                <span className="font-medium text-[#8C93A8]">{pieces.length} variantes</span>
                <span className="text-[#3A3F4E] hidden sm:inline">
                  {formats.join(' · ')}
                </span>
              </>
            ) : (
              <span className="text-[#FB923C]">Sin variantes generadas</span>
            )}
          </div>
        </div>
        <span className="text-[#555B6E] text-xs mt-1 flex-shrink-0">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Estado vacío + botón generar */}
      {open && pieces.length === 0 && (
        <div className="px-5 pb-5 border-t border-[#3A3F4E]">
          <div
            className="mt-4 rounded-lg border border-dashed border-[#3A3F4E] px-5 py-6 text-center"
            style={{ background: '#171920' }}
          >
            <p className="text-sm text-[#555B6E] mb-3">
              {piecesAutonomousMode
                ? '⚙️ Las variantes se generarán automáticamente al aprobar el post'
                : 'No hay variantes generadas aún'}
            </p>
            {!piecesAutonomousMode && (
              <TiButton onClick={handleGenerate} disabled={generating} size="sm">
                {generating ? 'Generando variantes…' : '✨ Generar variantes ahora'}
              </TiButton>
            )}
            {error && <p className="mt-2 text-xs text-[#FB923C]">{error}</p>}
          </div>
        </div>
      )}

      {/* Lista de piezas */}
      {open && pieces.length > 0 && (
        <div className="px-5 pb-5 border-t border-[#3A3F4E]">
          <div className="mt-4 space-y-3">
            {pieces.map((piece) => (
              <ContentPieceCard key={piece.id} piece={piece} />
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-[#FB923C]">{error}</p>}
        </div>
      )}
    </TiCard>
  )
}

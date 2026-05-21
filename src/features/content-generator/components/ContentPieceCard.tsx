'use client'

import { useState } from 'react'
import { TiCard } from '@/shared/components/ti'
import type { ContentPiece } from '../types'

const FORMAT_ICON: Record<string, string> = {
  'Reel': '🎬',
  'Carousel': '🎠',
  'Post': '📝',
  'FB Ad': '📣',
  'WhatsApp Broadcast': '💬',
}

const RED_SOCIAL_COLOR: Record<string, string> = {
  'Instagram': 'bg-[#E1306C]/20 text-[#E1306C] border border-[#E1306C]/30',
  'TikTok': 'bg-[#F0F2F7]/10 text-[#F0F2F7] border border-[#3A3F4E]',
  'Facebook': 'bg-[#1877F2]/20 text-[#4A9FFF] border border-[#1877F2]/30',
  'WhatsApp': 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30',
}

const TIPO_STYLE: Record<string, string> = {
  'organico': 'bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20',
  'pauta': 'bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/20',
}

const TIPO_LABEL: Record<string, string> = {
  'organico': 'Orgánico · PAS',
  'pauta': 'Pauta · AIDA',
}

function StarRating({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-[#555B6E]">🔷 Sin auditoría</span>
  }
  const stars = score + 1 // 0→1, 1→2, 2→3, 3→4, 4→5
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < stars ? 'text-[#FB923C]' : 'text-[#3A3F4E]'} style={{ fontSize: '13px' }}>★</span>
      ))}
      <span className="ml-1 text-xs text-[#555B6E]">{score}/4 criterios</span>
    </span>
  )
}

export function ContentPieceCard({ piece }: { piece: ContentPiece }) {
  const [expanded, setExpanded] = useState(false)
  const icon = FORMAT_ICON[piece.format] ?? '📄'
  const preview = piece.body.slice(0, 120)
  const hasMore = piece.body.length > 120

  return (
    <TiCard className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-[#F0F2F7]">{piece.format}</span>
          {piece.red_social.map((rs) => (
            <span key={rs} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RED_SOCIAL_COLOR[rs] ?? 'bg-[#3A3F4E] text-[#8C93A8]'}`}>
              {rs}
            </span>
          ))}
        </div>
        <span className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full ${TIPO_STYLE[piece.tipo] ?? ''}`}>
          {TIPO_LABEL[piece.tipo] ?? piece.tipo}
        </span>
      </div>

      {/* Body preview */}
      <div
        className="rounded-lg px-3 py-2.5 text-sm text-[#8C93A8] whitespace-pre-wrap leading-relaxed shadow-ti-inset"
        style={{ background: '#171920' }}
      >
        {expanded ? piece.body : `${preview}${hasMore ? '…' : ''}`}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-[#4A7FBD] hover:text-[#22D3EE] text-xs font-medium transition-colors"
          >
            {expanded ? 'Colapsar ↑' : 'Ver completo ↓'}
          </button>
        )}
      </div>

      {/* Footer: stars + cost */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <StarRating score={piece.audit_score} />
        <span className="text-xs text-[#555B6E]">
          {piece.token_cost_usd !== null
            ? `$${piece.token_cost_usd.toFixed(5)} USD`
            : '—'}
        </span>
      </div>
    </TiCard>
  )
}

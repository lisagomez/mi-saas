'use client'

import { useState, useEffect } from 'react'
import { TiCard } from '@/shared/components/ti'
import { PostPiecesCard } from './PostPiecesCard'
import type { PostWithPieces } from '../types'

interface Props {
  initialPosts: PostWithPieces[]
}

export function ContentGeneratorView({ initialPosts }: Props) {
  const [posts] = useState<PostWithPieces[]>(initialPosts)
  const [piecesAutonomousMode, setPiecesAutonomousMode] = useState(false)
  const [togglingMode, setTogglingMode] = useState(false)

  const totalVariantes = posts.reduce((s, p) => s + p.pieces.length, 0)
  const postsWithPieces = posts.filter((p) => p.pieces.length > 0).length
  const postsPending = posts.filter((p) => p.pieces.length === 0).length

  useEffect(() => {
    fetch('/api/guardian/config')
      .then((r) => r.json())
      .then((data: { pieces_autonomous_mode?: boolean }) => {
        if (typeof data.pieces_autonomous_mode === 'boolean') {
          setPiecesAutonomousMode(data.pieces_autonomous_mode)
        }
      })
      .catch(() => {})
  }, [])

  async function handleToggleMode() {
    setTogglingMode(true)
    const next = !piecesAutonomousMode
    try {
      await fetch('/api/guardian/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pieces_autonomous_mode: next }),
      })
      setPiecesAutonomousMode(next)
    } finally {
      setTogglingMode(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[#F0F2F7]">Generador de Contenido</h1>
          <p className="mt-0.5 text-sm text-[#555B6E]">
            {posts.length} post{posts.length !== 1 ? 's' : ''} aprobado{posts.length !== 1 ? 's' : ''} · {totalVariantes} variante{totalVariantes !== 1 ? 's' : ''} generada{totalVariantes !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Toggle Human-in-the-loop */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-[#F0F2F7]">
              {piecesAutonomousMode ? 'Modo autónomo' : 'Human in the loop'}
            </p>
            <p className="text-[10px] text-[#555B6E]">
              {piecesAutonomousMode
                ? 'Genera al aprobar en Kanban'
                : 'Tú decides cuándo generar'}
            </p>
          </div>
          <button
            onClick={handleToggleMode}
            disabled={togglingMode}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
            style={{ background: piecesAutonomousMode ? '#4A7FBD' : '#3A3F4E' }}
            aria-label="Toggle modo autónomo"
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              style={{ transform: piecesAutonomousMode ? 'translateX(22px)' : 'translateX(4px)' }}
            />
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <TiCard className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-[#4A7FBD]">{posts.length}</p>
          <p className="text-xs text-[#555B6E] mt-0.5">Posts aprobados</p>
        </TiCard>
        <TiCard className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-[#4ADE80]">{totalVariantes}</p>
          <p className="text-xs text-[#555B6E] mt-0.5">Variantes listas</p>
        </TiCard>
        <TiCard className="px-4 py-3 text-center">
          <p className="text-2xl font-bold text-[#FB923C]">{postsPending}</p>
          <p className="text-xs text-[#555B6E] mt-0.5">Pendientes</p>
        </TiCard>
      </div>

      {/* Leyenda de formatos */}
      <TiCard className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555B6E] mb-2">Formatos y redes</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#8C93A8]">
          {[
            { icon: '🎬', label: 'Reel', redes: 'Instagram · TikTok', tipo: 'Orgánico' },
            { icon: '🎠', label: 'Carousel', redes: 'Instagram · Facebook', tipo: 'Orgánico' },
            { icon: '📝', label: 'Post', redes: 'Facebook · Instagram', tipo: 'Orgánico' },
            { icon: '📣', label: 'FB Ad', redes: 'Facebook', tipo: 'Pauta' },
            { icon: '💬', label: 'WhatsApp Broadcast', redes: 'WhatsApp', tipo: 'Pauta' },
          ].map((f) => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span>{f.icon}</span>
              <span className="font-medium text-[#F0F2F7]">{f.label}</span>
              <span className="text-[#555B6E]">→ {f.redes}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.tipo === 'Orgánico' ? 'bg-[#4ADE80]/10 text-[#4ADE80]' : 'bg-[#FB923C]/10 text-[#FB923C]'}`}>
                {f.tipo}
              </span>
            </span>
          ))}
        </div>
      </TiCard>

      {/* Lista de posts */}
      {posts.length === 0 ? (
        <TiCard variant="inset" className="px-8 py-12 text-center border-dashed">
          <div className="text-4xl mb-4">✨</div>
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-2">Sin posts aprobados aún</h2>
          <p className="text-sm text-[#555B6E] max-w-sm mx-auto">
            Aprueba posts en el Feed para que aparezcan aquí y generar sus variantes de contenido.
          </p>
        </TiCard>
      ) : (
        <div className="space-y-3">
          {postsWithPieces > 0 && (
            <p className="text-xs font-semibold uppercase tracking-widest text-[#555B6E]">
              Con variantes generadas · {postsWithPieces}
            </p>
          )}
          {posts.filter((p) => p.pieces.length > 0).map((post) => (
            <PostPiecesCard key={post.id} post={post} piecesAutonomousMode={piecesAutonomousMode} />
          ))}

          {postsPending > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#555B6E] pt-2">
                Pendientes de generar · {postsPending}
              </p>
              {posts.filter((p) => p.pieces.length === 0).map((post) => (
                <PostPiecesCard key={post.id} post={post} piecesAutonomousMode={piecesAutonomousMode} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

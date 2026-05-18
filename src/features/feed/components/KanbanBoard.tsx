'use client'

import { useState, useRef, useTransition } from 'react'
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import type { Post, PostStatus } from '../types'
import { updatePostStatus } from '../services/update-post-status'

const STATUSES: PostStatus[] = ['Ideado', 'Generado', 'Aprobado', 'Publicado']

const STATUS_META: Record<PostStatus, { bg: string; border: string; header: string; dot: string; badge: string }> = {
  Ideado:    { bg: 'bg-gray-50',     border: 'border-gray-200',    header: 'text-gray-600',    dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600' },
  Generado:  { bg: 'bg-blue-50',    border: 'border-blue-200',    header: 'text-blue-700',    dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  Aprobado:  { bg: 'bg-amber-50',   border: 'border-amber-200',   header: 'text-amber-700',   dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700' },
  Publicado: { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
}

const FORMAT_ICONS: Record<string, string> = {
  Reel:     '🎬',
  Carousel: '🖼️',
  Post:     '📝',
  Story:    '⭕',
}

// ─── Post detail panel ────────────────────────────────────────────────────────

function PostDetailPanel({ post, onClose }: { post: Post; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const meta = STATUS_META[post.status]
  const icon = FORMAT_ICONS[post.format] ?? '📄'
  const content = post.body ?? post.prompt_template ?? ''

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">{post.format}</span>
              <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${meta.badge}`}>
                {post.status}
              </span>
              {post.avatar_name && (
                <span className="text-[11px] bg-violet-100 text-violet-600 rounded-full px-2 py-0.5 font-medium truncate max-w-[140px]">
                  {post.avatar_name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date(post.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 shrink-0"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Weekly theme */}
          {post.weekly_theme && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Tema semanal</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{post.weekly_theme}</p>
            </div>
          )}

          {/* Content */}
          {content && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {post.body ? 'Copy aprobado' : 'Prompt template'}
                </p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {post.notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Notas</p>
              <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                post.notes.startsWith('🔄')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : post.notes.startsWith('💡')
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'bg-gray-50 text-gray-600 border border-gray-100'
              }`}>
                {post.notes}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!content && !post.notes && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">Este post aún no tiene contenido generado.</p>
              <p className="text-xs mt-1">Usa <code className="bg-gray-100 rounded px-1">/content-prompt-gen</code> para generarlo.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, isDragging = false }: { post: Post; isDragging?: boolean }) {
  const icon = FORMAT_ICONS[post.format] ?? '📄'

  return (
    <div className={`rounded-lg border bg-white px-3 py-2.5 shadow-sm space-y-1.5 cursor-grab active:cursor-grabbing select-none ${
      isDragging ? 'opacity-60 shadow-lg ring-2 ring-indigo-300' : 'hover:shadow-md hover:border-gray-200 transition-all'
    }`}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{post.format}</span>
        {post.avatar_name && (
          <span className="ml-auto text-[10px] bg-violet-100 text-violet-600 rounded-full px-1.5 py-0.5 font-medium truncate max-w-[90px]">
            {post.avatar_name}
          </span>
        )}
      </div>

      {post.weekly_theme && (
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
          {post.weekly_theme}
        </p>
      )}

      {(post.body ?? post.prompt_template) && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
          {post.body ?? post.prompt_template}
        </p>
      )}

      {post.notes && (
        <div className={`rounded-md px-2 py-1.5 text-[10px] leading-snug ${
          post.notes.startsWith('🔄')
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : post.notes.startsWith('💡')
              ? 'bg-amber-50 text-amber-700 border border-amber-100'
              : 'bg-gray-50 text-gray-500 border border-gray-100'
        }`}>
          <span className="line-clamp-1">{post.notes}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-0.5">
        <p className="text-[10px] text-gray-300">
          {new Date(post.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </p>
        {(post.body ?? post.prompt_template) && (
          <span className="text-[10px] text-gray-300">Ver →</span>
        )}
      </div>
    </div>
  )
}

// ─── Draggable card (clic vs drag) ───────────────────────────────────────────

function DraggableCard({ post, onSelect }: { post: Post; onSelect: (p: Post) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: post.id })
  const dragMoved = useRef(false)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onPointerDown={() => { dragMoved.current = false }}
      onPointerMove={() => { dragMoved.current = true }}
      onClick={() => { if (!dragMoved.current) onSelect(post) }}
    >
      <PostCard post={post} isDragging={isDragging} />
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ status, posts, onSelect }: { status: PostStatus; posts: Post[]; onSelect: (p: Post) => void }) {
  const meta = STATUS_META[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-[240px] w-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className={`text-sm font-semibold ${meta.header}`}>{status}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
          {posts.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'border-indigo-300 bg-indigo-50/40' : `${meta.border} ${meta.bg}`
        }`}
      >
        {posts.map((post) => (
          <DraggableCard key={post.id} post={post} onSelect={onSelect} />
        ))}
        {posts.length === 0 && (
          <p className="text-xs text-gray-300 text-center pt-8 select-none">
            Arrastra aquí
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Kanban board ─────────────────────────────────────────────────────────────

export function KanbanBoard({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [, startTransition] = useTransition()

  const byStatus = (status: PostStatus) => posts.filter((p) => p.status === status)

  function handleDragStart(event: { active: { id: string | number } }) {
    const found = posts.find((p) => p.id === String(event.active.id))
    setActivePost(found ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePost(null)
    const { active, over } = event
    if (!over) return

    const postId = String(active.id)
    const newStatus = over.id as PostStatus
    if (!STATUSES.includes(newStatus)) return

    const current = posts.find((p) => p.id === postId)
    if (!current || current.status === newStatus) return

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    )

    startTransition(async () => {
      await updatePostStatus(postId, newStatus)
    })
  }

  return (
    <>
      <DndContext id="kanban" onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} posts={byStatus(status)} onSelect={setSelectedPost} />
          ))}
        </div>
        <DragOverlay>
          {activePost ? <PostCard post={activePost} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {selectedPost && (
        <PostDetailPanel post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  )
}

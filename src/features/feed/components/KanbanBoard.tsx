'use client'

import { useState, useTransition } from 'react'
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import type { Post, PostStatus } from '../types'
import { updatePostStatus } from '../services/update-post-status'

const STATUSES: PostStatus[] = ['Ideado', 'Generado', 'Aprobado', 'Publicado']

const STATUS_META: Record<PostStatus, { bg: string; border: string; header: string; dot: string }> = {
  Ideado:    { bg: 'bg-gray-50',     border: 'border-gray-200',    header: 'text-gray-600',   dot: 'bg-gray-400' },
  Generado:  { bg: 'bg-blue-50',    border: 'border-blue-200',    header: 'text-blue-700',   dot: 'bg-blue-500' },
  Aprobado:  { bg: 'bg-amber-50',   border: 'border-amber-200',   header: 'text-amber-700',  dot: 'bg-amber-500' },
  Publicado: { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'text-emerald-700', dot: 'bg-emerald-500' },
}

const FORMAT_ICONS: Record<string, string> = {
  Reel:     '🎬',
  Carousel: '🖼️',
  Post:     '📝',
  Story:    '⭕',
}

function PostCard({ post, isDragging = false }: { post: Post; isDragging?: boolean }) {
  const meta = STATUS_META[post.status]
  const icon = FORMAT_ICONS[post.format] ?? '📄'

  return (
    <div className={`rounded-lg border bg-white px-3 py-2.5 shadow-sm space-y-1.5 cursor-grab active:cursor-grabbing select-none ${
      isDragging ? 'opacity-60 shadow-lg ring-2 ring-indigo-300' : 'hover:shadow-md transition-shadow'
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
          {post.notes}
        </div>
      )}

      <p className="text-[10px] text-gray-300 pt-0.5">
        {new Date(post.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}

function DraggableCard({ post }: { post: Post }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: post.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <PostCard post={post} isDragging={isDragging} />
    </div>
  )
}

function KanbanColumn({ status, posts }: { status: PostStatus; posts: Post[] }) {
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
          <DraggableCard key={post.id} post={post} />
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

export function KanbanBoard({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [activePost, setActivePost] = useState<Post | null>(null)
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

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    )

    // Background DB sync
    startTransition(async () => {
      await updatePostStatus(postId, newStatus)
    })
  }

  return (
    <DndContext id="kanban" onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} posts={byStatus(status)} />
        ))}
      </div>
      <DragOverlay>
        {activePost ? <PostCard post={activePost} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

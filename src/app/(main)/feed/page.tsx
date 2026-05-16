import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeedPosts } from '@/features/feed/services/get-feed-posts'
import { KanbanBoard } from '@/features/feed/components/KanbanBoard'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const posts = await getFeedPosts()
  const total = posts.length
  const published = posts.filter(p => p.status === 'Publicado').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed de Contenido</h1>
          <p className="mt-1 text-sm text-gray-500">
            Arrastra los posts entre columnas para actualizar su estado
          </p>
        </div>
        {total > 0 && (
          <div className="shrink-0 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-indigo-700">{published}/{total}</p>
            <p className="text-xs text-indigo-500">publicados</p>
          </div>
        )}
      </div>

      {/* Kanban */}
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-14 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-base font-semibold text-gray-700 mb-2">Sin posts en el feed aún</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-4">
            Usa el skill{' '}
            <code className="bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">/feed-generator</code>{' '}
            para generar tu calendario semanal de contenido.
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-left text-xs text-gray-500 max-w-sm mx-auto font-mono">
            <span className="text-indigo-600">→</span> genera el feed para esta semana
          </div>
        </div>
      ) : (
        <KanbanBoard initialPosts={posts} />
      )}
    </div>
  )
}

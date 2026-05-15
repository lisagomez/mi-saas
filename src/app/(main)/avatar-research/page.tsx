import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAvatars } from '@/features/avatar-research/services/get-avatars'
import { AvatarCard } from '@/features/avatar-research/components/AvatarCard'

export default async function AvatarResearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? null

  if (role !== 'administrador') redirect('/dashboard')

  const avatars = await getAvatars()
  const totalPending = avatars.reduce((s, a) => s + a.pending_insights, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avatar Research</h1>
          <p className="mt-1 text-sm text-gray-500">
            Perfiles de cliente investigados · pipeline de estrategia proactiva
          </p>
        </div>
        {totalPending > 0 && (
          <div className="shrink-0 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-violet-700">{totalPending}</p>
            <p className="text-xs text-violet-500">insights pendientes</p>
          </div>
        )}
      </div>

      {/* Pipeline visual */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Pipeline</p>
        <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
          {[
            { step: '/avatar-research', desc: 'investigación web + leads' },
            { step: 'strategy-bridge',  desc: 'genera insights proactivos' },
            { step: '/content-prompt-gen', desc: 'copy AIDA/PAS listo' },
          ].map((s, i, arr) => (
            <span key={s.step} className="flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-gray-700">{s.step}</span>
              <span className="text-gray-400 hidden sm:inline">{s.desc}</span>
              {i < arr.length - 1 && <span className="text-gray-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Lista de avatares */}
      {avatars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-8 py-12 text-center">
          <div className="text-4xl mb-4">🧑‍🤝‍🧑</div>
          <h2 className="text-base font-semibold text-gray-700 mb-2">Sin avatares investigados aún</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-4">
            Ejecuta el skill <code className="bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">/avatar-research</code> para
            investigar el perfil de tu cliente ideal y generar insights proactivos automáticamente.
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-left text-xs text-gray-500 max-w-sm mx-auto font-mono">
            <span className="text-violet-600">→</span> Investiga mi avatar — migrantes mexicanos en California
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{avatars.length} avatar{avatars.length !== 1 ? 'es' : ''} en la biblioteca</p>
          {avatars.map(avatar => (
            <AvatarCard key={avatar.id} avatar={avatar} />
          ))}
        </div>
      )}
    </div>
  )
}

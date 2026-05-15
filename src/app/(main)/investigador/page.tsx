import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InvestigadorView } from '@/features/dashboard/components/investigador-view'
import { InvestigatorAgentPanel } from '@/features/agents/investigator/components/InvestigatorAgentPanel'
import { getLatestInvestigatorReport } from '@/features/agents/investigator/services/run-investigator-agent'
import type { Competitor } from '@/types/database'

export default async function InvestigadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role: string } | null)?.role ?? null

  if (role !== 'agente_investigador' && role !== 'administrador') {
    redirect('/dashboard')
  }

  const [{ data: competitorsRaw }, latestReport] = await Promise.all([
    admin.from('competitors').select('*').order('created_at', { ascending: true }),
    getLatestInvestigatorReport(),
  ])

  const competitors = (competitorsRaw ?? []) as Competitor[]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agente Investigador</h1>
        <p className="mt-1 text-sm text-gray-500">Análisis competitivo del mercado latino en EE.UU.</p>
      </div>
      <InvestigadorView initial={competitors} />
      <InvestigatorAgentPanel initialReport={latestReport} />
    </div>
  )
}

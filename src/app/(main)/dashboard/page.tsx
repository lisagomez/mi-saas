import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreativoView } from '@/features/dashboard/components/creativo-view'
import { InvestigadorView } from '@/features/dashboard/components/investigador-view'
import { FinancieroView } from '@/features/dashboard/components/financiero-view'
import { AdminView } from '@/features/dashboard/components/admin-view'
import { PaymentConfirmationPanel } from '@/features/orders/components/payment-confirmation-panel'
import { getFinancialMetrics } from '@/features/dashboard/services/get-financial-metrics'
import { getLatestInvestigatorReport } from '@/features/agents/investigator/services/run-investigator-agent'
import { getCampaignsWithMetrics } from '@/features/facebook-ads/services/get-campaigns-with-metrics'
import { getStorageStats } from '@/features/storage-management/services/get-storage-stats'
import { getStorageConfig } from '@/features/storage-management/services/get-storage-config'
import { getCleanupLog } from '@/features/storage-management/services/get-cleanup-log'
import { getConvertedLeads } from '@/features/leads/services/get-converted-leads'
import type { Competitor, PromotionsCatalog } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('profiles').select('role').eq('id', user.id).single()

  const role = (profileData as { role: string } | null)?.role ?? null

  // --- Fetch por rol ---

  // Letras pendientes (creativo + admin)
  const needsLyrics = role === 'creativo' || role === 'administrador'
  const { data: lyricsRaw } = needsLyrics
    ? await admin.from('orders').select(`
        id, story_text, musical_style, created_at,
        leads!inner(phone),
        songs(lyrics_text)
      `).eq('status', 'letra_generada').order('created_at', { ascending: true })
    : { data: [] }

  const lyricsOrders = (lyricsRaw ?? []).map((o: Record<string, unknown>) => {
    const leads = o.leads as { phone: string } | { phone: string }[]
    const songs = o.songs as { lyrics_text: string }[] | null
    return {
      id: o.id as string,
      lead_phone: (Array.isArray(leads) ? leads[0]?.phone : leads?.phone) ?? '',
      story_text: o.story_text as string | null,
      musical_style: o.musical_style as string | null,
      lyrics_text: songs?.[0]?.lyrics_text ?? null,
      created_at: o.created_at as string,
    }
  })

  // Competidores (investigador + admin)
  const needsCompetitors = role === 'agente_investigador' || role === 'administrador'
  const { data: competitorsRaw } = needsCompetitors
    ? await admin.from('competitors').select('*').order('created_at', { ascending: true })
    : { data: [] }
  const competitors = (competitorsRaw ?? []) as Competitor[]

  // Métricas financieras (admin_pagos + admin)
  const needsMetrics = role === 'admin_pagos' || role === 'administrador'
  const metrics = needsMetrics ? await getFinancialMetrics() : null

  // Datos para agentes (solo admin)
  const isAdmin = role === 'administrador'
  const [latestInvestigatorReport, activePromotionsRaw, facebookCampaigns, storageStats, storageConfigs, storageCleanupLog, convertedLeads, allPromotions] = isAdmin
    ? await Promise.all([
        getLatestInvestigatorReport(),
        admin.from('promotions_catalog').select('*').eq('is_active', true)
          .lte('valid_from', new Date().toISOString().split('T')[0])
          .gte('valid_to', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false }),
        getCampaignsWithMetrics(),
        getStorageStats(),
        getStorageConfig(),
        getCleanupLog(),
        getConvertedLeads(),
        admin.from('promotions_catalog').select('*').order('created_at', { ascending: false }),
      ])
    : [null, { data: [] }, [], [], [], [], [], { data: [] }]
  const activePromotions = (activePromotionsRaw.data ?? []) as PromotionsCatalog[]
  const allPromotionsList = ((allPromotions as { data: unknown[] }).data ?? []) as PromotionsCatalog[]

  // Pagos pendientes (admin_pagos + admin)
  const needsPayments = role === 'admin_pagos' || role === 'administrador'
  const { data: paymentsRaw } = needsPayments
    ? await admin.from('orders').select(`
        id, story_text, musical_style, payment_proof_url, created_at,
        leads!inner(phone),
        songs(lyrics_text)
      `).eq('status', 'pago_pendiente').order('created_at', { ascending: true })
    : { data: [] }

  const pendingPayments = (paymentsRaw ?? []).map((o: Record<string, unknown>) => {
    const leads = o.leads as { phone: string } | { phone: string }[]
    const songs = o.songs as { lyrics_text: string }[] | null
    return {
      id: o.id as string,
      lead_phone: (Array.isArray(leads) ? leads[0]?.phone : leads?.phone) ?? '',
      story_text: o.story_text as string | null,
      musical_style: o.musical_style as string | null,
      payment_proof_url: o.payment_proof_url as string | null,
      created_at: o.created_at as string,
      lyrics_text: songs?.[0]?.lyrics_text ?? null,
    }
  })

  // Pagos de video pendientes (admin_pagos + admin)
  const { data: videoPaymentsRaw } = needsPayments
    ? await admin.from('orders').select(`
        id, musical_style, created_at,
        leads!inner(phone),
        videos(payment_proof_url, price)
      `).eq('status', 'video_pago_enviado').order('created_at', { ascending: true })
    : { data: [] }

  const pendingVideoPayments = (videoPaymentsRaw ?? []).map((o: Record<string, unknown>) => {
    const leads = o.leads as { phone: string } | { phone: string }[]
    const videos = o.videos as { payment_proof_url: string | null; price: number | null }[] | null
    return {
      id: o.id as string,
      lead_phone: (Array.isArray(leads) ? leads[0]?.phone : leads?.phone) ?? '',
      musical_style: o.musical_style as string | null,
      payment_proof_url: videos?.[0]?.payment_proof_url ?? null,
      video_price: videos?.[0]?.price ?? null,
      created_at: o.created_at as string,
    }
  })

  return (
    <div className="mx-auto max-w-5xl">
        {role === 'creativo' && (
          <CreativoView orders={lyricsOrders} />
        )}

        {role === 'agente_investigador' && (
          <InvestigadorView initial={competitors} />
        )}

        {role === 'admin_pagos' && metrics && (
          <div className="space-y-8">
            <FinancieroView metrics={metrics} />
            <PaymentConfirmationPanel orders={pendingPayments} />
          </div>
        )}

        {role === 'administrador' && metrics && (
          <AdminView
            lyricsOrders={lyricsOrders}
            competitors={competitors}
            metrics={metrics}
            pendingPayments={pendingPayments}
            pendingVideoPayments={pendingVideoPayments}
            latestInvestigatorReport={latestInvestigatorReport}
            activePromotions={activePromotions}
            facebookCampaigns={facebookCampaigns}
            storageStats={storageStats}
            storageConfigs={storageConfigs}
            storageCleanupLog={storageCleanupLog}
            convertedLeads={convertedLeads as import('@/features/leads/services/get-converted-leads').ConvertedLead[]}
            allPromotions={allPromotionsList}
          />
        )}

        {!role && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
            Sin rol asignado. Contacta al administrador.
          </div>
        )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CreativoView } from './creativo-view'
import { InvestigadorView } from './investigador-view'
import { FinancieroView } from './financiero-view'
import { PaymentConfirmationPanel } from '@/features/orders/components/payment-confirmation-panel'
import { VideoPaymentConfirmationPanel } from '@/features/video-generation/components/video-payment-confirmation-panel'
import { InvestigatorAgentPanel } from '@/features/agents/investigator/components/InvestigatorAgentPanel'
import { FinancialAgentPanel } from '@/features/agents/financial/components/FinancialAgentPanel'
import { PromotionsAgentPanel } from '@/features/agents/promotions/components/PromotionsAgentPanel'
import { FacebookAdsPanel } from '@/features/facebook-ads/components/FacebookAdsPanel'
import { StorageMonitorPanel } from '@/features/storage-management/components/StorageMonitorPanel'
import { GuardianPanel } from '@/features/content-guardian/components/GuardianPanel'
import { LeadsView } from '@/features/leads/components/LeadsView'
import { LeadsImporter } from '@/features/leads/components/LeadsImporter'
import { PricingCampaignPanel } from './pricing-campaign-panel'
import { AvatarCard } from '@/features/avatar-research/components/AvatarCard'
import type { Competitor, FinancialMetrics, PromotionsCatalog, CampaignWithMetrics, StorageConfig, StorageCleanupLog } from '@/types/database'
import type { AvatarWithInsights } from '@/features/avatar-research/services/get-avatars'
import type { InvestigatorReport } from '@/features/agents/investigator/services/run-investigator-agent'
import type { BucketStats } from '@/features/storage-management/services/get-storage-stats'
import type { ConvertedLead } from '@/features/leads/services/get-converted-leads'
import type { CampaignHistory } from '@/features/leads/types/leads'

interface LyricsOrder {
  id: string; lead_phone: string; story_text: string | null
  musical_style: string | null; lyrics_text: string | null; created_at: string
}
interface PendingPayment {
  id: string; lead_phone: string; story_text: string | null
  musical_style: string | null; payment_proof_url: string | null
  created_at: string; lyrics_text: string | null
}

interface PendingVideoPayment {
  id: string; lead_phone: string; musical_style: string | null
  payment_proof_url: string | null; video_price: number | null; created_at: string
}

interface PricingCampaign {
  id: string
  campaign_number: number
  campaign_name: string
  price_label: string
  valid_from: string
  valid_until: string | null
  assignment: 'all' | 'new_leads' | 'specific'
  lead_ids: string[]
  is_active: boolean
}

interface QualifiedLead {
  id: string
  phone: string
  created_at: string
}

interface Props {
  lyricsOrders: LyricsOrder[]
  competitors: Competitor[]
  metrics: FinancialMetrics
  pendingPayments: PendingPayment[]
  pendingVideoPayments: PendingVideoPayment[]
  latestInvestigatorReport?: InvestigatorReport | null
  activePromotions?: PromotionsCatalog[]
  facebookCampaigns?: CampaignWithMetrics[]
  storageStats?: BucketStats[]
  storageConfigs?: StorageConfig[]
  storageCleanupLog?: StorageCleanupLog[]
  convertedLeads?: ConvertedLead[]
  allPromotions?: PromotionsCatalog[]
  campaignHistory?: CampaignHistory[]
  pricingCampaigns?: PricingCampaign[]
  qualifiedLeads?: QualifiedLead[]
  avatars?: AvatarWithInsights[]
}

const TABS = [
  { key: 'letras', label: '🎵 Letras' },
  { key: 'competencia', label: '🔍 Competencia' },
  { key: 'financiero', label: '📊 Financiero' },
  { key: 'pagos', label: '💳 Pagos' },
  { key: 'videos', label: '🎬 Videos' },
  { key: 'leads', label: '👥 Leads' },
  { key: 'importar', label: '📥 Importar' },
  { key: 'precios', label: '💰 Precios' },
  { key: 'facebook-ads', label: '📣 Facebook Ads' },
  { key: 'storage', label: '💾 Storage' },
  { key: 'agentes', label: '🤖 Agentes' },
  { key: 'guardian', label: '🛡️ Guardian' },
  { key: 'avatar', label: '🧑 Avatar Research' },
] as const

type TabKey = typeof TABS[number]['key']

export function AdminView({ lyricsOrders, competitors, metrics, pendingPayments, pendingVideoPayments, latestInvestigatorReport, activePromotions, facebookCampaigns, storageStats, storageConfigs, storageCleanupLog, convertedLeads = [], allPromotions = [], campaignHistory = [], pricingCampaigns = [], qualifiedLeads = [], avatars = [] }: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const validTab = tabParam && TABS.some(t => t.key === tabParam) ? tabParam : 'letras'
  const [tab, setTab] = useState<TabKey>(validTab)

  useEffect(() => {
    const p = searchParams.get('tab') as TabKey | null
    if (p && TABS.some(t => t.key === p)) setTab(p)
  }, [searchParams])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Panel Administrador</h2>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'letras' && lyricsOrders.length > 0 && (
              <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 text-xs text-indigo-700">
                {lyricsOrders.length}
              </span>
            )}
            {t.key === 'pagos' && pendingPayments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-100 px-1.5 text-xs text-yellow-700">
                {pendingPayments.length}
              </span>
            )}
            {t.key === 'videos' && pendingVideoPayments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 text-xs text-purple-700">
                {pendingVideoPayments.length}
              </span>
            )}
            {t.key === 'avatar' && avatars.reduce((s, a) => s + a.pending_insights, 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 text-xs text-violet-700">
                {avatars.reduce((s, a) => s + a.pending_insights, 0)}
              </span>
            )}
          </button>
        ))}
        <Link
          href="/dashboard/catalogs"
          className="flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-gray-500 hover:text-gray-700"
        >
          📋 Catálogos
        </Link>
      </div>

      {tab === 'letras' && <CreativoView orders={lyricsOrders} />}
      {tab === 'competencia' && (
        <>
          <InvestigadorView initial={competitors} />
          <InvestigatorAgentPanel initialReport={latestInvestigatorReport ?? null} />
        </>
      )}
      {tab === 'financiero' && (
        <>
          <FinancieroView metrics={metrics} />
          <FinancialAgentPanel />
        </>
      )}
      {tab === 'pagos' && <PaymentConfirmationPanel orders={pendingPayments} />}
      {tab === 'videos' && <VideoPaymentConfirmationPanel orders={pendingVideoPayments} />}
      {tab === 'leads' && <LeadsView leads={convertedLeads} promotions={allPromotions} campaignHistory={campaignHistory} />}
      {tab === 'importar' && <LeadsImporter />}
      {tab === 'precios' && (
        <PricingCampaignPanel campaigns={pricingCampaigns} leads={qualifiedLeads} />
      )}
      {tab === 'facebook-ads' && (
        <FacebookAdsPanel initialCampaigns={facebookCampaigns ?? []} />
      )}

      {tab === 'storage' && storageStats && (
        <StorageMonitorPanel
          stats={storageStats}
          configs={storageConfigs ?? []}
          cleanupLog={storageCleanupLog ?? []}
        />
      )}
      {tab === 'storage' && !storageStats && (
        <div className="text-sm text-gray-400 text-center py-8">Cargando datos de storage...</div>
      )}
      {tab === 'agentes' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Los agentes también están integrados en sus tabs correspondientes (Competencia y Financiero). Aquí tienes acceso directo al Agente de Promociones.</p>
          <PromotionsAgentPanel activePromotions={activePromotions ?? []} />
        </div>
      )}
      {tab === 'guardian' && <GuardianPanel />}
      {tab === 'avatar' && (
        <div className="space-y-4">
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
      )}
    </div>
  )
}

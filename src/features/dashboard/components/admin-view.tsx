'use client'

import { useState } from 'react'
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
import type { Competitor, FinancialMetrics, PromotionsCatalog, CampaignWithMetrics, StorageConfig, StorageCleanupLog } from '@/types/database'
import type { InvestigatorReport } from '@/features/agents/investigator/services/run-investigator-agent'
import type { BucketStats } from '@/features/storage-management/services/get-storage-stats'

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
}

const TABS = [
  { key: 'letras', label: '🎵 Letras' },
  { key: 'competencia', label: '🔍 Competencia' },
  { key: 'financiero', label: '📊 Financiero' },
  { key: 'pagos', label: '💳 Pagos' },
  { key: 'videos', label: '🎬 Videos' },
  { key: 'facebook-ads', label: '📣 Facebook Ads' },
  { key: 'storage', label: '💾 Storage' },
  { key: 'agentes', label: '🤖 Agentes' },
] as const

type TabKey = typeof TABS[number]['key']

export function AdminView({ lyricsOrders, competitors, metrics, pendingPayments, pendingVideoPayments, latestInvestigatorReport, activePromotions, facebookCampaigns, storageStats, storageConfigs, storageCleanupLog }: Props) {
  const [tab, setTab] = useState<TabKey>('letras')

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
          </button>
        ))}
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
    </div>
  )
}

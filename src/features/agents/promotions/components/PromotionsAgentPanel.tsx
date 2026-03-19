'use client'

import { useState, useTransition } from 'react'
import { getCampaignPreview, sendRebuyCampaign } from '../services/send-rebuy-campaign'
import type { PromotionsCatalog } from '@/types/database'
import type { RebuyCandidate } from '../services/get-rebuy-candidates'

interface Props {
  activePromotions: PromotionsCatalog[]
}

interface CampaignResult {
  total: number
  sent: number
  failed: number
  promotionName: string
}

export function PromotionsAgentPanel({ activePromotions }: Props) {
  const [selectedPromoId, setSelectedPromoId] = useState(activePromotions[0]?.id ?? '')
  const [candidates, setCandidates] = useState<RebuyCandidate[] | null>(null)
  const [previewPromo, setPreviewPromo] = useState<PromotionsCatalog | null>(null)
  const [result, setResult] = useState<CampaignResult | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'idle' | 'preview' | 'done'>('idle')
  const [isPending, startTransition] = useTransition()

  function handlePreview() {
    setError('')
    setResult(null)
    startTransition(async () => {
      try {
        const res = await getCampaignPreview(selectedPromoId || undefined)
        setCandidates(res.candidates)
        setPreviewPromo(res.promotion)
        setStep('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    })
  }

  function handleSend() {
    if (!selectedPromoId) { setError('Selecciona una promoción'); return }
    if (!confirm(`¿Enviar campaña a ${candidates?.length ?? 0} clientes? Esta acción no se puede deshacer.`)) return
    setError('')
    startTransition(async () => {
      try {
        const res = await sendRebuyCampaign(selectedPromoId)
        setResult(res)
        setStep('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    })
  }

  return (
    <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-purple-900">📣 Agente de Promociones</h3>
          <p className="text-xs text-purple-600 mt-0.5">Campañas de recompra automáticas vía WhatsApp</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Paso 1: Configurar */}
      {step === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-800 mb-2">Promoción a enviar</label>
            {activePromotions.length === 0 ? (
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                No hay promociones activas. Crea una en <strong>Catálogos → Promociones</strong> primero.
              </p>
            ) : (
              <select
                value={selectedPromoId}
                onChange={(e) => setSelectedPromoId(e.target.value)}
                className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {activePromotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.discount_percent ? `(${p.discount_percent}% off)` : p.discount_fixed_mxn ? `($${p.discount_fixed_mxn} off)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={handlePreview}
            disabled={isPending || !selectedPromoId}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {isPending ? '⏳ Calculando...' : '👁 Vista previa de destinatarios'}
          </button>
        </div>
      )}

      {/* Paso 2: Preview */}
      {step === 'preview' && candidates !== null && (
        <div className="space-y-4">
          {previewPromo && (
            <div className="rounded-lg bg-white border border-purple-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-400 mb-1">Promoción seleccionada</p>
              <p className="font-medium text-gray-900">{previewPromo.name}</p>
              {previewPromo.description && <p className="text-sm text-gray-500 mt-0.5">{previewPromo.description}</p>}
              {previewPromo.discount_percent && <p className="text-sm font-medium text-green-700 mt-1">{previewPromo.discount_percent}% de descuento</p>}
              {previewPromo.discount_fixed_mxn && <p className="text-sm font-medium text-green-700 mt-1">${previewPromo.discount_fixed_mxn} de descuento</p>}
            </div>
          )}

          <div className="rounded-lg bg-white border border-purple-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-400 mb-2">
              Destinatarios elegibles ({candidates.length})
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-gray-500">No hay clientes elegibles para recompra en este momento.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {candidates.map((c) => (
                  <div key={c.leadId} className="flex justify-between text-sm border-b border-gray-50 pb-1">
                    <span className="text-gray-700 font-mono">{c.phone}</span>
                    <span className="text-gray-400 text-xs">{c.ordersDelivered} pedido{c.ordersDelivered !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSend}
              disabled={isPending || candidates.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {isPending ? '⏳ Enviando...' : `📤 Enviar a ${candidates.length} clientes`}
            </button>
            <button onClick={() => setStep('idle')} className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-100">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Resultado */}
      {step === 'done' && result && (
        <div className="space-y-3">
          <div className="rounded-lg bg-white border border-purple-200 p-5 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-semibold text-gray-900">Campaña enviada: {result.promotionName}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{result.sent}</p>
                <p className="text-xs text-gray-400">Enviados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                <p className="text-xs text-gray-400">Fallidos</p>
              </div>
            </div>
          </div>
          <button onClick={() => { setStep('idle'); setResult(null) }} className="text-sm text-purple-600 hover:underline">
            ← Nueva campaña
          </button>
        </div>
      )}
    </div>
  )
}

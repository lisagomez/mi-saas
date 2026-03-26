'use client'

import { useState, useTransition } from 'react'
import { sendCampaignToSelected } from '../services/send-campaign-to-selected'
import { checkDuplicateLeads } from '../services/check-duplicate-leads'
import { useLeadsFilters } from '../hooks/useLeadsFilters'
import { LeadsFilters } from './LeadsFilters'
import { CampaignHistoryView } from './CampaignHistoryView'
import type { ConvertedLead } from '../services/get-converted-leads'
import type { PromotionsCatalog } from '@/types/database'
import type { CampaignHistory } from '../types/leads'

interface Props {
  leads: ConvertedLead[]
  promotions: PromotionsCatalog[]
  campaignHistory?: CampaignHistory[]
}

interface Result {
  total: number
  sent: number
  failed: number
  promotionName: string
}

type SubTab = 'leads' | 'historial'

export function LeadsView({ leads, promotions, campaignHistory = [] }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('leads')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [promotionId, setPromotionId] = useState(promotions[0]?.id ?? '')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [showTemplateInput, setShowTemplateInput] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const { filter, setFilter, filtered, uniqueResidences, uniqueOrigins, isFiltered, resetFilters } =
    useLeadsFilters(leads)

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.leadId))

  function toggleAll() {
    if (allFilteredSelected) {
      const next = new Set(selected)
      filtered.forEach((l) => next.delete(l.leadId))
      setSelected(next)
    } else {
      const next = new Set(selected)
      filtered.forEach((l) => next.add(l.leadId))
      setSelected(next)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectFiltered() {
    const next = new Set(selected)
    filtered.forEach((l) => next.add(l.leadId))
    setSelected(next)
  }

  function handleSend() {
    if (selected.size === 0) { setError('Selecciona al menos un cliente'); return }
    if (!promotionId) { setError('Selecciona una promoción'); return }
    setError('')

    startTransition(async () => {
      try {
        const { duplicateCount } = await checkDuplicateLeads(Array.from(selected), promotionId)

        let proceed = true
        if (duplicateCount > 0) {
          proceed = confirm(
            `${duplicateCount} de ${selected.size} leads ya recibieron esta promoción. ¿Continuar de todas formas?`
          )
        } else {
          proceed = confirm(
            `¿Enviar campaña a ${selected.size} cliente${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`
          )
        }

        if (!proceed) return

        const res = await sendCampaignToSelected(
          Array.from(selected),
          promotionId,
          messageTemplate.trim() || undefined
        )
        setResult(res)
        setSelected(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    })
  }

  if (result) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-4xl mb-3">🎉</p>
        <p className="font-semibold text-gray-900 text-lg">Campaña enviada: {result.promotionName}</p>
        <div className="grid grid-cols-3 gap-6 mt-6 max-w-xs mx-auto">
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
        <button
          onClick={() => setResult(null)}
          className="mt-6 text-sm text-purple-600 hover:underline"
        >
          ← Volver a leads
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Leads Convertidos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Clientes que han comprado al menos una canción.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['leads', 'historial'] as SubTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all capitalize ${
                subTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'leads' ? `👥 Leads (${leads.length})` : `📊 Historial (${campaignHistory.length})`}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'historial' && <CampaignHistoryView history={campaignHistory} />}

      {subTab === 'leads' && (
        <>
          <LeadsFilters
            filter={filter}
            onChange={setFilter}
            uniqueResidences={uniqueResidences}
            uniqueOrigins={uniqueOrigins}
            filteredCount={filtered.length}
            totalCount={leads.length}
            onSelectFiltered={selectFiltered}
            onReset={resetFilters}
            isFiltered={isFiltered}
          />

          {/* Barra de acción */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">Promoción a enviar</label>
                {promotions.length === 0 ? (
                  <p className="text-xs text-yellow-700">No hay promociones. Créalas en Catálogos.</p>
                ) : (
                  <select
                    value={promotionId}
                    onChange={(e) => setPromotionId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {promotions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.discount_percent ? ` (${p.discount_percent}% off)` : p.discount_fixed_mxn ? ` ($${p.discount_fixed_mxn} off)` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowTemplateInput((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {showTemplateInput ? 'Ocultar mensaje' : 'Personalizar mensaje'}
                </button>
                {selected.size > 0 && (
                  <span className="text-sm text-gray-500">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
                )}
                <button
                  onClick={handleSend}
                  disabled={isPending || selected.size === 0 || !promotionId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {isPending ? '⏳ Enviando...' : '📤 Enviar campaña'}
                </button>
              </div>
            </div>

            {showTemplateInput && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Mensaje personalizado (opcional)
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={3}
                  placeholder="Ej: ¡Hola! Ya tienes {{pedidos}} canciones con nosotros. Tu último pedido fue el {{fecha_ultimo_pedido}}. ¡Tenemos algo especial para ti!"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables disponibles: <code className="bg-gray-100 px-1 rounded">{'{{pedidos}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{fecha_ultimo_pedido}}'}</code>
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          {/* Tabla */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">👥</p>
                <p>{isFiltered ? 'Sin resultados para los filtros aplicados.' : 'Aún no hay clientes convertidos.'}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Teléfono</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Origen</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Residencia</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Pedidos</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Último pedido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((lead) => (
                    <tr
                      key={lead.leadId}
                      onClick={() => toggle(lead.leadId)}
                      className={`cursor-pointer transition-colors ${selected.has(lead.leadId) ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.leadId)}
                          onChange={() => toggle(lead.leadId)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-800">{lead.phone}</td>
                      <td className="px-4 py-3 text-gray-500">{lead.origin ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{lead.residence ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          ✓ {lead.ordersDelivered}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(lead.lastOrderAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

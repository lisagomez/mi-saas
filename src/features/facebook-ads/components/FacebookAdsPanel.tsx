'use client'

import { useState, useTransition } from 'react'
import { CampaignForm } from './CampaignForm'
import { CampaignSpendForm } from './CampaignSpendForm'
import { deleteCampaign } from '../services/delete-campaign'
import type { CampaignWithMetrics, FacebookCampaign } from '@/types/database'

interface Props {
  initialCampaigns: CampaignWithMetrics[]
}

type View = 'list' | 'new-campaign' | 'edit-campaign' | 'new-spend'

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function RoasBadge({ roas }: { roas: number | null }) {
  if (roas === null) return <span className="text-gray-400 text-xs">Sin datos</span>
  const color = roas >= 2 ? 'text-green-700 bg-green-50' : roas >= 1 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {fmt(roas, 2)}x
    </span>
  )
}

export function FacebookAdsPanel({ initialCampaigns }: Props) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [view, setView] = useState<View>('list')
  const [editingCampaign, setEditingCampaign] = useState<FacebookCampaign | null>(null)
  const [spendCampaignId, setSpendCampaignId] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  function handleDone() {
    setView('list')
    setEditingCampaign(null)
    setSpendCampaignId(undefined)
    // Forzar recarga de datos desde el server refrescando la page
    window.location.reload()
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar la campaña "${name}"? Esta acción borrará también el gasto registrado.`)) return
    startTransition(async () => {
      await deleteCampaign({ id })
      setCampaigns(prev => prev.filter(c => c.id !== id))
    })
  }

  const totalSpend = campaigns.reduce((s, c) => s + c.totalSpendUsd, 0)
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenueUsd, 0)
  const globalRoas = totalSpend > 0 ? totalRevenue / totalSpend : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campañas de Facebook Ads</h3>
          <p className="text-xs text-gray-500 mt-0.5">Gasto manual · Atribución por UTM campaign</p>
        </div>
        {view === 'list' && (
          <div className="flex gap-2">
            <button
              onClick={() => { setSpendCampaignId(undefined); setView('new-spend') }}
              disabled={campaigns.length === 0}
              className="px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-40"
            >
              + Registrar gasto
            </button>
            <button
              onClick={() => setView('new-campaign')}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Nueva campaña
            </button>
          </div>
        )}
      </div>

      {/* Formulario nueva campaña */}
      {view === 'new-campaign' && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h4 className="font-medium text-blue-900 mb-4">Nueva campaña</h4>
          <CampaignForm onDone={handleDone} />
        </div>
      )}

      {/* Formulario editar campaña */}
      {view === 'edit-campaign' && editingCampaign && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h4 className="font-medium text-blue-900 mb-4">Editar campaña</h4>
          <CampaignForm campaign={editingCampaign} onDone={handleDone} />
        </div>
      )}

      {/* Formulario registrar gasto */}
      {view === 'new-spend' && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <h4 className="font-medium text-green-900 mb-4">Registrar gasto</h4>
          <CampaignSpendForm
            campaigns={campaigns}
            defaultCampaignId={spendCampaignId}
            onDone={handleDone}
          />
        </div>
      )}

      {/* Resumen global */}
      {view === 'list' && campaigns.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Gasto total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">${fmt(totalSpend)} USD</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ingresos atribuidos</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">${fmt(totalRevenue)} USD</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">ROAS global</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {globalRoas !== null ? `${fmt(globalRoas)}x` : 'Sin datos'}
            </p>
          </div>
        </div>
      )}

      {/* Tabla de campañas */}
      {view === 'list' && (
        <>
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-400 text-sm">No hay campañas creadas.</p>
              <button
                onClick={() => setView('new-campaign')}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Crea tu primera campaña →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Campaña</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">Gasto USD</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">Leads</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">Calificados</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">Pedidos</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-right">Ingresos USD</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 text-center">ROAS</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400 font-mono">fb_{c.source_key}</p>
                          {!c.is_active && (
                            <span className="text-xs text-gray-400 bg-gray-100 rounded px-1">inactiva</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">${fmt(c.totalSpendUsd)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.leadsTotal}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.leadsQualified}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.ordersDelivered}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">${fmt(c.revenueUsd)}</td>
                      <td className="px-4 py-3 text-center"><RoasBadge roas={c.roas} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setSpendCampaignId(c.id); setView('new-spend') }}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                          >
                            + Gasto
                          </button>
                          <button
                            onClick={() => { setEditingCampaign(c); setView('edit-campaign') }}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={isPending}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400">
            💡 Atribución: cuando un lead llega por un anuncio Click-to-WhatsApp con <code>utm_campaign=clave</code>, se guarda con <code>source=&apos;fb_clave&apos;</code> automáticamente.
          </p>
        </>
      )}
    </div>
  )
}

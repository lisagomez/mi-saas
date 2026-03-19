'use client'

import { useState, useTransition } from 'react'
import { runFinancialAgent } from '../services/run-financial-agent'
import type { EnrichedFinancialMetrics } from '@/types/database'

interface Props {
  initialMetrics?: EnrichedFinancialMetrics | null
}

function fmt(n: number | null, prefix = '$', suffix = '') {
  if (n === null) return 'Sin datos'
  return `${prefix}${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}${suffix}`
}

function MetricCard({ label, value, sub, warning }: { label: string; value: string; sub?: string; warning?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warning ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${warning ? 'text-yellow-700 text-sm' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function FinancialAgentPanel({ initialMetrics }: Props) {
  const [metrics, setMetrics] = useState<EnrichedFinancialMetrics | null>(initialMetrics ?? null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleRun() {
    setError('')
    startTransition(async () => {
      const res = await runFinancialAgent()
      if (!res.success) setError(res.error ?? 'Error desconocido')
      else if (res.metrics) setMetrics(res.metrics)
    })
  }

  return (
    <div className="mt-6 rounded-xl border border-green-100 bg-green-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-green-900">📊 Agente Financiero-Contable</h3>
          <p className="text-xs text-green-600 mt-0.5">Métricas reales con fórmulas del Dominio de Negocio</p>
        </div>
        <button
          onClick={handleRun}
          disabled={isPending}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? '⏳ Calculando...' : '▶ Recalcular métricas'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {metrics ? (
        <div className="space-y-4">
          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Ingresos totales" value={fmt(metrics.totalRevenueMxn, '$', ' MXN')} sub={`${metrics.ordersDelivered} pedidos entregados`} />
            <MetricCard label="Gastos totales" value={fmt(metrics.totalExpensesMxn, '$', ' MXN')} sub="Marketing + IA + Operación" />
            <MetricCard
              label="ROI"
              value={metrics.roi !== null ? `${metrics.roi.toFixed(1)}%` : 'Sin datos'}
              sub="(Ingr. - Gastos) / Gastos"
              warning={metrics.roi === null}
            />
            <MetricCard
              label="ROAS"
              value="Sin datos"
              sub="Requiere Facebook Ads"
              warning
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="CAC"
              value={metrics.cac !== null ? fmt(metrics.cac, '$', ' MXN') : 'Sin datos'}
              sub="Gasto marketing / leads calificados"
              warning={metrics.cac === null}
            />
            <MetricCard
              label="LTV"
              value={metrics.ltv !== null ? fmt(metrics.ltv, '$', ' MXN') : 'Sin datos'}
              sub="Ticket promedio por cliente"
              warning={metrics.ltv === null}
            />
            <MetricCard
              label="Punto de equilibrio"
              value={metrics.puntoEquilibrio !== null ? `${metrics.puntoEquilibrio} pedidos/mes` : 'Sin datos'}
              sub="Para cubrir costos fijos"
              warning={metrics.puntoEquilibrio === null}
            />
            <MetricCard
              label="Flujo de caja"
              value={metrics.flujoCaja !== null ? fmt(metrics.flujoCaja, '$', ' MXN') : 'Sin datos'}
              sub="Ingresos - Gastos período"
              warning={metrics.flujoCaja === null}
            />
          </div>

          {/* Costo IA */}
          <div className="rounded-lg bg-white border border-green-200 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Costo IA este mes</span>
              <span className="font-medium text-gray-900">${metrics.totalAiCostUsd.toFixed(4)} USD</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Leads totales / calificados</span>
              <span className="font-medium text-gray-900">{metrics.leadsTotal} / {metrics.leadsQualified}</span>
            </div>
          </div>

          {/* Métricas sin datos */}
          {metrics.insufficientData.length > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-xs font-semibold text-yellow-700 mb-2">⚠️ Métricas con datos insuficientes:</p>
              <ul className="text-xs text-yellow-600 space-y-0.5">
                {metrics.insufficientData.map((msg, i) => <li key={i}>• {msg}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-green-600 text-center py-4">
          Presiona "Recalcular métricas" para obtener el análisis financiero completo con datos reales de BD.
        </p>
      )}
    </div>
  )
}

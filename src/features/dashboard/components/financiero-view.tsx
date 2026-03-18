'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { FinancialMetrics } from '@/types/database'

// SSR:false para evitar errores de hidratación con Recharts
const CashFlowChart = dynamic(
  () => import('./cash-flow-chart').then(m => m.CashFlowChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-gray-100" /> }
)

const AI_BUDGET_KEY = 'canciobot_ai_budget_usd'

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function fmt(n: number | null, prefix = '$', suffix = '') {
  if (n === null) return 'Sin datos'
  return `${prefix}${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}${suffix}`
}

export function FinancieroView({ metrics }: { metrics: FinancialMetrics }) {
  const [budget, setBudget] = useState<number>(() => {
    if (typeof window === 'undefined') return 50
    return Number(localStorage.getItem(AI_BUDGET_KEY) ?? 50)
  })
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(budget))

  function saveBudget() {
    const val = parseFloat(budgetInput)
    if (!isNaN(val) && val > 0) {
      setBudget(val)
      localStorage.setItem(AI_BUDGET_KEY, String(val))
    }
    setEditingBudget(false)
  }

  const aiPct = Math.min(100, (metrics.aiSpendUsd / budget) * 100)
  const aiPctColor = aiPct > 90 ? 'bg-red-500' : aiPct > 70 ? 'bg-yellow-500' : 'bg-indigo-500'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Panel Financiero</h2>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Ingresos totales"
          value={fmt(metrics.totalRevenueMxn, '$', ' MXN')}
          sub={`${metrics.ordersDelivered} pedido${metrics.ordersDelivered !== 1 ? 's' : ''} entregado${metrics.ordersDelivered !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="ROI"
          value={metrics.roi !== null ? `${metrics.roi.toFixed(1)}%` : 'Sin datos'}
          sub="(Ingr. - Costos) / Costos"
        />
        <MetricCard
          label="CAC"
          value={fmt(metrics.cac, '$', ' MXN')}
          sub="Costo de adquisición"
        />
        <MetricCard
          label="LTV"
          value={fmt(metrics.ltv, '$', ' MXN')}
          sub="Valor por cliente"
        />
      </div>

      {/* Flujo de caja */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-gray-700">Flujo de Caja Mensual (MXN)</p>
        <CashFlowChart data={metrics.monthlyCashFlow} />
      </div>

      {/* Presupuesto IA */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Presupuesto IA</p>
          {editingBudget ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Límite USD:</span>
              <input
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="w-20 rounded border border-gray-300 px-2 py-0.5 text-sm"
              />
              <button onClick={saveBudget} className="text-sm text-indigo-600 hover:underline">Guardar</button>
            </div>
          ) : (
            <button onClick={() => setEditingBudget(true)} className="text-xs text-gray-400 hover:underline">
              Límite: ${budget} USD — editar
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>${metrics.aiSpendUsd.toFixed(4)} USD usado</span>
            <span>{aiPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-3 rounded-full transition-all ${aiPctColor}`}
              style={{ width: `${aiPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Costo total IA: ${metrics.totalAiCostUsd.toFixed(4)} USD
          </p>
        </div>
      </div>
    </div>
  )
}

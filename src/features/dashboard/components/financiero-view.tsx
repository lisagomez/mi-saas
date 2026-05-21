'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { FinancialMetrics } from '@/types/database'
import { TiCard, TiMetricCard, TiButton } from '@/shared/components/ti'

// SSR:false para evitar errores de hidratación con Recharts
const CashFlowChart = dynamic(
  () => import('./cash-flow-chart').then(m => m.CashFlowChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-[#23262F]" /> }
)

const AI_BUDGET_KEY = 'canciobot_ai_budget_usd'

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
  const aiPctColor = aiPct > 90 ? 'bg-red-500' : aiPct > 70 ? 'bg-[#FB923C]' : 'bg-[#4A7FBD]'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#F0F2F7]">Panel Financiero</h2>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TiMetricCard
          label="Ingresos totales"
          value={fmt(metrics.totalRevenueUsd, '$', ' USD')}
          sub={`${metrics.ordersDelivered} pedido${metrics.ordersDelivered !== 1 ? 's' : ''} entregado${metrics.ordersDelivered !== 1 ? 's' : ''}`}
          accent="cyan"
        />
        <TiMetricCard
          label="ROI"
          value={metrics.roi !== null ? `${metrics.roi.toFixed(1)}%` : 'Sin datos'}
          sub="(Ingr. - Costos) / Costos"
          accent="green"
        />
        <TiMetricCard
          label="CAC"
          value={fmt(metrics.cac, '$', ' USD')}
          sub="Costo de adquisición"
          accent="orange"
        />
        <TiMetricCard
          label="LTV"
          value={fmt(metrics.ltv, '$', ' USD')}
          sub="Valor por cliente"
          accent="violet"
        />
      </div>

      {/* Flujo de caja */}
      <TiCard className="p-5">
        <p className="mb-3 text-sm font-semibold text-[#F0F2F7]">Flujo de Caja Mensual (USD)</p>
        <CashFlowChart data={metrics.monthlyCashFlow} />
      </TiCard>

      {/* Presupuesto IA */}
      <TiCard className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#F0F2F7]">Presupuesto IA</p>
          {editingBudget ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8C93A8]">Límite USD:</span>
              <input
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="w-20 rounded border border-[#3A3F4E] bg-[#171920] px-2 py-0.5 text-sm text-[#F0F2F7] focus:outline-none focus:border-[#4A7FBD]"
              />
              <TiButton size="sm" onClick={saveBudget}>Guardar</TiButton>
            </div>
          ) : (
            <button onClick={() => setEditingBudget(true)} className="text-xs text-[#555B6E] hover:text-[#8C93A8] transition-colors">
              Límite: ${budget} USD — editar
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-[#8C93A8]">
            <span>${metrics.aiSpendUsd.toFixed(4)} USD usado</span>
            <span>{aiPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#171920] shadow-ti-inset">
            <div
              className={`h-3 rounded-full transition-all ${aiPctColor}`}
              style={{ width: `${aiPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#555B6E]">
            Costo total IA: ${metrics.totalAiCostUsd.toFixed(4)} USD
          </p>
        </div>
      </TiCard>
    </div>
  )
}

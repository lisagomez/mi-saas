'use client'

import { useState, useTransition } from 'react'
import { upsertBudget, createExpense, deleteExpense } from '@/actions/catalogs/budget'
import type { Budget, Expense, BudgetCategory } from '@/types/database'

interface Props {
  budgets: Budget[]
  expenses: Expense[]
  monthlyAiSpend: number
}

const BUDGET_CATEGORIES: { value: BudgetCategory; label: string; currency: 'usd' | 'mxn' }[] = [
  { value: 'ai_tokens', label: '🤖 Tokens IA', currency: 'usd' },
  { value: 'marketing', label: '📢 Marketing', currency: 'mxn' },
  { value: 'suscripciones', label: '📦 Suscripciones', currency: 'mxn' },
  { value: 'operacion', label: '⚙️ Operación', currency: 'mxn' },
]

function getPeriodMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

export function BudgetPanel({ budgets, expenses, monthlyAiSpend }: Props) {
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [limitValue, setLimitValue] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ category: 'marketing' as 'marketing' | 'suscripciones' | 'operacion', description: '', amount_mxn: '', expense_date: new Date().toISOString().split('T')[0] })
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const currentMonth = getPeriodMonth()
  const currentBudgets = budgets.filter((b) => b.period_month === currentMonth || b.period_month.startsWith(currentMonth.slice(0, 7)))

  function getBudget(category: BudgetCategory) {
    return currentBudgets.find((b) => b.category === category)
  }

  function startEdit(category: BudgetCategory) {
    const b = getBudget(category)
    const cat = BUDGET_CATEGORIES.find((c) => c.value === category)!
    setLimitValue(cat.currency === 'usd' ? String(b?.limit_usd ?? '') : String(b?.limit_mxn ?? ''))
    setEditingCategory(category)
    setError('')
  }

  function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCategory) return
    const cat = BUDGET_CATEGORIES.find((c) => c.value === editingCategory)!
    const val = limitValue !== '' ? Number(limitValue) : null

    startTransition(async () => {
      const res = await upsertBudget({
        category: editingCategory,
        period_month: currentMonth,
        limit_usd: cat.currency === 'usd' ? val : null,
        limit_mxn: cat.currency === 'mxn' ? val : null,
      })
      if (res.error) setError(res.error)
      else setEditingCategory(null)
    })
  }

  function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await createExpense({
        category: expenseForm.category,
        description: expenseForm.description,
        amount_mxn: Number(expenseForm.amount_mxn),
        expense_date: expenseForm.expense_date,
      })
      if (res.error) setError(res.error)
      else { setShowExpenseForm(false); setExpenseForm({ category: 'marketing', description: '', amount_mxn: '', expense_date: new Date().toISOString().split('T')[0] }) }
    })
  }

  const aiLimit = getBudget('ai_tokens')?.limit_usd ?? null
  const aiPercent = aiLimit ? Math.min(100, (monthlyAiSpend / aiLimit) * 100) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💰 Presupuesto</h1>
        <p className="text-gray-500 text-sm mt-1">Mes actual: {formatMonth(currentMonth)}</p>
      </div>

      {/* Tarjetas de presupuesto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {BUDGET_CATEGORIES.map((cat) => {
          const b = getBudget(cat.value)
          const limit = cat.currency === 'usd' ? b?.limit_usd : b?.limit_mxn
          const spent = cat.value === 'ai_tokens' ? monthlyAiSpend : null
          const percent = limit && spent !== null ? Math.min(100, (spent / limit) * 100) : null

          return (
            <div key={cat.value} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{cat.label}</h3>
                <button onClick={() => startEdit(cat.value)} className="text-xs text-blue-600 hover:underline">
                  {limit !== null && limit !== undefined ? 'Editar' : 'Configurar'}
                </button>
              </div>

              {editingCategory === cat.value ? (
                <form onSubmit={handleBudgetSave} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Límite ({cat.currency.toUpperCase()})</label>
                    <input
                      type="number"
                      min={0}
                      step={cat.currency === 'usd' ? 0.01 : 1}
                      value={limitValue}
                      onChange={(e) => setLimitValue(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      placeholder={cat.currency === 'usd' ? '50.00' : '5000'}
                    />
                  </div>
                  <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                    {isPending ? '...' : 'OK'}
                  </button>
                  <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                    ✕
                  </button>
                </form>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {limit !== null && limit !== undefined ? `${cat.currency === 'usd' ? '$' : '$'}${limit} ${cat.currency.toUpperCase()}` : <span className="text-gray-300 text-base">Sin límite</span>}
                  </div>
                  {cat.value === 'ai_tokens' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Gastado este mes</span>
                        <span>${monthlyAiSpend.toFixed(4)} USD {aiPercent !== null ? `(${aiPercent.toFixed(1)}%)` : ''}</span>
                      </div>
                      {aiLimit && (
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${aiPercent! >= 90 ? 'bg-red-500' : aiPercent! >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                            style={{ width: `${aiPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Gastos operativos */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Gastos registrados</h2>
        <button onClick={() => setShowExpenseForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          + Registrar gasto
        </button>
      </div>

      {showExpenseForm && (
        <form onSubmit={handleExpenseSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h3 className="font-semibold text-gray-800 mb-4">Nuevo gasto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as 'marketing' | 'suscripciones' | 'operacion' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="marketing">Marketing</option>
                <option value="suscripciones">Suscripciones</option>
                <option value="operacion">Operación</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (MXN)</label>
              <input
                required
                type="number"
                min={0}
                step={0.01}
                value={expenseForm.amount_mxn}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount_mxn: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="500.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Mensualidad OpenRouter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                required
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowExpenseForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {expenses.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No hay gastos registrados este mes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{exp.expense_date}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{exp.category}</td>
                  <td className="px-4 py-3 text-gray-900">{exp.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">${exp.amount_mxn} MXN</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { if (confirm('¿Eliminar?')) startTransition(async () => { await deleteExpense(exp.id) }) }} disabled={isPending} className="text-red-500 hover:underline text-xs">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

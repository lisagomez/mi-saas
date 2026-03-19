'use client'

import { useState, useTransition } from 'react'
import { createDomainEntry, updateDomainEntry, deleteDomainEntry } from '@/actions/catalogs/business-domain'
import type { BusinessDomain, DomainCategory } from '@/types/database'

interface Props {
  entries: BusinessDomain[]
}

const EMPTY_FORM = {
  name: '',
  formula: '',
  description: '',
  category: 'rentabilidad' as DomainCategory,
  is_active: true,
}

const CATEGORIES: { value: DomainCategory; label: string }[] = [
  { value: 'rentabilidad', label: '📈 Rentabilidad' },
  { value: 'experiencia', label: '⭐ Experiencia' },
  { value: 'operacion', label: '⚙️ Operación' },
]

export function BusinessDomainPanel({ entries }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BusinessDomain | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  function openEdit(e: BusinessDomain) {
    setEditing(e)
    setForm({
      name: e.name,
      formula: e.formula,
      description: e.description ?? '',
      category: e.category,
      is_active: e.is_active,
    })
    setShowForm(true)
    setError('')
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const payload = {
      name: form.name,
      formula: form.formula,
      description: form.description || undefined,
      category: form.category,
      is_active: form.is_active,
    }

    startTransition(async () => {
      const res = editing
        ? await updateDomainEntry(editing.id, payload)
        : await createDomainEntry(payload)

      if (res.error) setError(res.error)
      else setShowForm(false)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta fórmula?')) return
    startTransition(async () => { await deleteDomainEntry(id) })
  }

  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    items: entries.filter((e) => e.category === cat.value),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Dominio de Negocio</h1>
          <p className="text-gray-500 text-sm mt-1">Fórmulas y benchmarks usados por el Agente Financiero.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          + Nueva fórmula
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Editar fórmula' : 'Nueva fórmula'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="ROI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as DomainCategory })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fórmula</label>
              <input
                required
                value={form.formula}
                onChange={(e) => setForm({ ...form, formula: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="(Ganancia neta / Inversión total) × 100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Contexto adicional para el agente"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_domain"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active_domain" className="text-sm text-gray-700">Activa</label>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {byCategory.map((cat) => (
          <div key={cat.value} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">{cat.label}</h3>
            </div>
            {cat.items.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">Sin fórmulas en esta categoría.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Fórmula</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cat.items.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{entry.name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{entry.formula}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {entry.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(entry)} className="text-blue-600 hover:underline text-xs mr-3">Editar</button>
                        <button onClick={() => handleDelete(entry.id)} disabled={isPending} className="text-red-500 hover:underline text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

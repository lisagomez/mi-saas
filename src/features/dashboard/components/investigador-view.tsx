'use client'

import { useState } from 'react'
import type { Competitor } from '@/types/database'
import { upsertCompetitor } from '../services/upsert-competitor'
import { deleteCompetitor } from '../services/delete-competitor'

const EMPTY_FORM = { name: '', price: '', proposal: '', advantages: '', disadvantages: '' }

export function InvestigadorView({ initial }: { initial: Competitor[] }) {
  const [rows, setRows] = useState<Competitor[]>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)

  function startEdit(c: Competitor) {
    setEditing(c.id)
    setForm({
      name: c.name,
      price: c.price ?? '',
      proposal: c.proposal ?? '',
      advantages: c.advantages ?? '',
      disadvantages: c.disadvantages ?? '',
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const result = await upsertCompetitor({ id, ...form })
    if (result.success) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...form, updated_at: new Date().toISOString() } : r))
      setEditing(null)
    }
    setSaving(false)
  }

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    const result = await upsertCompetitor({ ...form })
    if (result.success && result.id) {
      setRows(prev => [...prev, {
        id: result.id!,
        ...form,
        price: form.price || null,
        proposal: form.proposal || null,
        advantages: form.advantages || null,
        disadvantages: form.disadvantages || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      setForm(EMPTY_FORM)
      setAdding(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteCompetitor({ id })
    if (result.success) setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Tabla de Competencia</h2>
        <button
          onClick={() => { setAdding(true); setForm(EMPTY_FORM) }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          + Agregar competidor
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Competidor', 'Precio', 'Propuesta', 'Ventajas', 'Desventajas', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !adding && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Sin competidores registrados. Agrega el primero.
                </td>
              </tr>
            )}

            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {editing === row.id ? (
                  <>
                    {(['name', 'price', 'proposal', 'advantages', 'disadvantages'] as const).map(field => (
                      <td key={field} className="px-3 py-2">
                        <input
                          value={form[field]}
                          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                          className="w-full rounded border border-indigo-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2">
                      <button onClick={() => saveEdit(row.id)} disabled={saving} className="mr-2 text-indigo-600 hover:underline disabled:opacity-50">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditing(null)} className="text-gray-400 hover:underline">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.price ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-gray-600">{row.proposal ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-green-700">{row.advantages ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-red-600">{row.disadvantages ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button onClick={() => startEdit(row)} className="mr-3 text-indigo-600 hover:underline">Editar</button>
                      <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:underline">Eliminar</button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {adding && (
              <tr className="bg-indigo-50">
                {(['name', 'price', 'proposal', 'advantages', 'disadvantages'] as const).map(field => (
                  <td key={field} className="px-3 py-2">
                    <input
                      placeholder={field === 'name' ? 'Nombre *' : field}
                      value={form[field]}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full rounded border border-indigo-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2">
                  <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="mr-2 text-indigo-600 hover:underline disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setAdding(false)} className="text-gray-400 hover:underline">Cancelar</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

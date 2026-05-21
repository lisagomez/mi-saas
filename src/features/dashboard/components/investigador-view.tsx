'use client'

import { useState } from 'react'
import type { Competitor } from '@/types/database'
import { upsertCompetitor } from '../services/upsert-competitor'
import { deleteCompetitor } from '../services/delete-competitor'
import { TiCard, TiButton } from '@/shared/components/ti'

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

  const inputClass = 'w-full rounded border border-[#3A3F4E] bg-[#171920] px-2 py-1 text-sm text-[#F0F2F7] focus:outline-none focus:border-[#4A7FBD]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#F0F2F7]">Tabla de Competencia</h2>
        <TiButton onClick={() => { setAdding(true); setForm(EMPTY_FORM) }}>
          + Agregar competidor
        </TiButton>
      </div>

      <TiCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#3A3F4E] text-sm">
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1F2229 0%, #1C1E24 100%)' }}>
              {['Competidor', 'Precio', 'Propuesta', 'Ventajas', 'Desventajas', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#8C93A8]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3A3F4E]">
            {rows.length === 0 && !adding && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#555B6E]">
                  Sin competidores registrados. Agrega el primero.
                </td>
              </tr>
            )}

            {rows.map(row => (
              <tr key={row.id} className="hover:bg-[#2C303C]/40 transition-colors">
                {editing === row.id ? (
                  <>
                    {(['name', 'price', 'proposal', 'advantages', 'disadvantages'] as const).map(field => (
                      <td key={field} className="px-3 py-2">
                        <input
                          value={form[field]}
                          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                          className={inputClass}
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2">
                      <button onClick={() => saveEdit(row.id)} disabled={saving} className="mr-2 text-[#4A7FBD] hover:text-[#22D3EE] transition-colors disabled:opacity-50 text-xs font-medium">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditing(null)} className="text-[#555B6E] hover:text-[#8C93A8] transition-colors text-xs">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-[#F0F2F7]">{row.name}</td>
                    <td className="px-4 py-3 text-[#8C93A8]">{row.price ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-[#8C93A8]">{row.proposal ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-[#4ADE80]">{row.advantages ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-[#FB923C]">{row.disadvantages ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button onClick={() => startEdit(row)} className="mr-3 text-[#4A7FBD] hover:text-[#22D3EE] transition-colors text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(row.id)} className="text-[#FB923C]/70 hover:text-[#FB923C] transition-colors text-xs">Eliminar</button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {adding && (
              <tr className="bg-[#4A7FBD]/5">
                {(['name', 'price', 'proposal', 'advantages', 'disadvantages'] as const).map(field => (
                  <td key={field} className="px-3 py-2">
                    <input
                      placeholder={field === 'name' ? 'Nombre *' : field}
                      value={form[field]}
                      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                      className={inputClass}
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2">
                  <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="mr-2 text-[#4A7FBD] hover:text-[#22D3EE] transition-colors disabled:opacity-50 text-xs font-medium">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setAdding(false)} className="text-[#555B6E] hover:text-[#8C93A8] transition-colors text-xs">Cancelar</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TiCard>
    </div>
  )
}

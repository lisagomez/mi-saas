'use client'

import { useState, useTransition } from 'react'
import { createPreference, updatePreference, deletePreference } from '@/actions/catalogs/preferences'
import type { PreferencesCatalog } from '@/types/database'

interface Props {
  preferences: PreferencesCatalog[]
}

const EMPTY_FORM = {
  regions: '',
  styles: '',
  directives: '',
  sort_order: 100,
  is_active: true,
}

export function PreferencesPanel({ preferences }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PreferencesCatalog | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  function openEdit(p: PreferencesCatalog) {
    setEditing(p)
    setForm({
      regions: p.regions.join(', '),
      styles: p.styles.join(', '),
      directives: p.directives,
      sort_order: p.sort_order,
      is_active: p.is_active,
    })
    setShowForm(true)
    setError('')
  }

  function parseArray(val: string): string[] {
    return val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      regions: parseArray(form.regions),
      styles: parseArray(form.styles),
      directives: form.directives,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    }

    startTransition(async () => {
      const res = editing
        ? await updatePreference(editing.id, payload)
        : await createPreference(payload)

      if (res.error) {
        setError(res.error)
      } else {
        setShowForm(false)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta preferencia?')) return
    startTransition(async () => {
      await deletePreference(id)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎵 Preferencias Musicales</h1>
          <p className="text-gray-500 text-sm mt-1">Estilos por región usados para generar las directivas musicales.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nueva preferencia
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Editar preferencia' : 'Nueva preferencia'}</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regiones <span className="text-gray-400">(separadas por coma)</span></label>
              <input
                value={form.regions}
                onChange={(e) => setForm({ ...form, regions: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="sinaloa, culiacán, mazatlán"
              />
              <p className="text-xs text-gray-400 mt-1">Deja vacío para aplicar a todas las regiones</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estilos <span className="text-gray-400">(separados por coma)</span></label>
              <input
                required
                value={form.styles}
                onChange={(e) => setForm({ ...form, styles: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="banda, grupero, sinaloense"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Directivas para Suno/Freebeat</label>
              <textarea
                required
                value={form.directives}
                onChange={(e) => setForm({ ...form, directives: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder="banda sinaloense, tuba prominente, clarinete, tambora, tempo 130-145 BPM"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden (menor = mayor prioridad)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded"
                  />
                  Activa
                </label>
              </div>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {preferences.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎵</p>
            <p>No hay preferencias configuradas.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Orden</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estilos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Regiones</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Directivas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preferences.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-center">{p.sort_order}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.styles.join(', ')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.regions.length > 0 ? p.regions.slice(0, 3).join(', ') + (p.regions.length > 3 ? '...' : '') : 'Todas'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{p.directives}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs mr-3">Editar</button>
                    <button onClick={() => handleDelete(p.id)} disabled={isPending} className="text-red-500 hover:underline text-xs">Eliminar</button>
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

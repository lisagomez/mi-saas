'use client'

import { useState, useTransition } from 'react'
import { createPromotion, updatePromotion, deletePromotion } from '@/actions/catalogs/promotions'
import type { PromotionsCatalog } from '@/types/database'

interface Props {
  promotions: PromotionsCatalog[]
}

const EMPTY_FORM = {
  name: '',
  occasion: '',
  description: '',
  discount_percent: '' as string | number,
  discount_fixed_mxn: '' as string | number,
  valid_from: '',
  valid_to: '',
  is_active: true,
  whatsapp_template_name: '',
}

const OCCASIONS = [
  { value: 'cumpleanos', label: 'Cumpleaños' },
  { value: 'cumpleanos_madre', label: 'Cumpleaños de mamá' },
  { value: 'cumpleanos_padre', label: 'Cumpleaños de papá' },
  { value: 'boda', label: 'Boda' },
  { value: 'aniversario', label: 'Aniversario' },
  { value: 'dia_madres', label: 'Día de las Madres' },
  { value: 'dia_padres', label: 'Día del Padre' },
  { value: 'quinceanera', label: 'Quinceañera' },
  { value: 'graduacion', label: 'Graduación' },
  { value: 'navidad', label: 'Navidad' },
  { value: 'otro', label: 'Otro' },
]

export function PromotionsPanel({ promotions }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PromotionsCatalog | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  function openEdit(p: PromotionsCatalog) {
    setEditing(p)
    setForm({
      name: p.name,
      occasion: p.occasion,
      description: p.description ?? '',
      discount_percent: p.discount_percent ?? '',
      discount_fixed_mxn: p.discount_fixed_mxn ?? '',
      valid_from: p.valid_from,
      valid_to: p.valid_to,
      is_active: p.is_active,
      whatsapp_template_name: p.whatsapp_template_name ?? '',
    })
    setShowForm(true)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name,
      occasion: form.occasion,
      description: form.description || undefined,
      discount_percent: form.discount_percent !== '' ? Number(form.discount_percent) : null,
      discount_fixed_mxn: form.discount_fixed_mxn !== '' ? Number(form.discount_fixed_mxn) : null,
      valid_from: form.valid_from,
      valid_to: form.valid_to,
      is_active: form.is_active,
      whatsapp_template_name: form.whatsapp_template_name.trim() || null,
    }

    startTransition(async () => {
      const res = editing
        ? await updatePromotion(editing.id, payload)
        : await createPromotion(payload)

      if (res.error) {
        setError(res.error)
      } else {
        setShowForm(false)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta promoción?')) return
    startTransition(async () => {
      await deletePromotion(id)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎉 Promociones</h1>
          <p className="text-gray-500 text-sm mt-1">El bot las menciona automáticamente post-calificación.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          + Nueva promoción
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Editar promoción' : 'Nueva promoción'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Día de las Madres 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ocasión</label>
              <select
                required
                value={form.occasion}
                onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecciona...</option>
                {OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (texto para el bot)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Celebra a mamá con una canción única..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento % (opcional)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento fijo MXN (opcional)</label>
              <input
                type="number"
                min={0}
                value={form.discount_fixed_mxn}
                onChange={(e) => setForm({ ...form, discount_fixed_mxn: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Válida desde</label>
              <input
                required
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Válida hasta</label>
              <input
                required
                type="date"
                value={form.valid_to}
                onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_promo"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active_promo" className="text-sm text-gray-700">Activa</label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template de WhatsApp (Meta) <span className="text-gray-400 font-normal">— opcional</span>
              </label>
              <input
                value={form.whatsapp_template_name}
                onChange={(e) => setForm({ ...form, whatsapp_template_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="ej: canciobot_promo_verano"
              />
              <p className="text-xs text-gray-400 mt-1">
                Nombre exacto del template aprobado en Meta. Si se configura, la campaña usa este template en lugar de texto libre (necesario para clientes fuera de la ventana de 24h).
              </p>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {promotions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎉</p>
            <p>No hay promociones. Crea la primera.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ocasión</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vigencia</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descuento</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template Meta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promotions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.occasion}</td>
                  <td className="px-4 py-3 text-gray-600">{p.valid_from} → {p.valid_to}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.discount_percent ? `${p.discount_percent}%` : p.discount_fixed_mxn ? `$${p.discount_fixed_mxn} USD` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.whatsapp_template_name
                      ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.whatsapp_template_name}</span>
                      : <span className="text-gray-400 text-xs">—</span>
                    }
                  </td>
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

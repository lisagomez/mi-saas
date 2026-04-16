'use client'

import { useState } from 'react'
import { createPricingCampaign } from '../services/create-pricing-campaign'
import { togglePricingCampaign } from '../services/toggle-pricing-campaign'

interface Lead {
  id: string
  phone: string
  created_at: string
}

interface Campaign {
  id: string
  campaign_number: number
  campaign_name: string
  price_label: string
  valid_from: string
  valid_until: string | null
  assignment: 'all' | 'new_leads' | 'specific'
  lead_ids: string[]
  is_active: boolean
}

interface Props {
  campaigns: Campaign[]
  leads: Lead[]
}

const ASSIGNMENT_LABELS: Record<string, string> = {
  all: 'Todos los leads',
  new_leads: 'Leads nuevos (desde fecha de inicio)',
  specific: 'Leads específicos',
}

export function PricingCampaignPanel({ campaigns: initialCampaigns, leads }: Props) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadSearch, setLeadSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  const now = new Date().toISOString().slice(0, 16)

  const [form, setForm] = useState({
    campaignNumber: '',
    campaignName: '',
    priceLabel: '',
    validFrom: now,
    validUntil: '',
    assignment: 'all' as 'all' | 'new_leads' | 'specific',
    leadIds: [] as string[],
  })

  function toggleLeadId(id: string) {
    setForm(f => ({
      ...f,
      leadIds: f.leadIds.includes(id)
        ? f.leadIds.filter(l => l !== id)
        : [...f.leadIds, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await createPricingCampaign({
      campaignNumber: parseInt(form.campaignNumber),
      campaignName: form.campaignName,
      priceLabel: form.priceLabel,
      validFrom: new Date(form.validFrom).toISOString(),
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
      assignment: form.assignment,
      leadIds: form.assignment === 'specific' ? form.leadIds : [],
    })

    if (result.success) {
      // Refrescar recargando la página para mostrar la nueva campaña
      window.location.reload()
    } else {
      setError(result.error ?? 'Error al crear la campaña')
    }
    setSubmitting(false)
  }

  async function handleToggle(campaignId: string, currentActive: boolean) {
    setToggling(campaignId)
    const result = await togglePricingCampaign({ campaignId, isActive: !currentActive })
    if (result.success) {
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, is_active: !currentActive } : c)
      )
    }
    setToggling(null)
  }

  const filteredLeads = leads.filter(l =>
    l.phone.toLowerCase().includes(leadSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Campañas de Precio</h2>
        <button
          onClick={() => setShowForm(f => !f)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva campaña'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Nueva campaña de precio</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° de campaña</label>
              <input
                type="number"
                required
                min={1}
                value={form.campaignNumber}
                onChange={e => setForm(f => ({ ...f, campaignNumber: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de campaña</label>
              <input
                type="text"
                required
                placeholder="Ej: Promo Día de las Madres"
                value={form.campaignName}
                onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio</label>
            <input
              type="text"
              required
              placeholder="Ej: $35 USD  /  300 MXN  /  $29.99 USD"
              value={form.priceLabel}
              onChange={e => setForm(f => ({ ...f, priceLabel: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Inicio de vigencia</label>
              <input
                type="datetime-local"
                required
                value={form.validFrom}
                onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fin de vigencia <span className="text-gray-400">(opcional)</span></label>
              <input
                type="datetime-local"
                value={form.validUntil}
                onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Asignación</label>
            <div className="flex flex-col gap-2">
              {(['all', 'new_leads', 'specific'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assignment"
                    value={opt}
                    checked={form.assignment === opt}
                    onChange={() => setForm(f => ({ ...f, assignment: opt }))}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{ASSIGNMENT_LABELS[opt]}</span>
                </label>
              ))}
            </div>
          </div>

          {form.assignment === 'specific' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Seleccionar leads <span className="text-gray-400">({form.leadIds.length} seleccionados)</span>
              </label>
              <input
                type="text"
                placeholder="Buscar por teléfono..."
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                {filteredLeads.length === 0 && (
                  <p className="p-3 text-sm text-gray-400">No hay leads.</p>
                )}
                {filteredLeads.map(lead => (
                  <label key={lead.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.leadIds.includes(lead.id)}
                      onChange={() => toggleLeadId(lead.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{lead.phone}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString('es-MX')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : '💾 Crear campaña'}
          </button>
        </form>
      )}

      {/* Lista de campañas */}
      {campaigns.length === 0 && !showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-2xl">💰</p>
          <p className="mt-2 font-medium text-gray-700">Sin campañas</p>
          <p className="text-sm text-gray-400">Crea una campaña para asignar un precio especial.</p>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map(c => {
          const expired = c.valid_until && new Date(c.valid_until) < new Date()
          return (
            <div key={c.id} className={`rounded-xl border p-4 ${c.is_active && !expired ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-400">#{c.campaign_number}</span>
                    <span className="font-semibold text-gray-900">{c.campaign_name}</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{c.price_label}</span>
                    {c.is_active && !expired && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Activa</span>
                    )}
                    {expired && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Vencida</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {ASSIGNMENT_LABELS[c.assignment]}
                    {c.assignment === 'specific' && ` · ${c.lead_ids.length} lead${c.lead_ids.length !== 1 ? 's' : ''}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Desde {new Date(c.valid_from).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {c.valid_until && ` → ${new Date(c.valid_until).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(c.id, c.is_active)}
                  disabled={toggling === c.id}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${c.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                >
                  {toggling === c.id ? '...' : c.is_active ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

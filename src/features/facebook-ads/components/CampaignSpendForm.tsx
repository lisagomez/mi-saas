'use client'

import { useState, useTransition } from 'react'
import { logCampaignSpend } from '../services/log-campaign-spend'
import type { FacebookCampaign } from '@/types/database'

interface Props {
  campaigns: FacebookCampaign[]
  defaultCampaignId?: string
  onDone: () => void
}

export function CampaignSpendForm({ campaigns, defaultCampaignId, onDone }: Props) {
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    const data = {
      campaign_id: fd.get('campaign_id') as string,
      spend_date: fd.get('spend_date') as string,
      amount_usd: Number(fd.get('amount_usd')),
      notes: (fd.get('notes') as string) || null,
    }

    startTransition(async () => {
      const res = await logCampaignSpend(data)
      if (res.error) {
        setError(res.error)
      } else {
        onDone()
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaña *</label>
          <select
            name="campaign_id"
            defaultValue={defaultCampaignId ?? ''}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una campaña</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name} (fb_{c.source_key})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
          <input
            name="spend_date"
            type="date"
            defaultValue={today}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto gastado (USD) *</label>
          <input
            name="amount_usd"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="50.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <input
            name="notes"
            type="text"
            placeholder="Notas opcionales..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Registrando...' : 'Registrar gasto'}
        </button>
        <button type="button" onClick={onDone} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  )
}

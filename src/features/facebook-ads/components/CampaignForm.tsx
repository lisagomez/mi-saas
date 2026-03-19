'use client'

import { useState, useTransition } from 'react'
import { createCampaign } from '../services/create-campaign'
import { updateCampaign } from '../services/update-campaign'
import type { FacebookCampaign } from '@/types/database'

interface Props {
  campaign?: FacebookCampaign
  onDone: () => void
}

export function CampaignForm({ campaign, onDone }: Props) {
  const isEdit = !!campaign
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    const data = {
      ...(isEdit ? { id: campaign.id } : {}),
      name: fd.get('name') as string,
      source_key: fd.get('source_key') as string,
      start_date: fd.get('start_date') as string,
      end_date: (fd.get('end_date') as string) || null,
      budget_usd: fd.get('budget_usd') ? Number(fd.get('budget_usd')) : null,
      notes: (fd.get('notes') as string) || null,
      is_active: fd.get('is_active') === 'true',
    }

    startTransition(async () => {
      const res = isEdit ? await updateCampaign(data) : await createCampaign(data)
      if (res.error) {
        setError(res.error)
      } else {
        onDone()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de campaña *</label>
          <input
            name="name"
            defaultValue={campaign?.name}
            required
            placeholder="Navidad 2026"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clave de fuente * <span className="text-xs text-gray-400">(sin espacios)</span></label>
            <div className="flex items-center">
              <span className="border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">fb_</span>
              <input
                name="source_key"
                defaultValue=""
                required
                pattern="[a-z0-9_-]+"
                placeholder="navidad2026"
                className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Usado para atribuir leads: <code>leads.source = &apos;fb_navidad2026&apos;</code></p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
          <input
            name="start_date"
            type="date"
            defaultValue={campaign?.start_date}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
          <input
            name="end_date"
            type="date"
            defaultValue={campaign?.end_date ?? ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto estimado (USD)</label>
          <input
            name="budget_usd"
            type="number"
            step="0.01"
            min="0"
            defaultValue={campaign?.budget_usd ?? ''}
            placeholder="500.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="is_active"
              defaultValue={campaign?.is_active ? 'true' : 'false'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
        )}

        {!isEdit && (
          <input type="hidden" name="is_active" value="true" />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          name="notes"
          defaultValue={campaign?.notes ?? ''}
          rows={2}
          placeholder="Descripción o notas internas..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear campaña'}
        </button>
        <button type="button" onClick={onDone} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  )
}

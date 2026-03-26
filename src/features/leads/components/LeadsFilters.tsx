'use client'

import type { LeadsFilter } from '../types/leads'

interface Props {
  filter: LeadsFilter
  onChange: (filter: LeadsFilter) => void
  uniqueResidences: string[]
  uniqueOrigins: string[]
  filteredCount: number
  totalCount: number
  onSelectFiltered: () => void
  onReset: () => void
  isFiltered: boolean
}

export function LeadsFilters({
  filter,
  onChange,
  uniqueResidences,
  uniqueOrigins,
  filteredCount,
  totalCount,
  onSelectFiltered,
  onReset,
  isFiltered,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Filtros</p>
        <div className="flex items-center gap-3">
          {isFiltered && (
            <>
              <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                {filteredCount} de {totalCount}
              </span>
              <button
                onClick={onSelectFiltered}
                className="text-xs text-purple-600 hover:underline font-medium"
              >
                Seleccionar filtrados
              </button>
              <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-600">
                Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Residencia</label>
          <select
            value={filter.residence}
            onChange={(e) => onChange({ ...filter, residence: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todas</option>
            {uniqueResidences.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Origen</label>
          <select
            value={filter.origin}
            onChange={(e) => onChange({ ...filter, origin: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todos</option>
            {uniqueOrigins.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Mín. pedidos</label>
          <input
            type="number"
            min={0}
            value={filter.minOrders || ''}
            onChange={(e) => onChange({ ...filter, minOrders: Number(e.target.value) || 0 })}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => onChange({ ...filter, dateFrom: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => onChange({ ...filter, dateTo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

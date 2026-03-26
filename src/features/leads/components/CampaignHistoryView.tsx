'use client'

import type { CampaignHistory } from '../types/leads'

interface Props {
  history: CampaignHistory[]
}

export function CampaignHistoryView({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p>Aún no se han enviado campañas.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Promoción</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Enviados</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Fallidos</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Tasa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {history.map((c) => {
            const rate = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0
            return (
              <tr key={c.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.promotionName}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(c.sentAt).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{c.total}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">{c.sent}</td>
                <td className="px-4 py-3 text-right text-red-500">{c.failed}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    rate >= 80 ? 'bg-green-100 text-green-700' :
                    rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {rate}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

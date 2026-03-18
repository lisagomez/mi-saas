'use client'

import { useState } from 'react'
import { confirmVideoPayment } from '../services/confirm-video-payment'

interface PendingVideoPayment {
  id: string
  lead_phone: string
  musical_style: string | null
  payment_proof_url: string | null
  video_price: number | null
  created_at: string
}

interface VideoPaymentConfirmationPanelProps {
  orders: PendingVideoPayment[]
}

export function VideoPaymentConfirmationPanel({ orders }: VideoPaymentConfirmationPanelProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { success: boolean; error?: string }>>({})

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Pagos de Video Pendientes</h2>
        <p className="mt-2 text-sm text-gray-500">No hay comprobantes de video por verificar. ✅</p>
      </div>
    )
  }

  async function handleConfirm(orderId: string) {
    setConfirming(orderId)
    const result = await confirmVideoPayment({ orderId })
    setResults(prev => ({ ...prev, [orderId]: result }))
    setConfirming(null)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        🎬 Pagos de Video Pendientes
        <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
          {orders.length}
        </span>
      </h2>

      <div className="mt-4 space-y-4">
        {orders.map(order => {
          const result = results[order.id]
          const isDone = result?.success

          return (
            <div
              key={order.id}
              className={`rounded-lg border p-4 ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    📱 {order.lead_phone}
                  </p>
                  {order.musical_style && (
                    <p className="mt-0.5 text-xs text-gray-500">Estilo: {order.musical_style}</p>
                  )}
                  {order.video_price !== null && (
                    <p className="mt-0.5 text-xs font-semibold text-purple-600">
                      Video: ${order.video_price} USD
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                {order.payment_proof_url ? (
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.payment_proof_url}
                      alt="Comprobante video"
                      className="h-20 w-20 rounded-lg border border-gray-200 object-cover hover:opacity-90"
                    />
                  </a>
                ) : (
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
                    Sin foto
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                {isDone ? (
                  <span className="text-sm font-medium text-green-600">
                    ✅ Pago confirmado — enlace enviado al cliente
                  </span>
                ) : result?.error ? (
                  <span className="text-xs text-red-500">{result.error}</span>
                ) : (
                  <button
                    onClick={() => handleConfirm(order.id)}
                    disabled={confirming === order.id}
                    className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {confirming === order.id ? 'Procesando...' : '🎬 Confirmar Pago y Enviar Video'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

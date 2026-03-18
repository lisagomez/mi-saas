'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface Props {
  data: { month: string; revenue: number }[]
}

export function CashFlowChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
        Sin datos de flujo de caja aún.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
        <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()} MXN`, 'Ingresos']} />
        <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { runInvestigatorAgent } from '../services/run-investigator-agent'
import type { InvestigatorReport } from '../services/run-investigator-agent'

interface Props {
  initialReport: InvestigatorReport | null
}

export function InvestigatorAgentPanel({ initialReport }: Props) {
  const [report, setReport] = useState<InvestigatorReport | null>(initialReport)
  const [insufficientData, setInsufficientData] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleRun() {
    setError('')
    setInsufficientData(false)
    startTransition(async () => {
      const res = await runInvestigatorAgent()
      if (!res.success) {
        setError(res.error ?? 'Error desconocido')
      } else if (res.insufficientData) {
        setInsufficientData(true)
      } else if (res.report) {
        setReport(res.report)
      }
    })
  }

  return (
    <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-indigo-900">🤖 Agente Investigador</h3>
          <p className="text-xs text-indigo-600 mt-0.5">Análisis competitivo con IA — mercado latino en EE.UU.</p>
        </div>
        <button
          onClick={handleRun}
          disabled={isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? '⏳ Analizando...' : '▶ Ejecutar análisis'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {insufficientData && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          Datos insuficientes para calcular análisis competitivo. Agrega al menos 2 competidores en la tabla de arriba.
        </div>
      )}

      {report && !insufficientData && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-lg bg-white border border-indigo-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Resumen ejecutivo</p>
            <p className="text-sm text-gray-700">{report.summary}</p>
          </div>

          {/* Posición */}
          <div className="rounded-lg bg-white border border-indigo-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Posición CancioBot</p>
            <p className="text-sm text-gray-700">{report.canciobot_position}</p>
          </div>

          {/* Análisis por competidor */}
          {report.competitors_analysis?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-2">Análisis por competidor</p>
              <div className="space-y-3">
                {report.competitors_analysis.map((c, i) => (
                  <div key={i} className="rounded-lg bg-white border border-indigo-200 p-4">
                    <p className="font-semibold text-gray-900 mb-2">{c.name}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="font-medium text-green-700 mb-1">✅ Ventajas CancioBot</p>
                        <p className="text-gray-600">{c.ventajas_canciobot}</p>
                      </div>
                      <div>
                        <p className="font-medium text-red-600 mb-1">⚠️ Desventajas</p>
                        <p className="text-gray-600">{c.desventajas_canciobot}</p>
                      </div>
                      <div>
                        <p className="font-medium text-indigo-700 mb-1">🎯 Estrategia</p>
                        <p className="text-gray-600">{c.estrategia}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Precio y oportunidades */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-white border border-indigo-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">💲 Precio recomendado</p>
              <p className="text-sm text-gray-700">{report.price_recommendation}</p>
            </div>
            <div className="rounded-lg bg-white border border-indigo-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-500 mb-1">🚀 Oportunidades</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {report.key_opportunities?.map((o, i) => <li key={i}>• {o}</li>)}
              </ul>
            </div>
            <div className="rounded-lg bg-white border border-indigo-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-1">⚠️ Riesgos</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {report.risks?.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {!report && !insufficientData && !error && !isPending && (
        <p className="text-sm text-indigo-500 text-center py-4">
          Presiona "Ejecutar análisis" para que el agente analice la competencia con IA.
        </p>
      )}
    </div>
  )
}

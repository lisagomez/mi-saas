'use client'

import { useState } from 'react'
import type { TrendLog, DecisionType } from '../types'

const STATUS_META = {
  success: { dot: 'bg-emerald-500', label: 'OK',       text: 'text-emerald-700', bg: 'bg-emerald-50' },
  error:   { dot: 'bg-red-500',     label: 'Error',    text: 'text-red-700',     bg: 'bg-red-50'     },
  running: { dot: 'bg-amber-400 animate-pulse', label: 'Corriendo', text: 'text-amber-700', bg: 'bg-amber-50' },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   'text-emerald-600 bg-emerald-50',
  medium: 'text-amber-600 bg-amber-50',
  low:    'text-red-600 bg-red-50',
}

const URGENCY_ICONS: Record<string, string> = {
  alta:  '🔥',
  media: '⚡',
  baja:  '📌',
}

const DECISION_META: Record<DecisionType, { label: string; bg: string; text: string; icon: string }> = {
  auto_replace:       { label: 'Auto-reemplazado', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🔄' },
  suggest_adjustment: { label: 'Sugerencia',        bg: 'bg-amber-50',   text: 'text-amber-700',   icon: '💡' },
  first_run:          { label: 'Primera ejecución', bg: 'bg-blue-50',    text: 'text-blue-700',    icon: '🆕' },
}

function TrendLogRow({ log }: { log: TrendLog }) {
  const [expanded, setExpanded] = useState(false)
  const meta = STATUS_META[log.status] ?? STATUS_META.error
  const theme = log.theme_json as {
    weekly_theme?: string
    confidence?: string
    urgency?: { nivel?: string }
    trend_applied?: { titulo?: string }
    pain_addressed?: { descripcion?: string }
    alternative_theme?: { theme?: string }
    risks?: string
  }

  const weeklyTheme = theme.weekly_theme ?? (log.status === 'running' ? 'Calculando…' : '—')
  const confidence = theme.confidence
  const urgencyLevel = theme.urgency?.nivel
  const decisionMeta = log.decision_type ? DECISION_META[log.decision_type] : null
  const decisionLog = log.decision_log as {
    improvement_pct?: number
    posts_ideado_moved?: number
    posts_review_noted?: number
    posts_noted?: number
    action?: string
    reason?: string
    ai_reasoning?: string
  } | null

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-gray-300' : 'border-gray-100'} bg-white overflow-hidden`}>
      {/* Row header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{weeklyTheme}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {new Date(log.created_at).toLocaleDateString('es-MX', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
            {log.source === 'cron' && (
              <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">cron</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {confidence && (
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${CONFIDENCE_COLORS[confidence] ?? 'text-gray-500 bg-gray-100'}`}>
              {confidence}
            </span>
          )}
          {log.relevance_score !== null && log.relevance_score !== undefined && (
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5" title="Score de relevancia">
              {log.relevance_score}/100
            </span>
          )}
          {urgencyLevel && (
            <span className="text-sm" title={`Urgencia: ${urgencyLevel}`}>
              {URGENCY_ICONS[urgencyLevel] ?? '📌'}
            </span>
          )}
          {decisionMeta && (
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${decisionMeta.bg} ${decisionMeta.text}`} title={decisionMeta.label}>
              {decisionMeta.icon}
              {decisionLog?.improvement_pct !== undefined && ` +${decisionLog.improvement_pct}%`}
            </span>
          )}
          {log.execution_ms && (
            <span className="text-[10px] text-gray-300">{(log.execution_ms / 1000).toFixed(1)}s</span>
          )}
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">

          {log.status === 'error' && log.error_message && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-xs font-semibold text-red-600 mb-1">Error</p>
              <p className="text-xs text-red-500 font-mono leading-relaxed">{log.error_message}</p>
            </div>
          )}

          {log.status === 'success' && (
            <>
              {/* Reasoning */}
              {log.reasoning && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Razonamiento</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{log.reasoning}</p>
                </div>
              )}

              {/* Trend + Pain */}
              {(theme.trend_applied?.titulo || theme.pain_addressed?.descripcion) && (
                <div className="grid grid-cols-2 gap-3">
                  {theme.trend_applied?.titulo && (
                    <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-1">Tendencia</p>
                      <p className="text-xs text-indigo-700 font-medium">{theme.trend_applied.titulo}</p>
                    </div>
                  )}
                  {theme.pain_addressed?.descripcion && (
                    <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-400 mb-1">Dolor conectado</p>
                      <p className="text-xs text-rose-700 font-medium">{theme.pain_addressed.descripcion}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Risks */}
              {theme.risks && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 mb-1">Riesgos</p>
                  <p className="text-xs text-amber-700">{theme.risks}</p>
                </div>
              )}

              {/* Alternative theme */}
              {theme.alternative_theme?.theme && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Tema alternativo</p>
                  <p className="text-xs text-gray-600 font-medium">"{theme.alternative_theme.theme}"</p>
                </div>
              )}
            </>
          )}

          {/* Decision Log */}
          {decisionMeta && decisionLog && (
            <div className={`rounded-lg border px-3 py-2 ${decisionMeta.bg}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${decisionMeta.text}`}>
                {decisionMeta.icon} {decisionMeta.label}
              </p>
              <p className={`text-xs font-medium mb-1 ${decisionMeta.text}`}>{decisionLog.reason}</p>
              {decisionLog.action && (
                <p className="text-[11px] text-gray-500">{decisionLog.action}</p>
              )}
              {decisionLog.ai_reasoning && (
                <p className="text-[11px] text-gray-400 mt-1 italic">{decisionLog.ai_reasoning}</p>
              )}
            </div>
          )}

          {log.avatar_name && (
            <p className="text-[10px] text-gray-400">Avatar: {log.avatar_name}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function TrendRadarLog({ logs }: { logs: TrendLog[] }) {
  const [open, setOpen] = useState(false)

  const lastSuccess = logs.find(l => l.status === 'success')
  const hasRunning  = logs.some(l => l.status === 'running')

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📡</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Trend Radar — Log de ejecuciones</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasRunning
                ? 'Ejecutándose ahora…'
                : lastSuccess
                  ? `Último: ${new Date(lastSuccess.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · "${String(lastSuccess.theme_json?.weekly_theme ?? '').slice(0, 50)}"`
                  : 'Sin ejecuciones aún — cron activo: lunes 8AM'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{logs.length} ejecuciones</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-2 bg-gray-50/50">
          {logs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-1">Sin ejecuciones registradas</p>
              <p className="text-xs text-gray-300">El cron job se activa automáticamente cada lunes a las 8AM</p>
            </div>
          ) : (
            logs.map(log => <TrendLogRow key={log.id} log={log} />)
          )}
          <p className="text-[10px] text-gray-300 text-center pt-1">
            Cron: lunes 14:00 UTC (8AM México City) · pg_cron + pg_net
          </p>
        </div>
      )}
    </div>
  )
}

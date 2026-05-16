'use client'

import { useState, useTransition } from 'react'
import type { AvatarWithInsights, ProactiveInsight } from '../services/get-avatars'
import { saveJudgeOverride } from '../services/save-judge-override'
import { buildExportJson } from '../utils/build-export-json'

const INSIGHT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  hook_opportunity:       { label: 'Gancho',   color: 'bg-violet-100 text-violet-700' },
  barrier_response:       { label: 'Barrera',  color: 'bg-orange-100 text-orange-700' },
  timing_insight:         { label: 'Timing',   color: 'bg-blue-100 text-blue-700' },
  channel_recommendation: { label: 'Canal',    color: 'bg-emerald-100 text-emerald-700' },
  price_anchoring:        { label: 'Precio',   color: 'bg-amber-100 text-amber-700' },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   'text-emerald-600',
  medium: 'text-amber-600',
  low:    'text-red-500',
}

const TIPO_COLORS: Record<string, string> = {
  organico:   'bg-green-100 text-green-700',
  inorganico: 'bg-rose-100 text-rose-700',
}

function MatrixBadges({ classification }: { classification: NonNullable<ProactiveInsight['classification']> }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-[10px] rounded px-1.5 py-0.5 bg-gray-100 text-gray-600 font-medium">
        📡 {classification.canal}
      </span>
      <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${TIPO_COLORS[classification.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
        {classification.tipo === 'organico' ? '🌱 Orgánico' : '💰 Inorgánico'}
      </span>
      <span className="text-[10px] rounded px-1.5 py-0.5 bg-sky-100 text-sky-700 font-medium">
        🎬 {classification.formato}
      </span>
      <span className="text-[10px] rounded px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-medium">
        🎯 {classification.estrategia_venta}
      </span>
    </div>
  )
}

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="text-[10px] font-medium text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5 transition-colors"
    >
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

// Tarjeta de un insight (usada tanto para el top como para los secundarios)
function InsightBody({ insight }: { insight: ProactiveInsight }) {
  const meta = INSIGHT_TYPE_LABELS[insight.insight_type] ?? { label: insight.insight_type, color: 'bg-gray-100 text-gray-600' }
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${meta.color}`}>
          {meta.label}
        </span>
        {insight.status === 'actioned' && (
          <span className="text-[10px] text-gray-400">✓ usado</span>
        )}
        <span className={`ml-auto text-[10px] font-medium ${CONFIDENCE_COLORS[insight.confidence] ?? 'text-gray-400'}`}>
          {insight.confidence}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-800 mt-1">{insight.title}</p>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.body}</p>

      {insight.classification && <MatrixBadges classification={insight.classification} />}

      {insight.prompt_template && (
        <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prompt</p>
            <CopyButton text={insight.prompt_template} />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{insight.prompt_template}</p>
        </div>
      )}
    </>
  )
}

// Fila colapsable para insights rank 2-5
function SecondaryInsight({
  insight,
  avatarId,
  topInsightId,
}: {
  insight: ProactiveInsight
  avatarId: string
  topInsightId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [overrideApplied, setOverrideApplied] = useState(false)

  const meta = INSIGHT_TYPE_LABELS[insight.insight_type] ?? { label: insight.insight_type, color: 'bg-gray-100 text-gray-600' }

  function handleOverride() {
    startTransition(async () => {
      const result = await saveJudgeOverride({
        avatarId,
        suggestedId: topInsightId,
        chosenId: insight.id,
      })
      if (result.success) setOverrideApplied(true)
    })
  }

  return (
    <div className={`rounded-lg border transition-all ${insight.status === 'actioned' ? 'border-gray-100 opacity-60' : 'border-gray-200 bg-white'}`}>
      {/* Fila colapsada */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2"
      >
        {insight.judge_rank !== null && (
          <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0">
            #{insight.judge_rank}
          </span>
        )}
        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-xs text-gray-600 truncate flex-1">{insight.title}</span>
        {insight.judge_score !== null && (
          <span className="text-[10px] text-gray-400 shrink-0">{insight.judge_score}</span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
          <InsightBody insight={insight} />

          {/* Botón override */}
          {!overrideApplied && insight.judge_rank !== null && (
            <button
              onClick={handleOverride}
              disabled={isPending}
              className="mt-3 w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Aplicando...' : 'Usar este en su lugar →'}
            </button>
          )}
          {overrideApplied && (
            <p className="mt-3 text-xs text-emerald-600 font-medium text-center">
              ✓ Override registrado — el Judge aprenderá de esta elección
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function AvatarCard({ avatar }: { avatar: AvatarWithInsights }) {
  const [open, setOpen] = useState(false)
  const [showJson, setShowJson] = useState(false)

  const pending = avatar.proactive_insights.filter(i => i.status === 'pending')
  const actioned = avatar.proactive_insights.filter(i => i.status === 'actioned')
  const hasClassification = avatar.proactive_insights.some(i => i.classification)
  const exportJson = JSON.stringify(buildExportJson(avatar), null, 2)

  // Separar top insight de los secundarios
  const hasJudgeRanking = avatar.proactive_insights.some(i => i.judge_rank !== null)
  const sortedInsights = avatar.proactive_insights
  const topInsight = sortedInsights[0] ?? null
  const secondaryInsights = sortedInsights.slice(1)

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-gray-900">{avatar.name}</span>
            {avatar.musical_style && (
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {avatar.musical_style}
              </span>
            )}
            {hasClassification && (
              <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 border border-indigo-100">
                matriz 4D
              </span>
            )}
            {hasJudgeRanking && (
              <span className="text-xs bg-amber-50 text-amber-600 rounded-full px-2 py-0.5 border border-amber-100">
                ⚡ Judge
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {avatar.origin} → {avatar.residence}
            {avatar.age_range && <span className="ml-2 text-gray-400">· {avatar.age_range}</span>}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {pending.length > 0 && (
            <span className="text-xs font-semibold bg-violet-100 text-violet-700 rounded-full px-2.5 py-1">
              {pending.length} pendientes
            </span>
          )}
          {actioned.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
              {actioned.length} usados
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">

          {/* Stats rápidos */}
          {avatar.profile_json && (
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 pb-3 border-b border-gray-100">
              {typeof avatar.profile_json.avg_spend_usd === 'number' && (
                <span>💰 Gasto prom: <strong className="text-gray-700">${avatar.profile_json.avg_spend_usd} USD</strong></span>
              )}
              {Array.isArray(avatar.profile_json.preferred_channels) && (
                <span>📱 Canal: <strong className="text-gray-700">{(avatar.profile_json.preferred_channels as string[]).join(', ')}</strong></span>
              )}
              {typeof avatar.profile_json.best_contact_time === 'string' && (
                <span>🕐 Timing: <strong className="text-gray-700">{avatar.profile_json.best_contact_time as string}</strong></span>
              )}
              {typeof avatar.profile_json.confidence === 'string' && (
                <span>🎯 Confianza: <strong className={CONFIDENCE_COLORS[avatar.profile_json.confidence as string] ?? 'text-gray-700'}>
                  {avatar.profile_json.confidence as string}
                </strong></span>
              )}
            </div>
          )}

          {/* Proactive insights */}
          {avatar.proactive_insights.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              Sin insights — ejecuta <code className="text-xs bg-gray-200 rounded px-1">/strategy-bridge</code>
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Plantillas de prompts</p>
                  {!hasJudgeRanking && (
                    <span className="text-[10px] text-amber-500 border border-amber-200 rounded-full px-2 py-0.5 animate-pulse">
                      Calculando ranking…
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJson(v => !v)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1 transition-colors"
                  >
                    {showJson ? 'Ver tarjetas' : 'Ver JSON'}
                  </button>
                  <CopyButton text={exportJson} label="Copiar JSON" />
                </div>
              </div>

              {showJson ? (
                <pre className="text-[11px] bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto leading-relaxed max-h-96 overflow-y-auto">
                  {exportJson}
                </pre>
              ) : topInsight ? (
                <div className="space-y-2">

                  {/* Top insight — siempre visible y destacado */}
                  <div className={`rounded-xl border-2 px-4 py-3 ${
                    hasJudgeRanking
                      ? 'border-amber-300 bg-amber-50/60 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}>
                    {hasJudgeRanking && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                          ⭐ Judge #1
                        </span>
                        {topInsight.judge_score !== null && (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            {topInsight.judge_score}/100
                          </span>
                        )}
                        {topInsight.judge_reasoning && (
                          <p className="text-[10px] text-amber-700 italic flex-1 truncate">
                            {topInsight.judge_reasoning}
                          </p>
                        )}
                      </div>
                    )}
                    <InsightBody insight={topInsight} />
                  </div>

                  {/* Insights secundarios — colapsados */}
                  {secondaryInsights.map(insight => (
                    <SecondaryInsight
                      key={insight.id}
                      insight={insight}
                      avatarId={avatar.id}
                      topInsightId={topInsight.id}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <p className="text-xs text-gray-400 pt-1">
            {avatar.total_avatar_insights} insights inmutables · creado {new Date(avatar.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  )
}

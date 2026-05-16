'use client'

import { useState, useEffect, useTransition } from 'react'

interface GuardianConfig {
  engagement_threshold_pct: number
  min_posts_for_trigger: number
  monitoring_window_days: number
  prohibited_words: string[]
  alert_phone: string
  publishing_paused: boolean
  publishing_paused_reason: string | null
  publishing_paused_at: string | null
  is_active: boolean
}

interface GuardianAlert {
  id: string
  trigger_type: 'low_engagement' | 'prohibited_word'
  trigger_detail: Record<string, unknown>
  posts_affected: number
  avg_engagement_pct: number | null
  alert_sent: boolean
  acknowledged: boolean
  created_at: string
}

export function GuardianPanel() {
  const [config, setConfig] = useState<GuardianConfig | null>(null)
  const [alerts, setAlerts] = useState<GuardianAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  // Comment checker
  const [commentText, setCommentText] = useState('')
  const [commentUrl, setCommentUrl] = useState('')
  const [checkResult, setCheckResult] = useState<{ triggered: boolean; word_found?: string; message: string } | null>(null)
  const [checking, setChecking] = useState(false)

  // Config editing
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Partial<GuardianConfig>>({})
  const [saving, setSaving] = useState(false)

  // Prohibited words editing
  const [newWord, setNewWord] = useState('')

  // Resume
  const [resuming, setResuming] = useState(false)

  async function loadData() {
    const [cfgRes, alertsRes] = await Promise.all([
      fetch('/api/guardian/config'),
      fetch('/api/guardian/alerts'),
    ])
    if (cfgRes.ok) setConfig(await cfgRes.json())
    if (alertsRes.ok) setAlerts(await alertsRes.json())
    setLoading(false)
  }

  useEffect(() => { void loadData() }, [])

  async function handleResume() {
    setResuming(true)
    const res = await fetch('/api/guardian/resume', { method: 'POST' })
    if (res.ok) await loadData()
    setResuming(false)
  }

  async function handleCheckComment() {
    if (!commentText.trim()) return
    setChecking(true)
    setCheckResult(null)
    const res = await fetch('/api/guardian/check-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_text: commentText, post_url: commentUrl || undefined }),
    })
    const data = await res.json() as typeof checkResult
    setCheckResult(data)
    if (data?.triggered) await loadData()
    setChecking(false)
  }

  async function handleSaveConfig() {
    setSaving(true)
    await fetch('/api/guardian/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    await loadData()
    setEditMode(false)
    setSaving(false)
    setDraft({})
  }

  function startEdit() {
    if (!config) return
    setDraft({
      engagement_threshold_pct: config.engagement_threshold_pct,
      min_posts_for_trigger: config.min_posts_for_trigger,
      monitoring_window_days: config.monitoring_window_days,
      prohibited_words: [...config.prohibited_words],
      alert_phone: config.alert_phone,
    })
    setEditMode(true)
  }

  function addWord() {
    const word = newWord.trim().toLowerCase()
    if (!word || (draft.prohibited_words ?? []).includes(word)) return
    setDraft(d => ({ ...d, prohibited_words: [...(d.prohibited_words ?? []), word] }))
    setNewWord('')
  }

  function removeWord(word: string) {
    setDraft(d => ({ ...d, prohibited_words: (d.prohibited_words ?? []).filter(w => w !== word) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!config) {
    return <p className="text-sm text-red-500 py-8">No se pudo cargar la configuración del Guardian.</p>
  }

  const isPaused = config.publishing_paused
  const wordList = editMode ? (draft.prohibited_words ?? []) : (config.prohibited_words ?? [])

  return (
    <div className="space-y-6">
      {/* ── Status Banner ── */}
      <div className={`rounded-xl border-2 p-4 flex items-start justify-between gap-4 ${
        isPaused
          ? 'bg-red-50 border-red-200'
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{isPaused ? '🔴' : '🟢'}</span>
          <div>
            <p className={`text-sm font-bold ${isPaused ? 'text-red-800' : 'text-emerald-800'}`}>
              {isPaused ? 'PUBLICACIÓN PAUSADA' : 'Guardian activo — publicación normal'}
            </p>
            {isPaused && config.publishing_paused_reason && (
              <p className="text-xs text-red-600 mt-1 max-w-lg">{config.publishing_paused_reason}</p>
            )}
            {isPaused && config.publishing_paused_at && (
              <p className="text-[10px] text-red-400 mt-0.5">
                Pausado el {new Date(config.publishing_paused_at).toLocaleString('es-MX')}
              </p>
            )}
          </div>
        </div>
        {isPaused && (
          <button
            onClick={handleResume}
            disabled={resuming}
            className="flex-shrink-0 rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {resuming ? 'Reanudando…' : '▶ Reanudar publicación'}
          </button>
        )}
      </div>

      {/* ── Comment Checker ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">🔍 Verificar comentario</h3>
        <p className="text-xs text-gray-400">
          Pega un comentario problemático. Si contiene palabras prohibidas, el Guardian pausará la publicación y te enviará alerta por WhatsApp.
        </p>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Pega aquí el comentario a revisar…"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
        <input
          value={commentUrl}
          onChange={(e) => setCommentUrl(e.target.value)}
          placeholder="URL del post (opcional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckComment}
            disabled={checking || !commentText.trim()}
            className="rounded-lg bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {checking ? 'Verificando…' : 'Verificar'}
          </button>
          {checkResult && (
            <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${
              checkResult.triggered
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {checkResult.triggered ? `🚨 ${checkResult.message}` : `✅ ${checkResult.message}`}
            </div>
          )}
        </div>
      </div>

      {/* ── Alert Log ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">📋 Historial de alertas</h3>
        {alerts.length === 0 ? (
          <p className="text-xs text-gray-300 py-4 text-center">Sin alertas registradas</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 text-xs ${
                  alert.acknowledged ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-orange-100 bg-orange-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`font-semibold ${
                    alert.trigger_type === 'low_engagement' ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {alert.trigger_type === 'low_engagement' ? '📉 Engagement bajo' : '🚫 Palabra prohibida'}
                  </span>
                  <div className="flex items-center gap-2">
                    {alert.alert_sent && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">
                        WhatsApp enviado
                      </span>
                    )}
                    {alert.acknowledged && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                        Reconocida
                      </span>
                    )}
                  </div>
                </div>
                {alert.trigger_type === 'low_engagement' && alert.avg_engagement_pct != null && (
                  <p className="text-gray-600">
                    Promedio: <span className="font-medium">{Number(alert.avg_engagement_pct).toFixed(2)}%</span>
                    {' '}· {alert.posts_affected} posts afectados
                  </p>
                )}
                {alert.trigger_type === 'prohibited_word' && (
                  <p className="text-gray-600">
                    Palabra: <span className="font-medium">&ldquo;{String((alert.trigger_detail as Record<string,unknown>).word_found ?? '')}&rdquo;</span>
                  </p>
                )}
                <p className="text-gray-400 mt-1">
                  {new Date(alert.created_at).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Config ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">⚙️ Configuración</h3>
          {!editMode ? (
            <button onClick={startEdit} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setEditMode(false); setDraft({}) }}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="text-xs bg-indigo-600 text-white font-medium px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Umbral mínimo (%)
            </label>
            {editMode ? (
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={draft.engagement_threshold_pct ?? ''}
                onChange={(e) => setDraft(d => ({ ...d, engagement_threshold_pct: parseFloat(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-800">{config.engagement_threshold_pct}%</p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Posts para activar
            </label>
            {editMode ? (
              <input
                type="number"
                min="1"
                max="10"
                value={draft.min_posts_for_trigger ?? ''}
                onChange={(e) => setDraft(d => ({ ...d, min_posts_for_trigger: parseInt(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-800">{config.min_posts_for_trigger} posts</p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Ventana de análisis
            </label>
            {editMode ? (
              <input
                type="number"
                min="1"
                max="30"
                value={draft.monitoring_window_days ?? ''}
                onChange={(e) => setDraft(d => ({ ...d, monitoring_window_days: parseInt(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            ) : (
              <p className="text-sm font-semibold text-gray-800">{config.monitoring_window_days} días</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Teléfono de alerta (WhatsApp)
          </label>
          {editMode ? (
            <input
              type="tel"
              placeholder="52XXXXXXXXXX (con código de país)"
              value={draft.alert_phone ?? ''}
              onChange={(e) => setDraft(d => ({ ...d, alert_phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          ) : (
            <p className="text-sm font-semibold text-gray-800">
              {config.alert_phone || <span className="text-gray-300 font-normal">Sin configurar</span>}
            </p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
            Palabras prohibidas
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {wordList.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-1 bg-red-50 border border-red-100 text-red-700 text-xs rounded-full px-2.5 py-0.5"
              >
                {w}
                {editMode && (
                  <button
                    onClick={() => removeWord(w)}
                    className="text-red-400 hover:text-red-700 leading-none"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {wordList.length === 0 && (
              <span className="text-xs text-gray-300">Sin palabras configuradas</span>
            )}
          </div>
          {editMode && (
            <div className="flex gap-2">
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWord())}
                placeholder="Agregar palabra…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={addWord}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                + Agregar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

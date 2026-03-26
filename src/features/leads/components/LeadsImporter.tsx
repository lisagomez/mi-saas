'use client'

import { useState, useTransition, useRef } from 'react'
import { importLeads } from '../services/import-leads'
import type { ImportLeadsResult } from '../services/import-leads'

// Extrae números de teléfono de los nombres de archivo del zip de WhatsApp
// Formato Android: "WhatsApp Chat with +15551234567.txt" / "Chat de WhatsApp con +15551234567.txt"
function extractPhoneFromFilename(filename: string): string | null {
  const match = filename.match(/(\+\d{10,15})/)
  return match ? match[1] : null
}

function parseManualInput(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function LeadsImporter() {
  const [mode, setMode] = useState<'zip' | 'manual'>('zip')
  const [manualText, setManualText] = useState('')
  const [preview, setPreview] = useState<string[]>([])
  const [result, setResult] = useState<ImportLeadsResult | null>(null)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleZipFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setPreview([])
    setResult(null)
    setIsParsing(true)

    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      const phones: string[] = []

      zip.forEach((relativePath) => {
        const phone = extractPhoneFromFilename(relativePath)
        if (phone) phones.push(phone)
      })

      if (phones.length === 0) {
        setError('No se encontraron números en el archivo. Asegúrate de subir el .zip exportado desde WhatsApp.')
      } else {
        setPreview(phones)
      }
    } catch {
      setError('No se pudo leer el archivo. Asegúrate de que es un .zip válido de WhatsApp.')
    } finally {
      setIsParsing(false)
    }
  }

  function handleManualPreview() {
    const phones = parseManualInput(manualText)
    if (phones.length === 0) { setError('Ingresa al menos un número'); return }
    setError('')
    setPreview(phones)
    setResult(null)
  }

  function handleImport() {
    if (preview.length === 0) return
    startTransition(async () => {
      try {
        const res = await importLeads(preview)
        setResult(res)
        setPreview([])
        setManualText('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al importar')
      }
    })
  }

  function reset() {
    setPreview([])
    setResult(null)
    setError('')
    setManualText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Importar Leads de WAB</h2>
        <p className="text-sm text-gray-500 mt-0.5">Importa números de WhatsApp Business antes del bot.</p>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['zip', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); reset() }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'zip' ? '📦 Zip de WhatsApp' : '✏️ Pegar números'}
          </button>
        ))}
      </div>

      {/* Instrucciones ZIP */}
      {mode === 'zip' && !preview.length && !result && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
          <p className="font-medium">Cómo exportar desde Android:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Abre WhatsApp → ⋮ → Configuración</li>
            <li>Chats → Exportar chats → <strong>Exportar todos</strong></li>
            <li>Guarda el <code className="bg-blue-100 px-1 rounded">.zip</code> y súbelo aquí</li>
          </ol>
        </div>
      )}

      {/* Input ZIP */}
      {mode === 'zip' && !preview.length && !result && (
        <div
          className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm font-medium text-gray-700">Haz clic para subir el .zip de WhatsApp</p>
          <p className="text-xs text-gray-400 mt-1">Solo archivos .zip</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleZipFile}
          />
          {isParsing && <p className="text-sm text-purple-600 mt-3">Leyendo archivo...</p>}
        </div>
      )}

      {/* Input manual */}
      {mode === 'manual' && !preview.length && !result && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Números de teléfono (uno por línea, con código de país)
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={8}
              placeholder={`+15551234567\n+15559876543\n+525512345678`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            onClick={handleManualPreview}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            Vista previa
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Se encontraron <span className="text-purple-600 font-bold">{preview.length}</span> números
            </p>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {preview.slice(0, 50).map((phone) => (
                  <tr key={phone}>
                    <td className="px-4 py-2 font-mono text-gray-700">{phone}</td>
                  </tr>
                ))}
                {preview.length > 50 && (
                  <tr>
                    <td className="px-4 py-2 text-gray-400 text-xs">...y {preview.length - 50} más</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleImport}
            disabled={isPending}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {isPending ? '⏳ Importando...' : `📥 Importar ${preview.length} números`}
          </button>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-4">
          <p className="text-2xl">✅</p>
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
            <div>
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              <p className="text-xs text-gray-500">Importados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
              <p className="text-xs text-gray-500">Ya existían</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{result.invalid}</p>
              <p className="text-xs text-gray-500">Inválidos</p>
            </div>
          </div>
          <button onClick={reset} className="text-sm text-purple-600 hover:underline">
            Importar más
          </button>
        </div>
      )}
    </div>
  )
}

import type { SunoGenerateParams, SunoClip } from '../types/suno'

const SUNO_BASE_URL = 'https://api.suno.ai'
const SUNO_TIMEOUT_MS = 120_000 // 2 minutos máximo

/**
 * Genera audio de una canción usando Suno AI.
 *
 * Requiere SUNO_COOKIE en variables de entorno (sesión de Suno).
 * Si no está configurado, lanza error descriptivo para fallback graceful.
 *
 * Interfaz diseñada para swap por Freebeat u otro proveedor sin cambiar la orquestación.
 */
export async function generateAudio(params: {
  musicPrompt: string
  lyricsText: string
  title?: string
}): Promise<{ audioUrl: string; sunoId: string }> {
  const cookie = process.env.SUNO_COOKIE
  if (!cookie) {
    throw new Error('SUNO_COOKIE no configurado — generación de audio no disponible')
  }

  const body: SunoGenerateParams = {
    prompt: params.musicPrompt,
    lyrics: params.lyricsText,
    title: params.title ?? 'Mi Canción Personalizada',
    make_instrumental: false,
    wait_audio: true,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUNO_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${SUNO_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Suno API error ${res.status}: ${errText}`)
  }

  const data = await res.json() as SunoClip[] | { clips: SunoClip[] }

  // Suno puede retornar array directo o { clips: [...] }
  const clips = Array.isArray(data) ? data : (data as { clips: SunoClip[] }).clips
  const clip = clips?.[0]

  if (!clip?.audio_url) {
    throw new Error('Suno no retornó audio_url en la respuesta')
  }

  return { audioUrl: clip.audio_url, sunoId: clip.id }
}

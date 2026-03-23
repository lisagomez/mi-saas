const MUSICAPI_BASE = 'https://api.musicapi.ai/api/v1'
const MUSICAPI_MODEL = 'sonic-v4-5'

const MAX_POLL_ATTEMPTS = 40  // 40 × 15s = 10 minutos máximo
const POLL_INTERVAL_MS = 15_000

/**
 * Genera una canción completa con voz usando MusicAPI (Suno v4.5 por debajo).
 * Acepta la letra personalizada generada por el calificador y el estilo musical del cliente.
 */
export async function generateAudio(params: {
  musicPrompt: string
  lyricsText: string
  title?: string
}): Promise<{ audioUrl: string; sunoId: string }> {
  const apiKey = process.env.MUSICAPI_KEY
  if (!apiKey) {
    throw new Error('MUSICAPI_KEY no configurado — generación de audio no disponible')
  }

  // 1. Crear la canción
  const createRes = await fetch(`${MUSICAPI_BASE}/sonic/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      custom_mode: true,
      mv: MUSICAPI_MODEL,
      title: params.title ?? 'Mi Canción Personalizada',
      tags: params.musicPrompt,
      prompt: params.lyricsText,
      style_weight: 0.8,
    }),
  })

  if (!createRes.ok) {
    throw new Error(`MusicAPI create failed ${createRes.status}: ${await createRes.text()}`)
  }

  const { task_id } = await createRes.json() as { task_id: string }

  // 2. Polling hasta que la canción esté lista
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const pollRes = await fetch(`${MUSICAPI_BASE}/sonic/task/${task_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!pollRes.ok) continue

    const poll = await pollRes.json() as {
      data?: Array<{ clip_id: string; state: string; audio_url?: string }>
    }

    const clip = poll.data?.[0]
    if (!clip) continue

    if (clip.state === 'succeeded') {
      if (!clip.audio_url) throw new Error('MusicAPI succeeded pero audio_url está vacío')
      return { audioUrl: clip.audio_url, sunoId: clip.clip_id }
    }

    if (clip.state === 'failed') {
      throw new Error(`MusicAPI generation failed para task ${task_id}`)
    }
  }

  throw new Error(`MusicAPI polling timeout después de ${MAX_POLL_ATTEMPTS} intentos`)
}

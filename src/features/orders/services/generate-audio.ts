const MUSICAPI_BASE = 'https://api.musicapi.ai/api/v1'
const MUSICAPI_MODEL = 'sonic-v4-5'

/**
 * Envía el job a MusicAPI y retorna el task_id inmediatamente.
 * No espera a que la canción esté lista — eso lo hace el cron /api/music/poll.
 */
export async function submitAudioJob(params: {
  musicPrompt: string
  lyricsText: string
  title?: string
}): Promise<{ taskId: string }> {
  const apiKey = process.env.MUSICAPI_KEY
  if (!apiKey) {
    throw new Error('MUSICAPI_KEY no configurado — generación de audio no disponible')
  }

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
  return { taskId: task_id }
}

/**
 * Consulta el estado de un job de MusicAPI.
 * Retorna audioUrl si está listo, null si sigue en proceso, lanza error si falló.
 */
export async function checkAudioJob(taskId: string): Promise<{ audioUrl: string | null }> {
  const apiKey = process.env.MUSICAPI_KEY
  if (!apiKey) {
    throw new Error('MUSICAPI_KEY no configurado')
  }

  const pollRes = await fetch(`${MUSICAPI_BASE}/sonic/task/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!pollRes.ok) return { audioUrl: null }

  const poll = await pollRes.json() as {
    data?: Array<{ clip_id: string; state: string; audio_url?: string }>
  }

  const clip = poll.data?.[0]
  if (!clip) return { audioUrl: null }

  if (clip.state === 'succeeded') {
    if (!clip.audio_url) throw new Error('MusicAPI succeeded pero audio_url está vacío')
    return { audioUrl: clip.audio_url }
  }

  if (clip.state === 'failed') {
    throw new Error(`MusicAPI generation failed para task ${taskId}`)
  }

  // pending / processing
  return { audioUrl: null }
}

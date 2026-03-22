/**
 * Descarga un audio de WhatsApp Cloud API y lo transcribe con Whisper vía OpenRouter.
 * Requiere WHATSAPP_ACCESS_TOKEN y OPENROUTER_API_KEY.
 */
export async function transcribeWhatsAppAudio(mediaId: string): Promise<string> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (!token) throw new Error('Missing WHATSAPP_ACCESS_TOKEN')
  if (!openrouterKey) throw new Error('Missing OPENROUTER_API_KEY')

  // 1. Obtener URL pública del audio desde Meta
  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!metaRes.ok) {
    throw new Error(`Meta media info failed: ${await metaRes.text()}`)
  }
  const { url } = (await metaRes.json()) as { url: string }

  // 2. Descargar el binario del audio
  const audioRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!audioRes.ok) {
    throw new Error(`Audio download failed: ${await audioRes.text()}`)
  }
  const audioBuffer = await audioRes.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' })

  // 3. Transcribir con Whisper vía OpenRouter
  const form = new FormData()
  form.append('file', audioBlob, 'audio.ogg')
  form.append('model', 'openai/whisper-1')

  const transcribeRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openrouterKey}` },
    body: form,
  })
  if (!transcribeRes.ok) {
    throw new Error(`Transcription failed: ${await transcribeRes.text()}`)
  }
  const { text } = (await transcribeRes.json()) as { text: string }
  return text.trim()
}

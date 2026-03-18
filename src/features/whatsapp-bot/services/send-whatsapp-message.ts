/**
 * Envía un mensaje de audio por WhatsApp Cloud API.
 * audioUrl debe ser una URL HTTPS pública accesible (ej: Supabase Storage público).
 */
export async function sendWhatsAppAudio(
  to: string,
  audioUrl: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) {
    return { success: false, error: 'Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN' }
  }

  const normalizedTo = to.replace(/\D/g, '')
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'audio',
      audio: { link: audioUrl },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { success: false, error: err }
  }
  return { success: true }
}

/**
 * Envía un mensaje de texto por WhatsApp Cloud API.
 * Requiere WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN en env.
 */
export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) {
    return { success: false, error: 'Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN' }
  }

  const normalizedTo = to.replace(/\D/g, '')
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { success: false, error: err }
  }
  return { success: true }
}

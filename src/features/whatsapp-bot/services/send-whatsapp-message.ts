/**
 * Envía un archivo de audio por WhatsApp Cloud API como documento descargable.
 * Usa type:"document" en lugar de "audio" porque WhatsApp requiere audio/mpeg
 * pero Supabase Storage sirve el archivo como audio/mp3, lo cual WhatsApp rechaza
 * silenciosamente para el tipo "audio". El tipo "document" no tiene esa restricción.
 */
export async function sendWhatsAppAudio(
  to: string,
  audioUrl: string,
  caption?: string
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
      type: 'document',
      document: {
        link: audioUrl,
        filename: 'preview.mp3',
        ...(caption ? { caption } : {}),
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { success: false, error: err }
  }
  return { success: true }
}

/**
 * Envía un template de WhatsApp Cloud API (para contactos fuera de la ventana de 24h).
 * templateName: nombre del template aprobado en Meta.
 * variables: valores para los parámetros {{1}}, {{2}}, ... (opcional si el template no tiene variables).
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  language = 'es',
  variables: string[] = []
): Promise<{ success: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) {
    return { success: false, error: 'Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN' }
  }

  const normalizedTo = to.replace(/\D/g, '')
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  const components = variables.length > 0
    ? [{ type: 'body', parameters: variables.map((v) => ({ type: 'text', text: v })) }]
    : []

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
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

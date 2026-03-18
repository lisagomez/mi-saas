import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Descarga la imagen del comprobante desde Meta CDN y la sube a Supabase Storage.
 *
 * WhatsApp Cloud API usa un flujo de dos pasos:
 * 1. GET https://graph.facebook.com/v21.0/{media-id} → retorna { url }
 * 2. GET {url} (con Authorization header) → retorna los bytes de la imagen
 */
export async function storePaymentProof(params: {
  mediaId: string
  orderId: string
  mimeType?: string
}): Promise<{ url: string }> {
  const { mediaId, orderId, mimeType = 'image/jpeg' } = params
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  if (!token) throw new Error('Missing WHATSAPP_ACCESS_TOKEN')

  // Paso 1: obtener URL real del media
  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!metaRes.ok) throw new Error(`Meta media info failed: ${await metaRes.text()}`)

  const metaJson = (await metaRes.json()) as { url?: string }
  const mediaUrl = metaJson.url
  if (!mediaUrl) throw new Error('No url in Meta media response')

  // Paso 2: descargar bytes de la imagen
  const imgRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!imgRes.ok) throw new Error(`Meta image download failed: ${await imgRes.text()}`)

  const imageBuffer = await imgRes.arrayBuffer()

  // Paso 3: subir a Supabase Storage
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `${orderId}/${Date.now()}.${ext}`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, imageBuffer, { contentType: mimeType, upsert: true })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // Retornar URL firmada con 1 hora de expiración (para uso en dashboard)
  const { data: signedData, error: signError } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 3600)

  if (signError || !signedData?.signedUrl) {
    throw new Error(`Signed URL failed: ${signError?.message}`)
  }

  return { url: signedData.signedUrl }
}

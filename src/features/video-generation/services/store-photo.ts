import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Descarga una foto desde Meta CDN y la sube a Supabase Storage (bucket order-photos).
 * Mismo patrón de dos pasos que store-payment-proof.ts.
 */
export async function storePhoto(params: {
  mediaId: string
  orderId: string
  sortOrder: number
  mimeType?: string
}): Promise<{ storagePath: string; publicUrl: string }> {
  const { mediaId, orderId, sortOrder, mimeType = 'image/jpeg' } = params
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  if (!token) throw new Error('Missing WHATSAPP_ACCESS_TOKEN')

  // Paso 1: obtener URL real del media desde Meta
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

  // Normalizar extensión (HEIC → jpg para compatibilidad con Replicate)
  const ext = mimeType.includes('heic') ? 'jpg' : (mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg')
  const storagePath = `${orderId}/${sortOrder}_${Date.now()}.${ext}`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('order-photos')
    .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: true })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // Guardar registro en order_photos
  const { error: insertError } = await supabase
    .from('order_photos')
    .insert({
      order_id: orderId,
      storage_path: storagePath,
      public_url: storagePath,
      sort_order: sortOrder,
    } as never)

  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

  // Actualizar photo_count en videos
  await supabase
    .from('videos')
    .update({ photo_count: sortOrder + 1, updated_at: new Date().toISOString() } as never)
    .eq('order_id', orderId)

  return { storagePath, publicUrl: storagePath }
}

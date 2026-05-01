import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

/**
 * Descarga una foto desde Meta CDN, la normaliza a JPEG (incluyendo HEIC),
 * y la sube a Supabase Storage (bucket order-photos).
 *
 * Idempotencia: si el mismo mediaId ya fue procesado para esta orden, retorna
 * el registro existente sin re-subir ni duplicar la fila en order_photos.
 */
export async function storePhoto(params: {
  mediaId: string
  orderId: string
  sortOrder: number
  mimeType?: string
}): Promise<{ storagePath: string; publicUrl: string; deduplicated: boolean }> {
  const { mediaId, orderId, sortOrder, mimeType = 'image/jpeg' } = params
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) throw new Error('Missing WHATSAPP_ACCESS_TOKEN')

  const supabase = createAdminClient()

  // Idempotencia: si ya existe una foto con este mediaId, devolverla.
  const { data: existing } = await supabase
    .from('order_photos')
    .select('storage_path')
    .eq('order_id', orderId)
    .eq('meta_media_id', mediaId)
    .maybeSingle()

  if (existing) {
    const path = (existing as { storage_path: string }).storage_path
    return { storagePath: path, publicUrl: path, deduplicated: true }
  }

  // Paso 1: URL real del media en Meta
  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!metaRes.ok) throw new Error(`Meta media info failed: ${await metaRes.text()}`)
  const metaJson = (await metaRes.json()) as { url?: string }
  const mediaUrl = metaJson.url
  if (!mediaUrl) throw new Error('No url in Meta media response')

  // Paso 2: descargar binario
  const imgRes = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!imgRes.ok) throw new Error(`Meta image download failed: ${await imgRes.text()}`)
  const rawBuffer = Buffer.from(await imgRes.arrayBuffer())

  // Paso 3: normalizar a JPEG. sharp soporta HEIC nativamente vía libheif (linux x64).
  // Auto-rotate basado en EXIF y convierte cualquier formato (HEIC, WebP, PNG) a JPEG.
  let jpegBuffer: Buffer
  try {
    jpegBuffer = await sharp(rawBuffer, { failOn: 'none' })
      .rotate()
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()
  } catch (err) {
    throw new Error(`Image normalize failed (mime=${mimeType}): ${err instanceof Error ? err.message : err}`)
  }

  const storagePath = `${orderId}/${sortOrder}_${Date.now()}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('order-photos')
    .upload(storagePath, jpegBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  const { error: insertError } = await supabase
    .from('order_photos')
    .insert({
      order_id: orderId,
      storage_path: storagePath,
      public_url: storagePath,
      sort_order: sortOrder,
      meta_media_id: mediaId,
    } as never)
  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

  await supabase
    .from('videos')
    .update({ photo_count: sortOrder + 1, updated_at: new Date().toISOString() } as never)
    .eq('order_id', orderId)

  return { storagePath, publicUrl: storagePath, deduplicated: false }
}

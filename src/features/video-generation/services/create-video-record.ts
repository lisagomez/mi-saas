import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Crea (o recupera) el registro de video para una orden.
 * Se llama cuando el cliente acepta el add-on de video.
 */
export async function createVideoRecord(orderId: string): Promise<{ videoId: string }> {
  const price = parseFloat(process.env.VIDEO_PRICE_USD ?? '0') || null
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('videos')
    .upsert(
      {
        order_id: orderId,
        status: 'recopilando_fotos',
        price,
        payment_status: 'pendiente',
        photo_count: 0,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'order_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create video record: ${error?.message}`)

  return { videoId: (data as { id: string }).id }
}

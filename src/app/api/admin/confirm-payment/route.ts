import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverSong } from '@/features/orders/services/deliver-song'
import { storeMessage } from '@/features/whatsapp-bot/conversation/services/store-message'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await request.json() as { orderId: string }
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: orderRaw, error } = await supabase
    .from('orders')
    .select('id, status, leads(id, phone), songs(lyrics_text, audio_url)')
    .eq('id', orderId)
    .single()

  if (error || !orderRaw) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = orderRaw as unknown as {
    id: string
    status: string
    leads: { id: string; phone: string } | null
    songs: Array<{ lyrics_text: string | null; audio_url: string | null }> | null
  }

  if (order.status !== 'pago_pendiente') {
    return NextResponse.json({ error: `Estado actual: ${order.status}` }, { status: 400 })
  }

  const lead = order.leads
  const songs = order.songs
  const song = songs?.[0]

  if (!lead?.phone || !song?.lyrics_text) {
    return NextResponse.json({ error: 'Faltan datos: phone o lyrics_text' }, { status: 400 })
  }

  const result = await deliverSong({
    phone: lead.phone,
    lyricsText: song.lyrics_text,
    audioUrl: song.audio_url,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  await supabase
    .from('orders')
    .update({ status: 'pago_confirmado', updated_at: new Date().toISOString() } as never)
    .eq('id', orderId)

  await storeMessage({
    leadId: lead.id,
    role: 'assistant',
    contentText: '[canción entregada + oferta de video]',
  })

  return NextResponse.json({ ok: true, phone: lead.phone })
}

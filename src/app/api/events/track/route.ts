import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const EventSchema = z.object({
  strategy_id:  z.string().uuid().optional(),
  event_type:   z.enum(['click', 'dm', 'save', 'view', 'share']),
  platform:     z.enum(['facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube']).optional(),
  utm_source:   z.string().max(100).optional(),
  utm_medium:   z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  utm_content:  z.string().max(200).optional(),
  utm_term:     z.string().max(200).optional(),
  lead_id:      z.string().uuid().optional(),
  metadata:     z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events' as never)
    .insert(parsed.data as never)
    .select('id')
    .single() as unknown as { data: { id: string } | null; error: { message: string } | null }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, event_id: data?.id })
}

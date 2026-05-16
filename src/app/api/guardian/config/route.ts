import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('guardian_config')
    .select('engagement_threshold_pct, min_posts_for_trigger, monitoring_window_days, prohibited_words, alert_phone, publishing_paused, publishing_paused_reason, publishing_paused_at, is_active')
    .eq('is_active', true)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    engagement_threshold_pct?: number
    min_posts_for_trigger?: number
    monitoring_window_days?: number
    prohibited_words?: string[]
    alert_phone?: string
  }

  const { error } = await supabase.from('guardian_config').update({
    ...body,
    updated_at: new Date().toISOString(),
  }).eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

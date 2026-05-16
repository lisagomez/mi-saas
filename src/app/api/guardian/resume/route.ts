import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabase.from('guardian_config').update({
    publishing_paused: false,
    publishing_paused_reason: null,
    publishing_paused_at: null,
    updated_at: new Date().toISOString(),
  }).eq('is_active', true)

  // Acknowledge all open alerts
  await supabase.from('guardian_alerts')
    .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
    .eq('acknowledged', false)

  return NextResponse.json({ success: true, message: 'Publicación reanudada.' })
}

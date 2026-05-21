import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const post_id = req.nextUrl.searchParams.get('post_id')
  if (!post_id) return NextResponse.json({ error: 'post_id requerido' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: pieces, error } = await supabase
    .from('content_pieces')
    .select('id, post_id, format, tipo, red_social, body, token_cost_usd, audit_score, created_at')
    .eq('post_id', post_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error cargando piezas' }, { status: 500 })

  return NextResponse.json({ pieces: pieces ?? [] })
}

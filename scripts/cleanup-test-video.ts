/**
 * Limpieza one-shot del test de video que quedó a medias.
 * Borra: lead/order/video creados, archivos en order-photos/ y songs/.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}
loadEnv(join(process.cwd(), '.env.local'))

const ORDER_ID = '94fb1805-ba29-479f-8477-c316b9a439c6'
const TEST_ID = 'test-1777635176712'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: order } = await supabase.from('orders').select('lead_id').eq('id', ORDER_ID).maybeSingle()
  const leadId = (order as { lead_id: string } | null)?.lead_id

  const v = await supabase.from('videos').delete().eq('order_id', ORDER_ID)
  console.log('videos delete:', v.error?.message ?? 'ok')

  const o = await supabase.from('orders').delete().eq('id', ORDER_ID)
  console.log('order delete:', o.error?.message ?? 'ok')

  if (leadId) {
    const l = await supabase.from('leads').delete().eq('id', leadId)
    console.log('lead delete:', l.error?.message ?? 'ok')
  } else {
    console.log('lead skip (no order found)')
  }

  for (const bucket of ['order-photos', 'songs'] as const) {
    const { data: files } = await supabase.storage.from(bucket).list(TEST_ID)
    if (files?.length) {
      const paths = files.map((f) => `${TEST_ID}/${f.name}`)
      const { error } = await supabase.storage.from(bucket).remove(paths)
      console.log(`${bucket} remove ${paths.length}:`, error?.message ?? 'ok')
    } else {
      console.log(`${bucket}: nothing to remove`)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) })

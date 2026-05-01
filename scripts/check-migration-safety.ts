/**
 * Pre-flight: confirma que las 2 migraciones pendientes son aplicables sin error.
 * - 20260429000000_order_photos_meta_media_id: solo ADD COLUMN + INDEX (siempre seguro)
 * - 20260429000001_videos_status_entregado: cambia CHECK; falla si hay rows con
 *   status fuera del nuevo enum (pendiente, recopilando_fotos, generando, listo,
 *   entregado, fallido).
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

const ALLOWED = new Set([
  'pendiente',
  'recopilando_fotos',
  'generando',
  'listo',
  'entregado',
  'fallido',
])

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  console.log('Migración 1: order_photos.meta_media_id')
  const { count: photoCount, error: photoErr } = await supabase
    .from('order_photos').select('*', { count: 'exact', head: true })
  if (photoErr) console.warn('  warn:', photoErr.message)
  console.log(`  rows existentes: ${photoCount ?? 'n/a'} — ADD COLUMN es siempre seguro`)

  console.log('\nMigración 2: videos status_check (entregado)')
  const { data: videos, error: vErr } = await supabase
    .from('videos').select('id, status')
  if (vErr) {
    console.error('  ERROR:', vErr.message)
    process.exit(1)
  }
  const total = videos?.length ?? 0
  const offending = (videos ?? []).filter((v) => !ALLOWED.has((v as { status: string }).status))
  console.log(`  rows totales: ${total}`)
  if (offending.length === 0) {
    console.log('  ✅ todos los status caen dentro del nuevo enum — seguro aplicar')
  } else {
    console.log(`  ❌ ${offending.length} rows fuera del nuevo enum:`)
    const counts: Record<string, number> = {}
    for (const v of offending) counts[(v as { status: string }).status] = (counts[(v as { status: string }).status] ?? 0) + 1
    for (const [s, n] of Object.entries(counts)) console.log(`     ${s}: ${n}`)
    process.exit(2)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })

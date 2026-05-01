/**
 * Verifica que las 2 migraciones tomaron efecto en el schema.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const t = line.trim(); if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('='); if (eq < 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}
loadEnv(join(process.cwd(), '.env.local'))

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN!
const REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]

async function sql(q: string): Promise<unknown> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  })
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
  return r.json()
}

async function main() {
  const col = await sql(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name='order_photos' AND column_name='meta_media_id'`
  )
  console.log('1. order_photos.meta_media_id:', JSON.stringify(col))

  const idx = await sql(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename='order_photos' AND indexname='uniq_order_photos_meta_media'`
  )
  console.log('2. unique index:', JSON.stringify(idx))

  const chk = await sql(
    `SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c
     JOIN pg_class t ON t.oid=c.conrelid
     WHERE t.relname='videos' AND c.conname='videos_status_check'`
  )
  console.log('3. videos_status_check:', JSON.stringify(chk))
}
main().catch((e) => { console.error(e); process.exit(1) })

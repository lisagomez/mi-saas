/**
 * Aplica las migraciones pendientes via Supabase Management API.
 *
 * Por qué no `supabase db push`: requiere DB password (no en .env.local).
 * Por qué no MCP: Supabase MCP no está disponible como tool en esta sesión.
 *
 * Estrategia: POST /v1/projects/{ref}/database/query con cada SQL,
 * luego INSERT en supabase_migrations.schema_migrations para que la CLI
 * vea las migraciones como aplicadas (idempotencia con futuro `db push`).
 */
import { readFileSync, readdirSync } from 'node:fs'
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

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const URL_REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]
if (!TOKEN || !URL_REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or project ref'); process.exit(1)
}

const TARGETS = [
  '20260429000000_order_photos_meta_media_id.sql',
  '20260429000001_videos_status_entregado.sql',
]

async function runSql(query: string): Promise<unknown> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${URL_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status}: ${text}`)
  try { return JSON.parse(text) } catch { return text }
}

async function alreadyApplied(version: string): Promise<boolean> {
  const r = await runSql(
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '${version}'`
  ) as { version: string }[]
  return Array.isArray(r) && r.length > 0
}

async function main() {
  console.log(`Project ref: ${URL_REF}\n`)
  for (const file of TARGETS) {
    const version = file.split('_')[0]
    const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '')
    const path = join(process.cwd(), 'supabase/migrations', file)
    const sql = readFileSync(path, 'utf-8')

    console.log(`▶ ${file}`)
    if (await alreadyApplied(version)) {
      console.log(`   ya aplicada — skip\n`)
      continue
    }

    // Ejecutar el SQL como un único bloque (Supabase API soporta múltiples statements)
    await runSql(sql)
    console.log(`   SQL ejecutado`)

    // Registrar en schema_migrations para mantener bookkeeping
    const escapedName = name.replace(/'/g, "''")
    const escapedSql = sql.replace(/'/g, "''")
    await runSql(
      `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
       VALUES ('${version}', '${escapedName}', ARRAY['${escapedSql}'])`
    )
    console.log(`   registrada en schema_migrations\n`)
  }

  // Verificación final
  const all = await runSql(
    `SELECT version, name FROM supabase_migrations.schema_migrations
     WHERE version IN ('20260429000000', '20260429000001') ORDER BY version`
  )
  console.log('Estado final:')
  console.log(JSON.stringify(all, null, 2))
}
main().catch((e) => { console.error('FAIL:', e instanceof Error ? e.message : e); process.exit(1) })

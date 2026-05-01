/**
 * Test standalone del nuevo pipeline de video con ffmpeg.
 * Sube fotos + audio de test-assets/video/ a Supabase Storage,
 * dispara generateVideo() y copia el resultado a test-assets/video/output.mp4.
 *
 * Uso: npx tsx scripts/test-video-generation.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFile, readdir, copyFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch (err) {
    console.warn(`No pude cargar ${path}:`, err instanceof Error ? err.message : err)
  }
}
loadEnvFile(join(process.cwd(), '.env.local'))

const ASSETS_DIR = join(process.cwd(), 'test-assets/video')
const TEST_ID = `test-${Date.now()}`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function uploadPhotos(): Promise<string[]> {
  const files = (await readdir(ASSETS_DIR))
    .filter((f) => /^photo-\d+\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort()
  if (files.length === 0) throw new Error('No photos found in test-assets/video/')
  console.log(`📸 Subiendo ${files.length} fotos...`)
  const paths: string[] = []
  for (const filename of files) {
    const buffer = await readFile(join(ASSETS_DIR, filename))
    const path = `${TEST_ID}/${filename}`
    const { error } = await supabase.storage
      .from('order-photos')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
    if (error) throw new Error(`Upload ${filename} failed: ${error.message}`)
    paths.push(path)
  }
  return paths
}

async function uploadAudio(): Promise<string> {
  console.log('🎵 Subiendo audio...')
  const buffer = await readFile(join(ASSETS_DIR, 'audio.mp3'))
  const path = `${TEST_ID}/audio.mp3`
  const { error } = await supabase.storage
    .from('songs')
    .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`Upload audio failed: ${error.message}`)
  const { data } = supabase.storage.from('songs').getPublicUrl(path)
  return data.publicUrl
}

async function createFakeOrder(): Promise<string> {
  // Crear lead → order → video temporales para que generateVideo() pueda
  // hacer el UPDATE por order_id en su flujo normal.
  console.log('🧪 Creando lead/order/video de prueba...')
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .insert({ phone: `test-${Date.now()}` } as never)
    .select('id')
    .single()
  if (leadErr || !lead) throw new Error(`No pude crear lead: ${leadErr?.message ?? 'unknown'}`)

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      lead_id: (lead as { id: string }).id,
      status: 'generando_video',
      story_text: 'historia de prueba',
      musical_style: 'norteño',
    } as never)
    .select('id')
    .single()
  if (orderErr || !order) throw new Error(`No pude crear order: ${orderErr?.message ?? 'unknown'}`)

  const orderId = (order as { id: string }).id

  await supabase
    .from('videos')
    .insert({
      order_id: orderId,
      status: 'generando',
      photo_count: 10,
    } as never)

  return orderId
}

async function cleanupOrder(orderId: string): Promise<void> {
  // Cascadea por FK (orders → videos via order_id)
  const { data: order } = await supabase.from('orders').select('lead_id').eq('id', orderId).single()
  if (order) {
    await supabase.from('videos').delete().eq('order_id', orderId)
    await supabase.from('orders').delete().eq('id', orderId)
    await supabase.from('leads').delete().eq('id', (order as { lead_id: string }).lead_id)
  }
}

async function main() {
  console.log(`🧪 Test ID: ${TEST_ID}\n`)

  const photoPaths = await uploadPhotos()
  const audioUrl = await uploadAudio()
  const orderId = await createFakeOrder()
  console.log(`   Order ID: ${orderId}`)
  console.log(`   Audio: ${audioUrl}\n`)

  try {
    // Importar el servicio real (ahora con ffmpeg)
    const { generateVideo } = await import('../src/features/video-generation/services/generate-video')
    const { buildVideoStylePrompt } = await import('../src/features/video-generation/prompts/video-style-prompt')

    const style = buildVideoStylePrompt({
      musicalStyle: 'norteño',
      lyricsText: 'historia de amor familia',
    })

    console.log('🎬 Generando video con ffmpeg local (esto toma 30-90s)...\n')
    const t0 = Date.now()
    const { localPath } = await generateVideo({
      orderId,
      photoStoragePaths: photoPaths,
      audioPublicUrl: audioUrl,
      style,
    })
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

    const outDest = join(ASSETS_DIR, 'output.mp4')
    await copyFile(localPath, outDest)

    const { stat } = await import('node:fs/promises')
    const { size } = await stat(outDest)

    console.log(`\n✅ Video generado en ${elapsed}s`)
    console.log(`   Path: ${outDest}`)
    console.log(`   Tamaño: ${(size / 1024 / 1024).toFixed(2)} MB`)
  } finally {
    await cleanupOrder(orderId).catch((e) => console.warn('Cleanup warn:', e))
  }
}

main().catch((err) => {
  console.error('\n❌ Error:', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})

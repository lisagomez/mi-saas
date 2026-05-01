import { createAdminClient } from '@/lib/supabase/admin'
import { execFile } from 'node:child_process'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import type { VideoPromptResult } from '../prompts/video-style-prompt'

const exec = promisify(execFile)

const VIDEO_WIDTH = 1280
const VIDEO_HEIGHT = 720
const VIDEO_FPS = 30
const MIN_PHOTO_DURATION = 3
const MAX_PHOTO_DURATION = 6
const FADE_SECONDS = 0.4

if (!ffmpegPath) throw new Error('ffmpeg-static binary not found')

/**
 * Genera un video slideshow combinando fotos + audio con ffmpeg local.
 *
 * Estrategia: dos pasadas
 *   1. Render slideshow base (silente) con N fotos × duración calculada,
 *      fade-in/out entre cada segmento, escala uniforme con padding negro.
 *   2. Loopea el slideshow para llenar la duración del audio y mezcla MP3.
 *
 * La duración por foto se ajusta a la canción: clamp(audioDur / N, 3s, 6s).
 * Si el audio es más largo que N × MAX_DURATION, el slideshow hace loop.
 */
export async function generateVideo(params: {
  orderId: string
  photoStoragePaths: string[]
  audioPublicUrl: string
  style: VideoPromptResult
}): Promise<{ videoUrl: string; replicateId: string; localPath: string }> {
  const { orderId, photoStoragePaths, audioPublicUrl, style } = params
  const supabase = createAdminClient()

  if (photoStoragePaths.length === 0) throw new Error('No photos provided')

  // Workspace temporal
  const workDir = join(tmpdir(), `video-${orderId}-${Date.now()}`)
  await mkdir(workDir, { recursive: true })

  try {
    // 1. Descargar audio
    const audioPath = join(workDir, 'audio.mp3')
    const audioBuf = await fetchBuffer(audioPublicUrl, 'audio')
    await writeFile(audioPath, audioBuf)

    // 2. Descargar fotos desde Storage privado
    const photoPaths: string[] = []
    for (let i = 0; i < photoStoragePaths.length; i++) {
      const { data, error } = await supabase.storage.from('order-photos').download(photoStoragePaths[i])
      if (error || !data) throw new Error(`Photo download failed (${photoStoragePaths[i]}): ${error?.message}`)
      const buf = Buffer.from(await data.arrayBuffer())
      const localPath = join(workDir, `photo-${String(i).padStart(3, '0')}.jpg`)
      await writeFile(localPath, buf)
      photoPaths.push(localPath)
    }

    // 3. Sondear duración del audio
    const audioDuration = await probeAudioDuration(audioPath)
    if (audioDuration <= 0) throw new Error('Invalid audio duration')

    // 4. Calcular pacing
    const idealPerPhoto = audioDuration / photoPaths.length
    const photoDuration = Math.min(MAX_PHOTO_DURATION, Math.max(MIN_PHOTO_DURATION, idealPerPhoto))

    // 5. Pasada 1: render slideshow base (silente, una iteración del set de fotos)
    const basePath = join(workDir, 'base.mp4')
    await renderSlideshowBase({
      photoPaths,
      photoDuration,
      outputPath: basePath,
      colorFilter: style.colorFilter,
    })

    // 6. Pasada 2: loop + mux audio
    const finalPath = join(workDir, 'output.mp4')
    await loopAndMux({
      basePath,
      audioPath,
      outputPath: finalPath,
      audioDuration,
    })

    // 7. Persistir replicate_id como id de generación local (auditoría)
    const generationId = `ffmpeg-${Date.now()}`
    await supabase
      .from('videos')
      .update({ replicate_id: generationId, updated_at: new Date().toISOString() } as never)
      .eq('order_id', orderId)

    // El consumidor espera `videoUrl` que apunta a un archivo descargable.
    // Devolvemos un file:// path local; storeVideo se encarga de subirlo.
    return { videoUrl: `file://${finalPath}`, replicateId: generationId, localPath: finalPath }
  } catch (err) {
    // Limpieza en error
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}

async function fetchBuffer(url: string, label: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label} fetch failed (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

async function probeAudioDuration(audioPath: string): Promise<number> {
  // ffmpeg-static viene con ffmpeg pero no ffprobe; usamos ffmpeg con -f null
  // y leemos la duración del stderr.
  const { stderr } = await exec(ffmpegPath!, ['-i', audioPath, '-f', 'null', '-'], { maxBuffer: 10 * 1024 * 1024 }).catch((e: Error & { stderr?: string }) => ({ stderr: e.stderr ?? '' }))
  const match = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(stderr ?? '')
  if (!match) throw new Error('No pude leer duración del audio')
  const [, h, m, s] = match
  return Number(h) * 3600 + Number(m) * 60 + Number(s)
}

async function renderSlideshowBase(params: {
  photoPaths: string[]
  photoDuration: number
  outputPath: string
  colorFilter: string | null
}): Promise<void> {
  const { photoPaths, photoDuration, outputPath } = params
  const N = photoPaths.length

  // Inputs: cada foto como still loop con duración fija
  const inputs: string[] = []
  for (const p of photoPaths) {
    inputs.push('-loop', '1', '-t', String(photoDuration), '-i', p)
  }

  // Por foto: copia de la imagen como fondo (escala-fill + blur) + foreground
  // (scale-fit) compuestos via overlay. Resuelve el pillarbox en fotos verticales:
  // en vez de barras negras, fondo desenfocado de la propia foto.
  // Ken Burns: zoompan progresivo (1.0 → 1.09) sobre el resultado para movimiento sutil.
  const photoFilters = Array.from({ length: N }, (_, i) =>
    `[${i}:v]fps=${VIDEO_FPS},split=2[a${i}][b${i}];` +
    `[a${i}]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},boxblur=20:1,setsar=1[bg${i}];` +
    `[b${i}]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,setsar=1[fg${i}];` +
    `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,format=yuv420p,zoompan=z='min(1+0.0005*on,1.09)':d=1:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${VIDEO_FPS}[v${i}]`
  )

  // Transiciones entre fotos: xfade (crossfade real). Antes usábamos fade-out
  // seguido de fade-in en concat → flash negro entre cada foto. xfade superpone
  // los dos clips durante FADE_SECONDS y elimina el flash.
  const transitions: string[] = []
  if (N === 1) {
    transitions.push('[v0]null[out]')
  } else {
    let prev = '[v0]'
    for (let i = 1; i < N; i++) {
      const offset = (i * (photoDuration - FADE_SECONDS)).toFixed(2)
      const out = i === N - 1 ? '[out]' : `[xf${i}]`
      transitions.push(`${prev}[v${i}]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${offset}${out}`)
      prev = `[xf${i}]`
    }
  }

  const filterComplex = [...photoFilters, ...transitions].join(';')

  await exec(
    ffmpegPath!,
    [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-r', String(VIDEO_FPS),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', outputPath,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  )
}

async function loopAndMux(params: {
  basePath: string
  audioPath: string
  outputPath: string
  audioDuration: number
}): Promise<void> {
  const { basePath, audioPath, outputPath, audioDuration } = params

  // -stream_loop -1 repite el slideshow indefinidamente; -shortest lo corta a la
  // duración del audio. El video se re-encoda solo si hace falta (-c:v copy es
  // posible con stream_loop pero no garantiza alineación de frames a audio).
  await exec(
    ffmpegPath!,
    [
      '-stream_loop', '-1',
      '-i', basePath,
      '-i', audioPath,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-t', String(audioDuration.toFixed(2)),
      '-movflags', '+faststart',
      '-y', outputPath,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  )
}

// Helper público para que store-video lea el archivo local generado por ffmpeg
export async function readLocalVideoBuffer(localPath: string): Promise<Buffer> {
  return readFile(localPath)
}

// Helper público para limpieza tras el upload
export async function cleanupVideoWorkspace(localPath: string): Promise<void> {
  try {
    const dir = localPath.replace(/\/output\.mp4$/, '')
    await rm(dir, { recursive: true, force: true })
  } catch {
    /* noop */
  }
}

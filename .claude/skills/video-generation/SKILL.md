---
name: video-generation
description: |
  Pipeline de video personalizado para CancioBot: fotos WhatsApp → slideshow ffmpeg → YouTube unlisted.
  Cubre arquitectura, servicios, anti-patrones validados en producción, debugging y extensión.
  Triggers: video, fotos, slideshow, youtube, ffmpeg, genera video, video personalizado,
  pipeline video, store-photo, upload-to-youtube, generate-video.
allowed-tools: Read, Write, Edit, Bash, Glob, mcp__supabase__execute_sql, mcp__supabase__apply_migration
---

# Video Generation — Pipeline CancioBot

Pipeline que transforma las fotos enviadas por WhatsApp en un video slideshow con
la canción personalizada del cliente, lo sube a YouTube (unlisted) y lo entrega
via WhatsApp tras confirmar pago.

## Flujo Completo

```
WhatsApp foto x N
    ↓ storePhoto() — dedup por meta_media_id, normaliza HEIC→JPEG
    ↓ (N fotos acumuladas, status = recopilando_fotos)
    ↓ generateAndDeliverVideo() [ejecutado en after() — no bloquea webhook]
        ├── generateVideo()     → ffmpeg slideshow base + loop+mux
        ├── storeVideo()        → Supabase Storage backup + Buffer reutilizable
        ├── uploadToYouTube()   → YouTube resumable upload (unlisted)
        ├── videos.status = 'listo', orders.status = 'video_listo'
        └── WhatsApp: "tu video está listo, aquí los datos de pago"

Admin confirma pago (dashboard)
    ↓ confirmVideoPayment() — Server Action
        ├── videos.status = 'entregado', payment_status = 'confirmado'
        ├── orders.status = 'entregado'
        └── WhatsApp: enlace YouTube al cliente
```

## Servicios — Archivos Clave

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| `storePhoto` | `services/store-photo.ts` | Dedup, download Meta CDN, normalizar HEIC→JPEG, subir Storage |
| `generateVideo` | `services/generate-video.ts` | Render ffmpeg (blur-bg + xfade + zoompan), dos pasadas |
| `generateAndDeliverVideo` | `services/generate-and-deliver-video.ts` | Orquestador del pipeline completo |
| `storeVideo` | `services/store-video.ts` | Backup Storage + Buffer reutilizable |
| `uploadToYouTube` | `services/upload-to-youtube.ts` | YouTube resumable upload |
| `confirmVideoPayment` | `services/confirm-video-payment.ts` | Server Action: confirmar pago + entregar enlace |

## Arquitectura ffmpeg — Dos Pasadas

### Pasada 1: `renderSlideshowBase()`

Genera el slideshow base (silente). Para cada foto aplica este filter_complex:

```
[i:v]fps=30,split=2[ai][bi];
[ai]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=20:1,setsar=1[bgi];
[bi]scale=1280:720:force_original_aspect_ratio=decrease,setsar=1[fgi];
[bgi][fgi]overlay=(W-w)/2:(H-h)/2,format=yuv420p,
  zoompan=z='min(1+0.0005*on,1.09)':d=1:s=1280x720:fps=30[vi]
```

Luego encadena transiciones xfade entre fotos:

```
[v0][v1]xfade=transition=fade:duration=0.4:offset=5.6[xf1];
[xf1][v2]xfade=transition=fade:duration=0.4:offset=11.2[xf2];
...último → [out]
```

**Pacing:** `photoDuration = clamp(audioDuration / N, 3s, 6s)`

### Pasada 2: `loopAndMux()`

Loop del slideshow base hasta la duración del audio y mezcla el MP3:

```bash
ffmpeg -stream_loop -1 -i base.mp4 -i audio.mp3 \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 128k \
  -t {audioDuration} -movflags +faststart output.mp4
```

## Patrones Críticos (Validados en Producción)

### Blur-BG Composite (fotos verticales)

**Problema:** Fotos verticales (portrait) generan barras negras (pillarbox) con `pad=black`.

**Solución:** `split → bg(scale-fill + blur) + fg(scale-fit) → overlay`

```typescript
// bg: escala hasta cubrir y hace blur (rellena el frame con la propia foto desenfocada)
`[ai]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=20:1[bgi]`
// fg: escala para caber (letterbox o pillarbox, pero transparente — el bg lo tapa)
`[bi]scale=${W}:${H}:force_original_aspect_ratio=decrease[fgi]`
// overlay centra fg sobre bg
`[bgi][fgi]overlay=(W-w)/2:(H-h)/2`
```

### xfade (sin flash negro)

**Problema:** `fade=out` + `fade=in` + `concat` → frame negro entre fotos.

**Solución:** xfade superpone los dos clips durante la transición:

```typescript
// offset = i * (photoDuration - FADE_SECONDS) — punto donde empieza el fade
const offset = (i * (photoDuration - FADE_SECONDS)).toFixed(2)
`[prev][vi]xfade=transition=fade:duration=0.4:offset=${offset}[xfi]`
```

### zoompan Ken Burns

**Problema:** Slideshow estático → aspecto de PowerPoint.

**Solución:** zoom progresivo de 1.0 → 1.09 a lo largo del clip:

```
zoompan=z='min(1+0.0005*on,1.09)':d=1:s=${W}x${H}:fps=30
```

- `on` = número de frame, empieza en 0
- `0.0005 * on` → zoom de ~+9% en 180 frames (6s a 30fps)

### YouTube Resumable Upload (> 5 MB)

**Problema:** `uploadType=multipart` falla silenciosamente con videos > 5 MB.

**Flujo correcto:**
```
1. POST /upload/.../videos?uploadType=resumable  →  200 + header Location
2. PUT {Location} con el binario completo         →  200/201 + {id}
```

```typescript
const initRes = await fetch('https://googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'X-Upload-Content-Length': String(totalBytes) },
  body: JSON.stringify(metadata),
})
const uploadUrl = initRes.headers.get('location')  // ← Location header
await fetch(uploadUrl, { method: 'PUT', body: blob })
```

### HEIC Normalization (iOS photos)

iPhones envían fotos en HEIC. La mayoría de decoders esperan JPEG.

```typescript
const jpegBuffer = await sharp(rawBuffer, { failOn: 'none' })
  .rotate()           // auto-rotate por EXIF (corrige fotos giradas)
  .jpeg({ quality: 88, mozjpeg: true })
  .toBuffer()
```

### Idempotencia por meta_media_id

WhatsApp reintenta webhooks → la misma foto puede llegar 2-3 veces.

```typescript
const { data: existing } = await supabase
  .from('order_photos')
  .select('storage_path')
  .eq('order_id', orderId)
  .eq('meta_media_id', mediaId)
  .maybeSingle()

if (existing) return { ...existing, deduplicated: true }
```

Respaldado por índice único en DB:
```sql
CREATE UNIQUE INDEX uniq_order_photos_meta_media
  ON order_photos (order_id, meta_media_id)
  WHERE meta_media_id IS NOT NULL;
```

## Anti-Patrones (No Hacer)

| Anti-patrón | Por qué falla | Alternativa |
|-------------|---------------|-------------|
| `blend=all_mode=overlay` | 17+ min de render, 143 MB output | Eliminar; blur-bg ya da profundidad |
| `pad=width:height:0:0:black` | Barras negras en fotos verticales | blur-bg composite |
| `fade=out` + `fade=in` + concat | Flash negro visible entre fotos | xfade |
| `uploadType=multipart` en YouTube | Falla silencioso > 5 MB | uploadType=resumable |
| 2 UPDATEs secuenciales en confirm | Race condition posible | 1 UPDATE atómico |
| ffprobe para duración | ffmpeg-static no incluye ffprobe | `ffmpeg -f null -` y leer stderr |

## Variables de Entorno Requeridas

```bash
# WhatsApp (para storePhoto)
WHATSAPP_ACCESS_TOKEN=...

# YouTube (para uploadToYouTube)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...

# Supabase (ya presentes)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Base de Datos

### Tablas

| Tabla | Columnas clave | Notas |
|-------|---------------|-------|
| `order_photos` | `order_id`, `storage_path`, `sort_order`, `meta_media_id` | meta_media_id tiene índice único por (order_id, meta_media_id) |
| `videos` | `order_id`, `status`, `payment_status`, `youtube_url`, `video_storage_path`, `replicate_id`, `photo_count`, `error_message` | replicate_id ahora contiene `ffmpeg-{timestamp}` |
| `orders` | `status` | Avanza en paralelo con videos.status |

### Estados

```
orders.status:
  recopilando_fotos → video_listo → video_pago_enviado → entregado

videos.status:
  pendiente → recopilando_fotos → generando → listo → entregado | fallido

videos.payment_status:
  pendiente → confirmado
```

### CHECK Constraint Actual

```sql
CHECK (status IN ('pendiente','recopilando_fotos','generando','listo','entregado','fallido'))
```

Si necesitas agregar un nuevo status, aplica migración:
```sql
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_status_check CHECK (status IN (...nuevo...));
```

## Storage

| Bucket | Contenido | Path |
|--------|-----------|------|
| `order-photos` | Fotos normalizadas a JPEG | `{orderId}/{sortOrder}_{timestamp}.jpg` |
| `videos` | Backup del video final | `{orderId}/{timestamp}.mp4` |

## Scripts de Testing y Operaciones

```bash
# Pre-flight: verificar datos antes de aplicar migración destructiva
npx tsx scripts/check-migration-safety.ts

# Aplicar migraciones sin DB password (usa Supabase Management API)
npx tsx scripts/apply-migrations.ts

# Verificar que migraciones tomaron efecto en schema
npx tsx scripts/verify-migrations.ts

# E2E test: sube 10 fotos + audio, genera video, copia output.mp4
npx tsx scripts/test-video-generation.ts

# Limpiar fixtures de test de la DB/Storage
npx tsx scripts/cleanup-test-video.ts
```

## Debugging

### Video no se genera (status = fallido)

```sql
SELECT id, status, error_message, updated_at
FROM videos WHERE status = 'fallido'
ORDER BY updated_at DESC LIMIT 5;
```

### Fotos duplicadas en order_photos

```sql
SELECT order_id, meta_media_id, COUNT(*) FROM order_photos
GROUP BY order_id, meta_media_id HAVING COUNT(*) > 1;
```

### YouTube token expirado

El `refresh_token` no expira (OAuth2 offline). Si `access_token` falla:
1. Revisar que `YOUTUBE_CLIENT_SECRET` no tenga `\n` al final (usar `printf` no `echo` en Vercel CLI)
2. Revocar y re-autorizar desde Google Console si el refresh_token fue invalidado

### ffmpeg OOM en serverless

- Vercel timeout default: 60s → subir a 300s en `next.config.ts` para el webhook
- Si el video pesa > 500 MB: revisar que `loopAndMux` use `-c:v copy` (no re-encoda el video)
- Workspace temporal en `/tmp` — limpiar con `cleanupVideoWorkspace()` en el `finally`

### Duración de audio incorrecta

`probeAudioDuration()` usa ffmpeg + `Duration:` en stderr. Si el MP3 está corrupto:
```bash
ffmpeg -i audio.mp3 -f null - 2>&1 | grep Duration
```

## Extensión — Cómo Agregar Features

### Nuevo estilo visual (color filter)

1. Editar `prompts/video-style-prompt.ts` — agregar el estilo al switch/map
2. En `renderSlideshowBase()`, `colorFilter` recibe la string del filtro ffmpeg
   (ej. `hue=s=0` para blanco y negro)
3. Insertar antes del `zoompan` en el filter_complex: `...[overlaid],{colorFilter}[vi]`

### Más transiciones xfade

Cambiar `transition=fade` a cualquier valor soportado por ffmpeg:
`circleopen`, `dissolve`, `wipeleft`, `wipetop`, `radial`, `smoothleft`, etc.

```typescript
const TRANSITION = 'circleopen'  // o 'fade'
`xfade=transition=${TRANSITION}:duration=${FADE_SECONDS}:offset=${offset}`
```

### Texto/subtítulos en el video

Agregar filtro `drawtext` después del zoompan:
```
zoompan=...[vz];[vz]drawtext=text='${lyric}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-100[vi]
```

### Notificación automática al admin cuando video está listo

En `generateAndDeliverVideo()`, después de `videos.status = 'listo'`:
```typescript
await notifyAdmin({ orderId, message: 'Video listo — esperando confirmación de pago' })
```

## Checklist al Modificar el Pipeline

- [ ] `ffmpeg-static` instalado en `package.json` (ya está)
- [ ] `sharp` instalado (ya está)
- [ ] Variables de entorno YouTube presentes en Vercel prod
- [ ] `cleanupVideoWorkspace()` en bloque `finally` de cualquier nuevo orquestador
- [ ] Probar con foto portrait (vertical) — verificar que no haya pillarbox negro
- [ ] Probar con foto landscape (horizontal) — verificar centrado
- [ ] Audio > 4 minutos — verificar que el loop funcione (slideshow cubre toda la duración)
- [ ] Verificar que `videos.status_check` incluye cualquier nuevo status que uses

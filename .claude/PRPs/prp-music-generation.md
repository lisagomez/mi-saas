# PRP-003: Integración de Generación Musical

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-17
> **Proyecto**: mi-saas (canciones personalizadas por WhatsApp)

---

## Objetivo

Extender el flujo conversacional del bot de WhatsApp para detectar origen y residencia del cliente durante la conversación, generar un prompt musical personalizado combinando el estilo musical elegido con un catálogo de preferencias regionales, conectar con Suno AI (o Freebeat como alternativa) para generar el audio de la canción a partir de la letra ya existente, guardar el audio en Supabase Storage y entregarlo al cliente por WhatsApp.

---

## Por Qué

| Problema | Solución |
|----------|----------|
| El producto actual solo entrega la letra como texto, lo cual es percibido como incompleto y de bajo valor frente a competidores que entregan audio | Generar el audio real de la canción usando Suno AI/Freebeat para entregar un producto completo |
| La letra se genera con un prompt genérico de "estilo musical" sin considerar matices regionales (ej: banda norteña de Sinaloa vs. banda de CDMX) | Detectar origen/residencia del cliente y cruzarlo con un catálogo de preferencias regionales para enriquecer el prompt musical |
| `deliverSong` solo envía texto, con un comentario TODO sobre audio que nunca se implementó | Implementar el envío real de audio por WhatsApp Cloud API usando `type: audio` |

**Valor de negocio**: Diferenciación crítica del producto — pasar de "te mando la letra" a "te mando tu canción lista para escuchar" justifica el precio, reduce fricciones y aumenta la tasa de cierre y de recomendación boca a boca.

---

## Qué

### Criterios de Éxito

- [ ] El bot detecta y persiste `origin` (ciudad/región de origen) y `residence` (donde vive actualmente) del cliente durante la conversación de recopilación de historia, sin preguntas extra explícitas (se extrae del contexto)
- [ ] Al generar la letra, el prompt incluye directivas musicales regionales según el cruce `estilo + origen/residencia` usando el catálogo definido
- [ ] La integración con Suno AI (endpoint `/api/generate`) recibe `prompt` + `lyrics` y devuelve una URL de audio
- [ ] El audio descargado desde Suno se sube a Supabase Storage en el bucket `songs` con path `{orderId}/{songId}.mp3`
- [ ] El cliente recibe el audio por WhatsApp usando `type: audio` de la Cloud API
- [ ] El campo `audio_url` queda persistido en la tabla `songs` para el dashboard
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado (Happy Path)

1. **Detección silenciosa**: Mientras el cliente cuenta su historia en `recopilando_historia`, el bot extrae `origin` y `residence` con un llamado lightweight de IA (`generateObject`) y los persiste en `leads`. No interrumpe el flujo.
2. **Enriquecimiento del prompt**: Al llegar a `recopilando_estilo`, el sistema cruza el estilo elegido con el catálogo regional. Ejemplo: cliente de Sinaloa que pide "banda" → el prompt incluye "banda sinaloense con tuba, acordeón norteño, tempo 140bpm".
3. **Generación de letra (ya existente)**: Sin cambios, `generateLyrics` sigue igual pero ahora recibe `musicalPrompt` enriquecido además del `musicalStyle`.
4. **Generación de audio**: Después de guardar la letra, se llama a Suno AI con `{ prompt: musicalPrompt, lyrics: lyricsText }`. Si falla → fallback graceful (se entrega solo la letra con mensaje de disculpa).
5. **Almacenamiento**: El audio (MP3/OGG) se descarga desde la URL temporal de Suno y se sube a Supabase Storage. La URL pública se persiste en `songs.audio_url`.
6. **Entrega**: `deliverSong` se actualiza para enviar primero el audio por WhatsApp (`type: audio, link: audioUrl`) y luego la letra como texto. El estado del order pasa a `entregado`.

---

## Contexto

### Referencias

- `src/app/api/webhooks/whatsapp/route.ts` — Orquestador principal; aquí vive `handleQualifiedLead` donde se integra la detección de origen/residencia y se dispara la generación de audio
- `src/features/orders/services/generate-lyrics.ts` — Patrón a seguir para crear `generate-audio.ts`; misma estructura: llama API externa → persiste en DB → registra uso
- `src/features/orders/services/deliver-song.ts` — Función a actualizar para enviar audio + letra; actualmente solo texto con comentario `V2: Agregar envío de audio`
- `src/features/whatsapp-bot/services/send-whatsapp-message.ts` — Agregar `sendWhatsAppAudio(to, audioUrl)` siguiendo el mismo patrón de `sendWhatsAppText`
- `src/features/whatsapp-bot/qualifier/services/run-qualifier.ts` — Patrón `generateObject` a reusar para el extractor de origen/residencia
- `src/features/orders/prompts/lyrics-prompt.ts` — Actualizar `buildLyricsPrompt` para incluir el prompt musical regional
- `src/types/database.ts` — Agregar `audio_url`, `music_prompt`, `origin`, `residence` a los tipos
- `supabase/migrations/20260316000003_orders_and_songs.sql` — Referencia de estructura actual de `songs` y `orders`

### Arquitectura Propuesta (Feature-First)

```
src/features/orders/
├── services/
│   ├── generate-lyrics.ts      (existente — modificar para recibir musicalPrompt)
│   ├── generate-audio.ts       (NUEVO — llama Suno AI, sube a Storage)
│   ├── deliver-song.ts         (existente — modificar para enviar audio)
│   └── store-audio.ts          (NUEVO — descarga MP3 de Suno, sube a Supabase Storage)
├── prompts/
│   ├── lyrics-prompt.ts        (existente — modificar para incluir contexto regional)
│   └── music-prompt.ts         (NUEVO — catálogo regional + builder de prompt Suno)
└── types/
    └── suno.ts                 (NUEVO — tipos de respuesta Suno AI)

src/features/whatsapp-bot/
├── conversation/
│   └── services/
│       └── extract-location.ts (NUEVO — detecta origin/residence del texto de historia)
└── services/
    └── send-whatsapp-message.ts (existente — agregar sendWhatsAppAudio)
```

### Modelo de Datos

```sql
-- Migración: agregar campos a leads (origin, residence detectados)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS origin VARCHAR(100),
  ADD COLUMN IF NOT EXISTS residence VARCHAR(100);

-- Migración: agregar audio_url y music_prompt a songs
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS music_prompt TEXT;
```

**Tipos TypeScript a actualizar** (`src/types/database.ts`):

```typescript
// Lead: agregar
origin: string | null
residence: string | null

// Song: agregar
audio_url: string | null
music_prompt: string | null
```

**Supabase Storage**: Crear bucket `songs` (privado, acceso via signed URL o público dependiendo del modelo de negocio). Path: `{orderId}/{songId}.mp3`.

### Catálogo Regional (src/features/orders/prompts/music-prompt.ts)

El catálogo mapea `{ region, style } → directives` con al menos:

| Región | Estilo | Directivas musicales |
|--------|--------|----------------------|
| Sinaloa / Sonora | Banda | "banda sinaloense, tuba prominente, acordeón, tempo 130-145 BPM" |
| Jalisco / Michoacán | Mariachi | "mariachi tradicional, trompetas, guitarrón, 3/4 o 2/4" |
| Noreste (NL, Tamps, Coah) | Norteño | "norteño, bajo sexto, acordeón, polka rhythm" |
| Nacional | Reggaeton | "reggaeton, dembow beat, trap 808, 90-95 BPM" |
| Nacional / Internacional | Pop | "pop balada, piano, cuerdas, emotivo" |
| Veracruz / Tabasco | Cumbia | "cumbia tropical, marimba, bajo eléctrico" |
| *Fallback (sin datos)* | *Cualquiera* | Solo el estilo declarado por el cliente, sin adornos regionales |

### Integración Suno AI

Suno tiene una API no oficial documentada en la comunidad. El endpoint de generación acepta:

```
POST https://api.suno.ai/api/generate
Headers: { Cookie: "session=..." } o token Bearer según versión
Body: {
  prompt: string,          // prompt musical (genre, mood, instruments)
  lyrics: string,          // letra completa
  make_instrumental: false,
  wait_audio: true         // esperar hasta que el audio esté listo (bloquea ~30-60s)
}
Response: [{
  id: string,
  audio_url: string,       // URL temporal (expira en ~24h)
  ...
}]
```

**Variable de entorno requerida**: `SUNO_API_KEY` o `SUNO_COOKIE`.

**Freebeat como alternativa**: Si Suno no está disponible o `SUNO_API_KEY` no está configurado, el sistema debe hacer fallback a entregar solo la letra con un mensaje apropiado al cliente. Freebeat se puede integrar en una fase posterior como `FREEBEAT_API_KEY`.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Detección de Origen y Residencia

**Objetivo**: El bot extrae `origin` y `residence` del texto de historia del cliente usando `generateObject` (mismo patrón que `run-qualifier.ts`), los persiste en `leads`, y los hace disponibles para el enriquecimiento del prompt musical.

**Validación**: Al llegar a estado `recopilando_estilo`, el lead tiene `origin` y `residence` en la DB (pueden ser `null` si no se mencionaron, lo cual es válido).

### Fase 2: Catálogo Regional y Enriquecimiento del Prompt Musical

**Objetivo**: Crear `music-prompt.ts` con el catálogo regional y la función `buildMusicPrompt(style, origin, residence)` que devuelve las directivas musicales enriquecidas. Actualizar `buildLyricsPrompt` para incluir el contexto regional en la generación de letra.

**Validación**: Test manual: llamar `buildMusicPrompt('banda', 'Culiacán', 'Culiacán')` devuelve string con directivas de banda sinaloense. TypeCheck pasa.

### Fase 3: Migración de Base de Datos

**Objetivo**: Crear y aplicar migración SQL que agrega `origin`, `residence` a `leads` y `audio_url`, `music_prompt` a `songs`. Actualizar tipos TypeScript en `database.ts`. Crear bucket `songs` en Supabase Storage.

**Validación**: `npm run typecheck` pasa. Columnas visibles en Supabase dashboard. Bucket `songs` existe.

### Fase 4: Servicio de Generación de Audio (Suno AI)

**Objetivo**: Crear `generate-audio.ts` que llama a la API de Suno AI con el prompt musical y la letra, maneja timeouts y errores, y retorna `{ audioUrl, sunoId }` o lanza error para fallback. Crear `store-audio.ts` que descarga el MP3 desde la URL de Suno y lo sube a Supabase Storage, retornando la URL persistente.

**Validación**: Con `SUNO_API_KEY` configurado, llamada a `generateAudio({ musicPrompt, lyricsText })` retorna una URL de audio válida. Sin clave, falla con error descriptivo.

### Fase 5: Envío de Audio por WhatsApp

**Objetivo**: Agregar `sendWhatsAppAudio(to, audioUrl)` en `send-whatsapp-message.ts` usando `type: audio` de WhatsApp Cloud API. Actualizar `deliverSong` para enviar audio antes de la letra cuando `audioUrl` está disponible.

**Validación**: El cliente recibe el mensaje de audio reproducible en WhatsApp (verificar con número real o mock).

### Fase 6: Orquestación Asíncrona en el Webhook

**Objetivo**: Integrar con `after()` de `next/server`. El webhook responde a WhatsApp inmediatamente después de enviar la letra + solicitud de pago. `after()` ejecuta la generación de audio en background: Suno → Storage → envía audio al cliente como mensaje adicional de WhatsApp. Si Suno falla, el cliente ya tiene su letra y no nota el error.

**Flujo**:
1. Webhook genera letra → envía letra al cliente → envía solicitud de pago → retorna 200 a Meta
2. `after()`: genera audio → sube a Storage → envía WhatsApp audio al cliente ("¡Aquí está tu preview! 🎵")

**Validación**: El webhook retorna antes de que Suno termine. El cliente recibe la letra + solicitud de pago de inmediato y el audio llega minutos después. TypeCheck pasa.

### Fase 7: Validación Final

**Objetivo**: Sistema funcionando end-to-end, tipos correctos, build limpio.

**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma flujo en dashboard (si aplica)
- [ ] Criterios de éxito del PRP cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

*(Sin aprendizajes aún — se documenta durante la implementación)*

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] La API de Suno AI es no oficial y puede cambiar. La implementación debe ser aislada en `generate-audio.ts` para facilitar el swap por Freebeat u otra alternativa sin tocar la orquestación.
- [ ] `wait_audio: true` en Suno puede tardar 30-60 segundos. El webhook de WhatsApp tiene timeout de ~20s. Evaluar si se necesita un job asíncrono (con Supabase Edge Functions o un webhook interno) en lugar de esperar síncronamente.
- [ ] WhatsApp Cloud API para enviar audio requiere una URL HTTPS accesible públicamente. La URL de Supabase Storage pública cumple esto; una URL de Suno temporal también, pero expira.
- [ ] La detección de origen/residencia con `generateObject` añade latencia adicional en `recopilando_historia`. Debe ejecutarse de forma no bloqueante (fire-and-forget con try/catch) para no retrasar la respuesta al cliente.
- [ ] Supabase Storage bucket `songs` debe existir antes de que la migración de código se despliegue. Crear el bucket manualmente o via `supabase storage create` como parte de la Fase 3.
- [ ] El campo `UNIQUE(lead_id)` en `orders` limita a un pedido activo por lead (V1). Si se genera audio fallido, no hay mecanismo de reintento automático. Documentar en el dashboard cómo reintentar manualmente.
- [ ] Si `origin`/`residence` son null (cliente no los mencionó), `buildMusicPrompt` debe funcionar con solo el estilo declarado. El fallback es obligatorio, no opcional.

## Anti-Patrones

- NO llamar a Suno AI síncronamente si el timeout del webhook es inferior al tiempo de generación de Suno — analizar en Fase 4 si se necesita cola asíncrona
- NO guardar la URL temporal de Suno directamente en la DB — siempre descargar y subir a Supabase Storage primero
- NO exponer `SUNO_API_KEY` o `SUNO_COOKIE` en código cliente — solo server-side en `generate-audio.ts`
- NO crear nuevos patrones de IA si `generateObject` de `run-qualifier.ts` ya funciona para extracción estructurada
- NO ignorar errores de TypeScript al extender los tipos de `database.ts`
- NO omitir el fallback graceful — si Suno falla, el cliente igual debe recibir su letra

---

*PRP pendiente aprobación. No se ha modificado código.*

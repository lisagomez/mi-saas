# PRP-006: Generación de Video Personalizado con IA

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-18
> **Proyecto**: mi-saas (canciones personalizadas)

---

## Objetivo

Permitir que el cliente suba fotos por WhatsApp después de confirmar el pago; el sistema combina esas fotos con el audio de la canción generada usando IA de video (Replicate / RunwayML), sube el video resultante a YouTube y envía el enlace al cliente por WhatsApp.

## Por Qué

| Problema | Solución |
|----------|----------|
| El cliente recibe solo audio — producto percibido como genérico | Video personalizado con sus fotos eleva la percepción de valor del regalo |
| El equipo creativo debe editar videos manualmente (costoso, lento) | Pipeline 100% automatizado: fotos + audio → video → YouTube → WhatsApp |
| No hay diferenciador claro frente a competidores que venden MP3 | Video compartible en redes sociales convierte al cliente en embajador orgánico |

**Valor de negocio**: Incremento de precio ticket (~50%), reducción de trabajo manual del creativo, y generación de contenido viral orgánico cada entrega.

## Qué

### Criterios de Éxito
- [ ] Al entregar la canción, el bot ofrece el video personalizado con precio visible
- [ ] El cliente puede aceptar o rechazar el add-on de video
- [ ] Si acepta, el bot pide fotos de inmediato (sin pago previo)
- [ ] El cliente puede enviar fotos (1–10) por WhatsApp en estado `recopilando_fotos`
- [ ] El pipeline genera el video con las fotos + audio de la canción
- [ ] El video se sube a YouTube y el bot notifica al cliente con el enlace **y** los datos de pago
- [ ] Admin confirma pago del video desde el dashboard (panel separado del pago de canción)
- [ ] Solo cuando admin confirma pago → orden pasa a `entregado`
- [ ] El dashboard del creativo muestra el estado del video (generando / listo / fallido)
- [ ] El dashboard financiero muestra precio del video y pago confirmado por separado
- [ ] Si el pipeline falla, el sistema entrega solo el audio (fallback graceful — comportamiento actual)

### Pricing del Video

| Concepto | Detalle |
|----------|---------|
| Precio configurable | `VIDEO_PRICE_USD` en env vars o tabla `budgets` (categoría `video_addon`) |
| `videos.price` | Se graba al momento de la oferta (auditoría de precios históricos) |
| `videos.payment_status` | `pendiente` → `comprobante_enviado` → `confirmado` |
| `videos.payment_proof_url` | Storage path del comprobante de pago |
| Momento del cobro | **Después de que el cliente ve el video terminado** |

### Comportamiento Esperado (Happy Path)

1. **Bot entrega canción** → ofrece video personalizado con precio: *"¿Quieres un video con tus fotos y la canción? Solo $X USD"*
2. **Cliente acepta** → estado `recopilando_fotos` → bot pide fotos inmediatamente
3. **Cliente rechaza** → estado `video_rechazado` → orden pasa directo a `entregado`
4. **Cliente envía fotos** (1–10 imágenes) → webhook las descarga y sube a Storage (`order-photos/{orderId}/`)
5. **Bot confirma recepción** y avisa que el video está en producción → estado `generando_video`
6. **Pipeline se dispara** en `after()`:
   - Descarga fotos desde Storage
   - Descarga audio desde Storage (`songs/{orderId}/{songId}.mp3`)
   - Llama a Replicate (modelo slideshow + música)
   - Sube video a YouTube (unlisted)
   - Guarda `youtube_url` en tabla `videos` → estado `video_listo`
7. **Bot avisa al cliente que el video está listo** + envía datos de pago: *"¡Tu video está listo! Realiza tu pago de $X para recibirlo: [datos]"* — **el enlace NO se envía aún**
8. **Cliente envía comprobante** → estado `video_pago_enviado`
9. **Admin confirma pago** en dashboard → estado `video_pago_confirmado`
10. **Bot envía enlace de YouTube** al cliente y orden pasa a `entregado`

---

## Contexto

### Referencias

- `src/features/orders/services/store-audio.ts` — patrón para descargar archivo externo y subir a Supabase Storage (reusar exacto)
- `src/features/orders/services/generate-and-send-audio.ts` — patrón `after()` para pipeline background con fallo silencioso
- `src/features/orders/services/deliver-song.ts` — patrón de entrega final por WhatsApp
- `src/app/api/webhooks/whatsapp/route.ts` — manejo de `imageMediaId` para imágenes entrantes (ya implementado para comprobante de pago)
- `src/features/whatsapp-bot/services/send-whatsapp-message.ts` — `sendWhatsAppText` y `sendWhatsAppAudio`
- `src/types/database.ts` — modelo de datos de `Order`, `Song`, `OrderStatus`
- `supabase/migrations/20260317100000_music_generation.sql` — patrón de Storage bucket público
- Replicate API: `https://replicate.com/docs/reference/http`
- YouTube Data API v3: `https://developers.google.com/youtube/v3/docs/videos/insert`

### Arquitectura Propuesta (Feature-First)

```
src/features/video-generation/
├── components/
│   └── video-status-badge.tsx        # Badge de estado para dashboard creativo
├── services/
│   ├── store-photo.ts                # Descarga foto de Meta y sube a Storage
│   ├── generate-video.ts             # Llama a Replicate para generar video slideshow
│   ├── upload-to-youtube.ts          # Sube video a YouTube Data API v3
│   └── generate-and-deliver-video.ts # Orquestador (patrón igual que generate-and-send-audio)
└── types/
    └── replicate.ts                  # Tipos de respuesta de Replicate
```

**Cambios en features existentes:**

```
src/features/whatsapp-bot/constants/copy.ts
  + buildVideoOfferMessage(price: number)              # "¿Quieres un video con tus fotos? $X USD"
  + VIDEO_REJECTED_MESSAGE                             # "¡Está bien! Ya tienes tu canción"
  + ASK_PHOTOS_MESSAGE                                 # "Envíame tus fotos (máx 10)"
  + PHOTOS_RECEIVED_MESSAGE                            # "¡Recibidas! Generando tu video..."
  + buildVideoReadyMessage(price: number)              # "¡Tu video está listo! Paga $X para recibirlo" (sin enlace)
  + buildVideoDeliveryMessage(youtubeUrl)              # Enlace YouTube — se envía SOLO tras confirmar pago
  + VIDEO_PAYMENT_CONFIRMED_MESSAGE                    # "¡Pago confirmado! Aquí está tu video 🎬"

src/app/api/webhooks/whatsapp/route.ts
  + Nuevo estado 'recopilando_fotos' en handleQualifiedLead
  + Soporte para recibir múltiples imágenes en estado pago_confirmado

src/features/dashboard/components/creativo-view.tsx
  + Columna / badge de estado de video en lista de órdenes
```

### Modelo de Datos

```sql
-- Tabla de videos generados
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN (
      'pendiente',          -- esperando respuesta del cliente
      'ofertado',           -- bot ofreció el video, esperando respuesta
      'rechazado',          -- cliente rechazó el add-on
      'video_pago_pendiente',     -- cliente aceptó, esperando comprobante
      'video_pago_enviado',       -- comprobante recibido, admin debe verificar
      'video_pago_confirmado',    -- admin confirmó pago del video
      'recopilando_fotos',        -- esperando fotos del cliente
      'generando',                -- Replicate procesando
      'listo',                    -- video en YouTube listo
      'fallido'                   -- error en pipeline
    )),
  price DECIMAL(10, 2),              -- Precio cobrado al momento de la oferta (USD)
  payment_status VARCHAR(20) DEFAULT 'pendiente'
    CHECK (payment_status IN ('pendiente', 'comprobante_enviado', 'confirmado')),
  payment_proof_url TEXT,            -- Storage path del comprobante de pago
  replicate_id TEXT,                 -- ID del job en Replicate para polling
  video_storage_path TEXT,           -- Path en Supabase Storage (backup)
  youtube_url TEXT,                  -- URL pública final
  photo_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access videos"
  ON public.videos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read videos"
  ON public.videos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo')
    )
  );

-- Fotos del cliente por orden
CREATE TABLE public.order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,         -- Path en Supabase Storage
  public_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access order_photos"
  ON public.order_photos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Nuevo estado en orders
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'recopilando_historia',
    'recopilando_estilo',
    'generando_letra',
    'letra_generada',
    'pago_pendiente',
    'pago_confirmado',
    'recopilando_fotos',         -- cliente aceptó video, enviando fotos
    'generando_video',           -- pipeline Replicate en curso
    'video_listo',               -- video en YouTube, esperando pago
    'video_pago_enviado',        -- cliente envió comprobante del video
    'video_pago_confirmado',     -- admin confirmó pago del video
    'video_rechazado',           -- cliente rechazó el add-on
    'entregado',
    'requiere_procesamiento_manual'
  ));

-- Storage bucket para fotos (privado — acceso via service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos',
  'order-photos',
  false,
  10485760, -- 10MB por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Storage bucket para videos generados (público para YouTube backup)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  524288000, -- 500MB max por video
  ARRAY['video/mp4', 'video/webm']
) ON CONFLICT (id) DO NOTHING;
```

**Variables de entorno nuevas necesarias:**
```
REPLICATE_API_TOKEN=        # Token de Replicate
YOUTUBE_CLIENT_ID=          # OAuth2 de Google Cloud Console
YOUTUBE_CLIENT_SECRET=      # OAuth2
YOUTUBE_REFRESH_TOKEN=      # Token de refresh del canal destino
YOUTUBE_CHANNEL_ID=         # Canal donde se suben los videos (privados)
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migración de Base de Datos
**Objetivo**: Tabla `videos` (con campos `price`, `payment_status`, `payment_proof_url`) y `order_photos`, nuevos estados en `orders` (incluye `video_ofertado`, `video_pago_pendiente`, `video_pago_confirmado`), y buckets de Storage listos en Supabase
**Validación**: `npm run typecheck` pasa; tipos en `database.ts` reflejan las nuevas tablas y estados

### Fase 2: Oferta y Recolección de Fotos por WhatsApp
**Objetivo**: Tras entregar la canción, el bot ofrece el video con precio. Si acepta → estado `recopilando_fotos`, bot pide fotos. Si rechaza → `video_rechazado` → `entregado`. El webhook detecta imágenes en estado `recopilando_fotos`, las descarga de Meta Media API y las sube a Storage (`order-photos/{orderId}/`). Al llegar a 10 fotos o cuando el cliente confirma, el bot avisa que el video está en producción.
**Validación**: Flujo oferta → aceptación → envío de foto → aparece en Supabase Storage; flujo rechazo → orden en `entregado`

### Fase 3: Notificación del Video Listo + Cobro
**Objetivo**: Al terminar el pipeline (Fase 5), el bot avisa al cliente que el video está listo y envía datos de pago — **sin el enlace**. Webhook detecta comprobante en estado `video_listo` → `video_pago_enviado`. Dashboard admin/pagos muestra panel para confirmar pago del video. Al confirmar → bot envía enlace de YouTube → `entregado`
**Validación**: Screenshot Playwright muestra panel de confirmación; DB transiciona correctamente; enlace solo se envía tras confirmación de pago

### Fase 4: Recepción de Fotos via WhatsApp (parte de Fase 2)
*(Integrado en Fase 2 — no es una fase separada)*

### Fase 5: Pipeline de Generación de Video (Replicate)
**Objetivo**: Servicio `generate-video.ts` que toma lista de URLs de fotos + URL de audio y genera video slideshow usando Replicate. Maneja polling de estado del job. Retorna URL del video generado
**Validación**: Test con fotos de prueba retorna video MP4 descargable

### Fase 6: Upload a YouTube
**Objetivo**: Servicio `upload-to-youtube.ts` que toma el video generado y lo sube al canal del negocio como `unlisted` (no indexado, pero con enlace directo). Retorna `youtube_url`
**Validación**: Video aparece en YouTube Studio del canal con el título correcto

### Fase 7: Orquestador y Entrega al Cliente
**Objetivo**: Servicio `generate-and-deliver-video.ts` que orquesta Fases 5 y 6 en `after()`. Actualiza estado en `videos` tabla. Envía enlace de YouTube al cliente por WhatsApp. Marca orden como `entregado`
**Validación**: Cliente recibe mensaje de WhatsApp con URL de YouTube funcional; orden en DB tiene status `entregado`

### Fase 8: Dashboard del Creativo y Financiero
**Objetivo**:
- `creativo-view.tsx`: badge de estado del video (`recopilando_fotos` / `generando` / `listo` / `fallido`) por orden
- `admin-view.tsx`: panel "Videos pendientes de pago" — órdenes en `video_pago_enviado` con botón confirmar
- `financiero-view.tsx`: columna "Video" con precio cotizado y estado del pago (separado del pago de canción)
**Validación**: Screenshot de Playwright muestra badges, panel de confirmación y columna de precio

### Fase 9: Validación Final
**Objetivo**: Sistema funcionando end-to-end con fallback graceful
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma UI del dashboard con badges y columna de precio
- [ ] Flujo completo: oferta → aceptación → fotos → generación → YouTube → notificación con pago → comprobante → confirmación admin → `entregado`
- [ ] Flujo rechazo: cliente rechaza → orden a `entregado` directo, sin video en DB
- [ ] Fallback: si Replicate falla, cliente recibe audio (comportamiento anterior preservado)
- [ ] Órdenes antiguas (`entregado` sin video) no rompen el dashboard

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] **Precio del video configurable** — no hardcodear. Leer de `VIDEO_PRICE_USD` en env vars o de tabla `budgets` (categoría `video_addon`). El precio se graba en `videos.price` al momento de la oferta para auditoría. El cobro ocurre **después** de que el cliente ve el video terminado — no bloquear la generación por falta de pago previo
- [ ] **El enlace de YouTube se envía SOLO tras confirmar pago** — el video existe en YouTube (unlisted) pero el cliente no recibe la URL hasta que admin confirma el pago. El `youtube_url` vive en la DB, nunca en el mensaje previo al pago
- [ ] **Meta Media API requiere descarga autenticada** — las imágenes de WhatsApp no son URLs públicas; necesitan `GET /media/{mediaId}` con Bearer token para obtener URL temporal, luego un segundo fetch para descargar el binario
- [ ] **Replicate puede tardar 2-5 minutos** — usar `after()` igual que generate-audio; nunca bloquear el webhook
- [ ] **YouTube OAuth2 necesita Refresh Token pre-generado** — el canal del negocio debe autorizar offline una sola vez; el refresh token se rota automáticamente. Documentar el proceso de obtención en el PRP
- [ ] **Videos de YouTube `unlisted`** — no aparecen en búsquedas, pero cualquiera con el enlace puede verlos. Adecuado para entrega personalizada
- [ ] **Supabase Storage para fotos es privado** — las URLs firmadas expiran; generar URLs firmadas de larga duración (1 año) o descargar binarios antes de pasarlos a Replicate
- [ ] **Límite de 10 fotos** — validar en el webhook; al llegar a 10 disparar el pipeline automáticamente sin esperar más imágenes
- [ ] **Formato HEIC** — iPhones envían HEIC; Meta lo puede convertir a JPEG pero verificar el `mime_type` antes de subir a Storage
- [ ] **Estado `recopilando_fotos` vs timeout** — si el cliente no manda fotos en 24h, el creativo debe poder disparar el pipeline manualmente desde el dashboard (scope V2, pero no romper la arquitectura)

## Anti-Patrones

- NO guardar URLs temporales de Replicate en la DB — siempre subir a Storage primero
- NO bloquear el webhook esperando generación de video — siempre usar `after()`
- NO exponer credentials de YouTube en el código — usar variables de entorno
- NO ignorar errores de TypeScript
- NO hardcodear el modelo de Replicate — usar constante en `lib/ai/` para facilitar swap futuro
- NO omitir fallback: si video falla, la orden debe entregarse igual (solo audio)

---

*PRP pendiente aprobación. No se ha modificado código.*

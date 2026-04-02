# PRP-010: Sistema de Storage Management

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-19
> **Proyecto**: CancioBot

---

## Objetivo

Centralizar y gobernar el almacenamiento en Supabase Storage con buckets organizados por tipo de archivo, RLS consistente, control de capacidad configurable por bucket, limpieza automática de archivos de pedidos terminados/cancelados, y un panel de monitoreo visible en el dashboard del administrador.

## Por Qué

| Problema | Solución |
|----------|----------|
| Los buckets (`songs`, `order-photos`, `videos`, `payment-proofs`) crecen indefinidamente sin control | Límites configurables por bucket + alertas en dashboard |
| Archivos huérfanos de pedidos cancelados/antiguos consumen espacio de forma silenciosa | Job de limpieza automática con criterios configurables |
| No hay visibilidad del uso de storage desde el dashboard | Panel de monitoreo con uso actual, límites y actividad reciente |
| La RLS de storage no está documentada ni unificada; cada bucket puede tener políticas distintas | Definición explícita y consistente de políticas RLS por bucket |

**Valor de negocio**: Reducción de costos de infraestructura Supabase, protección contra crecimiento descontrolado, y visibilidad operativa del storage para el administrador sin necesidad de entrar a la consola de Supabase.

## Qué

### Criterios de Éxito
- [ ] Los 4 buckets tienen RLS explícita: `songs` y `order-photos` públicos (lectura), `payment-proofs` y `videos` privados (solo admin/service role)
- [ ] Existe una tabla `storage_config` que almacena el límite máximo por bucket (configurable desde el dashboard)
- [ ] Un endpoint/cron limpia archivos de pedidos con status `entregado` > N días o `video_rechazado` según reglas configurables
- [ ] El panel de monitoreo en el dashboard del administrador muestra: uso actual por bucket (MB), límite configurado, % de uso, y listado de archivos huérfanos detectados
- [ ] Al superar el 80% del límite de un bucket, el dashboard muestra una alerta visual

### Comportamiento Esperado

**Happy Path — Monitoreo diario del administrador:**
1. Admin entra al dashboard (`/dashboard`) y ve la nueva sección "Storage" dentro de `AdminView`
2. Ve tarjetas por bucket: `songs`, `order-photos`, `videos`, `payment-proofs` con uso en MB, límite y barra de progreso
3. Puede editar el límite de cada bucket desde el propio panel (se guarda en `storage_config`)
4. Si algún bucket supera el 80% → aparece badge rojo de alerta
5. Ve el listado de archivos huérfanos detectados (pedidos eliminados/cancelados)
6. Con un botón "Limpiar ahora" puede disparar la limpieza manual o dejar que el cron nocturno lo ejecute

**Happy Path — Limpieza automática (cron):**
1. Cron diario llama a `/api/storage/cleanup` (protegido con `CRON_SECRET`)
2. Busca pedidos con status `video_rechazado` o `entregado` con `updated_at` > umbral de días (configurable en `storage_config`)
3. Lista archivos en storage bajo el `order_id` correspondiente en cada bucket y los elimina
4. Registra el resultado en tabla `storage_cleanup_log`

---

## Contexto

### Referencias
- `src/features/orders/services/store-audio.ts` — Patrón de upload a bucket `songs`
- `src/features/video-generation/services/store-photo.ts` — Upload a bucket `order-photos`
- `src/features/video-generation/services/store-video.ts` — Upload a bucket `videos`
- `src/features/orders/services/store-payment-proof.ts` — Upload a bucket `payment-proofs` (privado, signed URL)
- `src/features/dashboard/components/financiero-view.tsx` — Patrón de tarjetas con barra de progreso en dashboard
- `src/app/(main)/dashboard/page.tsx` — Patrón de fetch por rol y renderizado condicional por `role === 'administrador'`
- `src/types/database.ts` — Tipos centralizados; aquí se añadirán `StorageConfig` y `StorageCleanupLog`
- `src/lib/supabase/admin.ts` — Cliente admin usado en todos los servicios de storage

### Buckets Existentes

| Bucket | Tipo | Contenido | Acceso actual (inferido) |
|--------|------|-----------|--------------------------|
| `songs` | público | Audios MP3/OGG/WAV por pedido | `getPublicUrl` — sin signed URL |
| `order-photos` | público | Fotos JPEG/PNG de clientes | `getPublicUrl` implícito |
| `videos` | privado | Videos MP4/WebM generados | Solo `storagePath` en DB |
| `payment-proofs` | privado | Comprobantes de pago | `createSignedUrl` 1h |

### Arquitectura Propuesta (Feature-First)

```
src/features/storage-management/
├── components/
│   ├── StorageMonitorPanel.tsx     # Panel completo para AdminView
│   ├── StorageBucketCard.tsx       # Tarjeta individual por bucket
│   └── StorageCleanupButton.tsx    # Botón de limpieza manual
├── services/
│   ├── get-storage-stats.ts        # Calcula uso real por bucket via admin API
│   ├── get-storage-config.ts       # Lee límites desde storage_config
│   ├── update-storage-config.ts    # Server Action: editar límites
│   ├── run-storage-cleanup.ts      # Lógica de limpieza (reutilizada por cron y UI)
│   └── get-cleanup-log.ts          # Historial de limpiezas
└── types/
    └── storage.ts                  # StorageStats, StorageBucketConfig
```

```
src/app/api/storage/
└── cleanup/
    └── route.ts                    # POST endpoint para cron (CRON_SECRET)
```

### Modelo de Datos

```sql
-- Configuración de límites por bucket
CREATE TABLE storage_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name  TEXT NOT NULL UNIQUE,          -- 'songs' | 'order-photos' | 'videos' | 'payment-proofs'
  limit_mb     INTEGER NOT NULL DEFAULT 500,  -- Límite en MB (configurable)
  cleanup_after_days INTEGER NOT NULL DEFAULT 30, -- Días tras entrega para limpiar
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de limpiezas automáticas
CREATE TABLE storage_cleanup_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_files INTEGER NOT NULL DEFAULT 0,
  freed_mb      NUMERIC(10,2),
  triggered_by  TEXT DEFAULT 'cron',  -- 'cron' | 'manual'
  details       JSONB                 -- { bucket: string, order_id: string, path: string }[]
);

-- RLS: solo servicio/admin puede leer/escribir
ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_cleanup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_storage_config"
  ON storage_config FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "admin_only_cleanup_log"
  ON storage_cleanup_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

```sql
-- Migración: Seed inicial de configuración de buckets
INSERT INTO storage_config (bucket_name, limit_mb, cleanup_after_days) VALUES
  ('songs',          500,  30),
  ('order-photos',   300,  30),
  ('videos',         2000, 30),
  ('payment-proofs', 200,  90);
```

### Uso de Storage API de Supabase

Supabase no expone métricas de uso por bucket via SDK cliente. La estrategia es:
- Listar objetos en cada bucket con `admin.storage.from(bucket).list('', { limit: 1000 })` y sumar `metadata.size`
- Para uso real de producción (>1000 archivos) se puede paginar; en el estado actual del proyecto es suficiente
- Alternativa futura: Supabase Management API con `SUPABASE_SERVICE_KEY` para métricas de proyecto

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migracion de Base de Datos y RLS de Storage
**Objetivo**: Crear tablas `storage_config` y `storage_cleanup_log` con RLS, aplicar políticas de acceso explícitas a los 4 buckets existentes en Supabase, y hacer seed de la configuración inicial.
**Validación**: Las tablas existen en Supabase, el seed insertó 4 filas en `storage_config`, las políticas de bucket son visibles en Supabase Storage console.

### Fase 2: Servicios de Storage Management
**Objetivo**: Implementar los servicios `get-storage-stats`, `get-storage-config`, `update-storage-config`, `run-storage-cleanup` y `get-cleanup-log` en `src/features/storage-management/services/`.
**Validación**: Cada servicio es invocable desde un Server Component sin errores TypeScript (`npm run typecheck` pasa).

### Fase 3: Endpoint Cron de Limpieza
**Objetivo**: Crear `src/app/api/storage/cleanup/route.ts` protegido con `CRON_SECRET`, que invoca `run-storage-cleanup` y registra el resultado en `storage_cleanup_log`.
**Validación**: `curl -X POST http://localhost:3000/api/storage/cleanup -H "Authorization: Bearer $CRON_SECRET"` retorna JSON con `{ deleted_files, freed_mb }` y registra en la tabla.

### Fase 4: Componentes UI del Panel de Monitoreo
**Objetivo**: Construir `StorageBucketCard`, `StorageCleanupButton` y `StorageMonitorPanel` siguiendo el estilo visual de `financiero-view.tsx` (tarjetas blancas, barras de progreso, badges de alerta).
**Validación**: El panel renderiza sin errores con datos mock; barra roja aparece cuando uso > 80%, badge de alerta es visible.

### Fase 5: Integracion en AdminView del Dashboard
**Objetivo**: Agregar fetch de `getStorageStats()` y `getStorageConfig()` en `dashboard/page.tsx` condicionado a `role === 'administrador'` y renderizar `StorageMonitorPanel` dentro de `AdminView`.
**Validación**: El dashboard del administrador muestra la sección de storage con datos reales de Supabase.

### Fase 6: Tipos y Actualizacion de database.ts
**Objetivo**: Agregar interfaces `StorageConfig` y `StorageCleanupLog` a `src/types/database.ts` y extender el tipo `Database` con las nuevas tablas.
**Validación**: `npm run typecheck` pasa sin errores de tipo en ningún archivo del feature.

### Fase 7: Validacion Final
**Objetivo**: Sistema funcionando end-to-end — el admin ve uso real, puede editar límites, disparar limpieza manual y ver el log histórico.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma que el panel de storage aparece en el dashboard del admin
- [ ] El endpoint `/api/storage/cleanup` responde correctamente con `CRON_SECRET`
- [ ] Todos los criterios de éxito cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] Supabase Storage `.list()` pagina a 100 objetos por defecto — usar `{ limit: 1000 }` o paginar para proyectos grandes
- [ ] La Management API de Supabase (métricas de proyecto) requiere `SUPABASE_ACCESS_TOKEN` personal, distinto al `SERVICE_ROLE_KEY`; no usarla — calcular uso listando objetos
- [ ] Los buckets `songs` y `order-photos` son públicos (WhatsApp necesita URL directa sin expiración); no cambiar a privados
- [ ] `payment-proofs` usa signed URLs de 1h — no hay `getPublicUrl` válida; el panel debe generar URL firmada nueva al mostrarlo
- [ ] El cron de Vercel requiere `vercel.json` con `crons` config si se quiere scheduling automático en producción
- [ ] Al eliminar archivos de storage con `admin.storage.from(bucket).remove([path])`, verificar que el `order_id` no tenga pedidos activos antes de borrar

## Anti-Patrones

- NO crear lógica de limpieza inline en el componente UI — toda la lógica va en `run-storage-cleanup.ts`
- NO usar `any` en los tipos de respuesta de la Storage API — tipar con las interfaces de `storage.ts`
- NO hardcodear los umbrales de días o MB — leer siempre de `storage_config`
- NO omitir validación Zod en el Server Action de actualización de límites
- NO exponer el `CRON_SECRET` en el cliente — solo se valida en el Route Handler

---

*PRP pendiente aprobación. No se ha modificado código.*

# PRP: Event Tracker — Intención de Compra por Comportamiento

> **Estado**: COMPLETADO
> **Fecha**: 2026-05-13
> **Proyecto**: CancioBot / mi-saas

---

## Objetivo

Capturar señales de comportamiento (click, dm, save, view, share) vinculadas a estrategias
de contenido específicas, para medir la intención de compra más allá del engagement scrapeado.

## Por Qué

| Problema | Solución |
|----------|----------|
| El engagement (likes/comments) no distingue curiosidad de intención real | Eventos `dm` y `save` son señales de intención 10× más valiosas que un like |
| No se sabe qué post generó qué lead en WhatsApp | `dm` event con `lead_id` + `strategy_id` cierra el loop copy → conversión |
| UTMs no aplican directamente a click-to-WhatsApp | El `source_key` de la campaña actúa como `utm_content`; la función `utmFromWhatsAppSource()` normaliza esto |

**Valor de negocio**: Saber exactamente qué variante de copy genera DMs reales — no solo engagement — permite optimizar presupuesto hacia el copy con mayor retorno.

## Qué

### Criterios de Éxito
- [x] Endpoint `POST /api/events/track` acepta eventos con validación Zod
- [x] Tabla `events` en Supabase con FK a `content_outcomes` y a `leads`
- [x] `v_strategy_scores` muestra conteos de dm/save/click por estrategia
- [x] `trackEvent()` (client) y `trackEventServer()` (server) disponibles
- [x] UTM params capturados; `utmFromWhatsAppSource()` normaliza click-to-WhatsApp
- [x] RLS habilitado (solo lectura para authenticated; escritura vía service_role)

### Comportamiento Esperado

**Flujo automático (webhook WhatsApp → evento dm):**
```
Lead envía mensaje en WhatsApp
  → webhook /api/webhooks/whatsapp detecta lead nuevo
  → llama trackEventServer({ event_type: 'dm', platform: 'whatsapp',
      lead_id: lead.id, ...utmFromWhatsAppSource(lead.source) })
  → events tabla: dm registrado con utm_content = source_key de la campaña
  → v_strategy_scores.dm_count++ para la estrategia vinculada a esa campaña
```

**Flujo manual (dashboard → registrar click en post):**
```typescript
trackEvent({
  strategy_id: '...',   // content_outcomes.id del post
  event_type:  'click',
  platform:    'facebook',
  utm_campaign: 'madres_may_2025',
  metadata: { post_id: '12345', referrer: 'https://facebook.com/...' }
})
```

---

## Contexto

### Archivos creados

```
src/
├── app/api/events/track/route.ts          ← POST endpoint con Zod
└── features/event-tracker/
    └── services/
        └── track-event.ts                 ← trackEvent / trackEventServer / extractUtmFromUrl

.claude/
├── PRPs/prp-event-tracker.md              ← este archivo
└── skills/event-tracker/
    ├── SKILL.md
    └── references/
        └── event-types.md
```

### Tablas involucradas

| Tabla | Relación |
|-------|---------|
| `events` | tabla principal; FK a `content_outcomes` y `leads` |
| `content_outcomes` | la variante de copy/post que originó el evento |
| `facebook_campaigns` | la campaña que distribuyó el contenido |
| `leads` | el lead identificado si el evento vino de WhatsApp |
| `v_strategy_scores` | VIEW que agrega todo: engagement + intent + eventos |

### Schema `events`

```sql
CREATE TABLE events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id   uuid REFERENCES content_outcomes(id) ON DELETE SET NULL,
  event_type    text NOT NULL CHECK (event_type IN ('click','dm','save','view','share')),
  platform      text CHECK (platform IN ('facebook','instagram','tiktok','whatsapp','youtube')),
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  lead_id       uuid REFERENCES leads(id) ON DELETE SET NULL,
  metadata      jsonb DEFAULT '{}' NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL
);
```

---

## Blueprint

### Fase 1: DB + API ✅
- Tabla `events` con índices y RLS
- `POST /api/events/track` con validación Zod

### Fase 2: Utilidades ✅
- `trackEvent()` — cliente, fire-and-forget
- `trackEventServer()` — servidor, admin client directo
- `extractUtmFromUrl()` — parsing de UTMs desde URL
- `utmFromWhatsAppSource()` — normaliza `leads.source` a UTM

### Fase 3: Integración con v_strategy_scores ✅
- VIEW actualizada incluye `dm_count`, `save_count`, `click_count`, `share_count`, `view_count`
- `composite_score` sigue siendo 20% engagement + 80% intent de órdenes
- Eventos son señales complementarias visibles en el dashboard

### Fase 4: Integración opcional con bot WhatsApp (pendiente)
**Objetivo**: Auto-registrar evento `dm` cuando llega un lead nuevo desde campaña conocida
**Cómo**: En `getOrCreateLead()`, si `lead.source.startsWith('fb_')` y es nuevo lead → `trackEventServer({ event_type: 'dm', lead_id: lead.id, ...utmFromWhatsAppSource(lead.source) })`
**Validación**: `SELECT dm_count FROM v_strategy_scores` aumenta cuando llega lead de campaña

---

## Pesos de Intención por Tipo de Evento

| Evento | Señal | Intención estimada |
|--------|-------|-------------------|
| `dm` | Inició conversación en WhatsApp | ★★★★★ (más alta) |
| `share` | Compartió el post | ★★★★ |
| `save` | Guardó el post | ★★★ |
| `click` | Hizo clic en el enlace | ★★ |
| `view` | Vio el post (impresión) | ★ |

> Los pesos exactos se pueden usar para calcular un `event_intent_score` futuro si se necesita
> incorporarlos al `composite_score` de `v_strategy_scores`.

---

## Gotchas

- [ ] `trackEventServer()` usa `import()` dinámico para no importar `@/lib/supabase/admin` en código cliente (evita exponer service_role key en el bundle)
- [ ] Para click-to-WhatsApp, `utm_content` = `source_key` de campaña (no UTM real de URL)
- [ ] Si `strategy_id` es NULL, el evento queda sin atribuir — siempre pasarlo cuando se conoce
- [ ] El endpoint es público (no requiere auth) — Zod valida el shape; UUIDs inválidos son rechazados por la constraint FK de Postgres

## Anti-Patrones

- NO usar `trackEventServer()` en código cliente (importa admin client)
- NO bloquear el flujo del usuario esperando respuesta del track (siempre fire-and-forget)
- NO inventar `strategy_id` — solo pasar UUID de `content_outcomes` real
- NO omitir `platform` — es fundamental para filtrar por red social en el dashboard

---

## Aprendizajes

### 2026-05-13: DROP VIEW requerido para añadir columnas
- **Error**: `CREATE OR REPLACE VIEW` falla si se intenta cambiar el orden de columnas existentes
- **Fix**: `DROP VIEW IF EXISTS` antes del `CREATE VIEW`
- **Aplicar en**: Cualquier modificación de VIEW que añada columnas nuevas


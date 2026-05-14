---
name: event-tracker
description: |
  Registra y consulta eventos de intención de compra (click, dm, save, view, share)
  vinculados a estrategias de contenido en content_outcomes. Usa el endpoint
  /api/events/track para capturar señales desde frontend, webhooks, o el bot de WhatsApp.
  Consulta v_strategy_scores para ver el impacto de cada evento en el score compuesto.
  Usar cuando el usuario diga: "registra un evento", "trackea este click", "evento de dm",
  "cuántos DMs generó esta estrategia", "vincula evento a campaña", "señales de intención",
  "agrega tracking a mi post", "cuántos saves tiene este contenido".
allowed-tools: Read, Bash, mcp__supabase__execute_sql
---

# Event Tracker — Intención de Compra por Comportamiento

> Los likes son vanidad. Los DMs son dinero.
> Este skill convierte señales de comportamiento en datos de estrategia accionables.

---

## Qué se puede hacer

1. **Registrar un evento** — Insertar directamente en Supabase o via API
2. **Consultar eventos por estrategia** — Cuántos clicks/dm/saves tuvo un post
3. **Ver ranking de intención** — `v_strategy_scores` ordena por composite_score
4. **Conectar un evento a un lead** — Cuando el DM viene de WhatsApp

---

## Registrar un evento manualmente (SQL directo)

```sql
INSERT INTO events (strategy_id, event_type, platform, utm_campaign, utm_content, metadata)
VALUES (
  '$content_outcome_id',   -- UUID del post en content_outcomes
  'dm',                     -- click | dm | save | view | share
  'whatsapp',               -- facebook | instagram | tiktok | whatsapp | youtube
  'madres_may_2025',        -- source_key de la campaña (utm equivalente)
  'madres_may',             -- source_key sin prefijo 'fb_'
  '{"referrer": "Facebook Ad #12345"}'::jsonb
);
```

---

## Registrar un evento via API (frontend o webhook externo)

```bash
curl -X POST https://tu-dominio.com/api/events/track \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_id": "uuid-del-post",
    "event_type": "click",
    "platform": "facebook",
    "utm_campaign": "madres_may_2025",
    "utm_content": "carousel_pas_hondurenas",
    "metadata": { "post_id": "123456789", "ad_id": "987" }
  }'
```

**Respuesta exitosa:** `{ "ok": true, "event_id": "uuid" }`

---

## Usar `trackEvent()` desde el frontend (React)

```typescript
import { trackEvent } from '@/features/event-tracker/services/track-event'

// En un onClick handler — fire-and-forget, nunca bloquea
trackEvent({
  strategy_id: contentOutcomeId,
  event_type:  'click',
  platform:    'facebook',
  utm_campaign: 'madres_may_2025',
})
```

---

## Usar `trackEventServer()` desde el servidor (API routes, webhooks)

```typescript
import { trackEventServer, utmFromWhatsAppSource } from '@/features/event-tracker/services/track-event'

// En el webhook de WhatsApp, cuando llega un lead nuevo de una campaña conocida:
await trackEventServer({
  event_type: 'dm',
  platform:   'whatsapp',
  lead_id:    lead.id,
  ...utmFromWhatsAppSource(lead.source),  // 'fb_madres_may' → utm_content='madres_may'
  metadata: { phone_hash: lead.phone.slice(-4) },
})
```

---

## Consultas útiles

### Ver eventos por estrategia
```sql
SELECT event_type, COUNT(*) AS total, DATE(created_at) AS fecha
FROM events
WHERE strategy_id = '$content_outcome_id'
GROUP BY event_type, DATE(created_at)
ORDER BY fecha DESC;
```

### Top estrategias por DMs generados (intención máxima)
```sql
SELECT
  content_outcome_id,
  post_url,
  variant_type,
  campaign_name,
  dm_count,
  save_count,
  click_count,
  composite_score
FROM v_strategy_scores
WHERE dm_count > 0
ORDER BY dm_count DESC, composite_score DESC;
```

### Vincular utm_content con content_outcomes
```sql
-- Buscar qué post corresponde a un utm_content recibido en un evento
SELECT co.id, co.post_url, co.hook_text, fc.source_key
FROM content_outcomes co
JOIN facebook_campaigns fc ON fc.id = co.campaign_id
WHERE fc.source_key = '$utm_content';
```

### Eventos sin strategy_id (sin atribuir)
```sql
SELECT COUNT(*), event_type, utm_campaign
FROM events
WHERE strategy_id IS NULL
GROUP BY event_type, utm_campaign
ORDER BY COUNT(*) DESC;
```

---

## Flujo de atribución completo

```
Facebook Ad corriendo con source_key = 'madres_may_2025'
    ↓
Usuario hace click en el ad → evento 'click' (si hay pixel/tracking externo)
    ↓
Usuario envía DM en WhatsApp → lead creado con source = 'fb_madres_may_2025'
    ↓
trackEventServer({ event_type: 'dm', lead_id, utm_content: 'madres_may_2025' })
    ↓
v_strategy_scores.dm_count++ para el content_outcome vinculado a esa campaña
    ↓
composite_score sube (80% intent de órdenes + 20% engagement scrapeado)
    ↓
Judge identifica esta variante de copy como ganadora → replicar en próxima campaña
```

---

## Tipos de eventos y cuándo registrar cada uno

| Evento | Cuándo | Fuente recomendada |
|--------|--------|-------------------|
| `click` | Usuario hace clic en enlace del post/ad | Pixel de Meta o link de tracking |
| `dm` | Lead nuevo desde campaña conocida llega a WhatsApp | Webhook WhatsApp automático |
| `save` | Usuario guarda el post en Instagram/Facebook | Insights de Meta (manual o API) |
| `view` | Impresión del post (opcional, bajo valor) | Insights de Meta |
| `share` | Usuario comparte el post | Insights de Meta |

---

## Integración automática sugerida con el bot (Fase 4 del PRP)

En `src/features/whatsapp-bot/services/get-or-create-lead.ts`, después de crear un lead nuevo:

```typescript
// Si el lead viene de una campaña conocida, auto-registrar el DM
if (isNew && lead.source.startsWith('fb_')) {
  void trackEventServer({
    event_type: 'dm',
    platform:   'whatsapp',
    lead_id:    lead.id,
    ...utmFromWhatsAppSource(lead.source),
  })
}
```

---

## Ejemplos de invocación

- "Registra un evento de click para el post de Día de Madres"
- "¿Cuántos DMs generó esta estrategia de contenido?"
- "Muéstrame las estrategias ordenadas por intención de compra"
- "Trackea el DM del lead nuevo que llegó de la campaña de mayo"
- "¿Qué post generó más saves esta semana?"

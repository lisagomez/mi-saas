---
name: monitor
description: |
  Visita las URLs de posts publicados usando Playwright MCP, extrae métricas de engagement
  (likes, comentarios, shares, vistas), actualiza content_outcomes en Supabase, y recalcula
  el score de cada estrategia de contenido. Cierra el loop: copy generado → publicado → métricas
  → Judge con datos reales.
  Usar cuando el usuario diga: "monitorea mis posts", "revisa el engagement", "actualiza métricas",
  "escanea mis publicaciones", "cómo va mi contenido", "recalcula scores", "scrape mis posts",
  "feedback de mis publicaciones", "qué resultados tuvo el copy".
allowed-tools: Read, Bash, mcp__supabase__execute_sql, mcp__supabase__apply_migration, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot
---

# Monitor: Feedback Automático de Contenido Publicado

> El copy generado sin medición es fe ciega.
> Este skill convierte publicaciones reales en datos de estrategia.

---

## Arquitectura del Loop Completo

```
content-prompt-gen → copy publicado → Monitor → content_outcomes → Judge
                                         ↑
                              Playwright scrape de URLs
```

---

## Fase 0: Setup — Crear tabla content_outcomes (solo primera vez)

Verificar si la tabla existe:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'content_outcomes'
) AS tabla_existe;
```

Si no existe, aplicar la migration:

```sql
CREATE TABLE IF NOT EXISTS content_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proactive_insight_id uuid REFERENCES proactive_insights(id) ON DELETE SET NULL,
  avatar_id uuid REFERENCES avatars(id) ON DELETE SET NULL,

  -- Identificación del contenido publicado
  variant_type text NOT NULL CHECK (variant_type IN (
    'organic_reel', 'organic_carousel', 'organic_facebook_post',
    'inorganic_facebook_ad', 'inorganic_whatsapp', 'inorganic_retargeting'
  )),
  platform text NOT NULL CHECK (platform IN (
    'facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube'
  )),
  post_url text,
  published_at timestamptz,

  -- Métricas crudas (actualizables)
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  reach_count integer DEFAULT 0,

  -- Score calculado (actualizar manualmente después de scrape)
  engagement_score numeric DEFAULT 0,

  -- Contexto del copy usado
  hook_text text,
  framework_used text CHECK (framework_used IN ('PAS', 'AIDA')),
  copy_summary text,

  -- Tracking de scrape
  last_scraped_at timestamptz,
  scrape_status text DEFAULT 'pending' CHECK (
    scrape_status IN ('pending', 'success', 'failed', 'manual', 'blocked')
  ),
  scrape_notes text,
  raw_scrape_data jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_outcomes_insight
  ON content_outcomes(proactive_insight_id);
CREATE INDEX IF NOT EXISTS idx_content_outcomes_avatar
  ON content_outcomes(avatar_id);
CREATE INDEX IF NOT EXISTS idx_content_outcomes_platform
  ON content_outcomes(platform, variant_type);
CREATE INDEX IF NOT EXISTS idx_content_outcomes_scrape_pending
  ON content_outcomes(scrape_status, last_scraped_at)
  WHERE scrape_status IN ('pending', 'failed');
```

---

## Fase 1: Cargar URLs pendientes de monitoreo

```sql
SELECT
  co.id,
  co.post_url,
  co.platform,
  co.variant_type,
  co.framework_used,
  co.hook_text,
  co.published_at,
  co.scrape_status,
  co.last_scraped_at,
  co.engagement_score,
  pi.title AS insight_title,
  a.name AS avatar_name
FROM content_outcomes co
LEFT JOIN proactive_insights pi ON pi.id = co.proactive_insight_id
LEFT JOIN avatars a ON a.id = co.avatar_id
WHERE co.post_url IS NOT NULL
  AND co.scrape_status IN ('pending', 'failed')
  -- No re-scrape si fue exitoso hace menos de 24h
  AND (co.last_scraped_at IS NULL OR co.last_scraped_at < NOW() - INTERVAL '24 hours')
ORDER BY co.published_at DESC NULLS LAST
LIMIT 20;
```

Si no hay URLs registradas, preguntar al usuario:
```
No encontré posts registrados para monitorear.
¿Quieres agregar una URL ahora? Dame:
- URL del post
- Plataforma (facebook / instagram / tiktok)
- Tipo de contenido (reel / carousel / facebook_post / facebook_ad)
- Fecha de publicación aproximada
- (Opcional) ID del insight proactivo que originó este copy
```

---

## Fase 2: Scrape con Playwright — Por plataforma

Para cada URL en la lista, ejecutar el scraper correspondiente.

### 2A — Facebook (posts orgánicos de página pública)

```
1. Navegar a la URL del post
2. Esperar a que el DOM cargue (1-2s)
3. Tomar snapshot + screenshot
4. Intentar extraer métricas del DOM
```

**Métricas a extraer en Facebook:**
```javascript
// Evaluar en el browser:
({
  reactions: document.querySelector('[aria-label*="reaction"]')?.textContent?.trim() ||
             document.querySelector('[data-testid="UFI2ReactionsCount"]')?.textContent?.trim(),
  comments:  document.querySelector('[aria-label*="comment"]')?.textContent?.trim(),
  shares:    document.querySelector('[aria-label*="share"]')?.textContent?.trim() ||
             document.querySelector('[aria-label*="Share"]')?.textContent?.trim()
})
```

Si el DOM está bloqueado (muro de login), intentar fallback con Open Graph:
```javascript
({
  og_title:       document.querySelector('meta[property="og:title"]')?.content,
  og_description: document.querySelector('meta[property="og:description"]')?.content,
  blocked: !document.querySelector('[role="main"]')
})
```

**Indicadores de bloqueo:**
- Texto "Inicia sesión" o "Log In" en el body
- Redirect a `facebook.com/login`
- El snapshot muestra modal de login

Si bloqueado → `scrape_status = 'blocked'` y continuar con entrada manual (Fase 2D).

### 2B — Instagram

Instagram **siempre requiere login**. No intentar scrape.

```
Para posts de Instagram:
→ scrape_status = 'manual'
→ Mostrar al usuario: "Instagram bloquea scraping automatizado.
  Por favor ingresa manualmente las métricas del post [URL]:
  - Likes: ___
  - Comentarios: ___
  - Guardados: ___
  - Alcance (si lo tienes): ___"
```

### 2C — TikTok (videos públicos)

```javascript
// TikTok muestra métricas en la página pública del video
({
  likes:    document.querySelector('[data-e2e="like-count"]')?.textContent,
  comments: document.querySelector('[data-e2e="comment-count"]')?.textContent,
  shares:   document.querySelector('[data-e2e="share-count"]')?.textContent,
  views:    document.querySelector('[data-e2e="video-views"]')?.textContent
})
```

### 2D — Entrada manual (fallback universal)

Cuando el scrape falla o la plataforma lo requiere:
```
No pude extraer métricas automáticamente de: [URL]
Plataforma: [platform] | Tipo: [variant_type]

¿Puedes ingresar los números del post?
- Likes / Reacciones: ___
- Comentarios: ___
- Shares / Compartidos: ___
- Vistas / Alcance: ___
- Clics en enlace (si aplica): ___

(Escribe 'omitir' para saltar este post)
```

---

## Fase 3: Calcular engagement_score

Fórmula ponderada por plataforma:

**Facebook / Instagram (orgánico):**
```
engagement_score = (
  (likes * 1.0) +
  (comments * 3.0) +   -- comentarios valen más (intención alta)
  (shares * 5.0)       -- shares son el mayor indicador de valor
) / NULLIF(views, 0) * 100

-- Si no hay views, usar reach_count
-- Si no hay reach_count, dejar score como suma absoluta
```

**Facebook Ads (inorgánico):**
```
engagement_score = (clicks / NULLIF(reach, 0)) * 100  -- CTR como proxy
```

**WhatsApp broadcast:**
```
engagement_score = replies / NULLIF(sent_count, 0) * 100
-- El usuario provee este ratio manualmente
```

Actualizar en Supabase:
```sql
UPDATE content_outcomes
SET
  likes_count     = $likes,
  comments_count  = $comments,
  shares_count    = $shares,
  views_count     = $views,
  clicks_count    = $clicks,
  reach_count     = $reach,
  engagement_score = $calculated_score,
  last_scraped_at = NOW(),
  scrape_status   = $status,   -- 'success' | 'manual' | 'blocked'
  scrape_notes    = $notes,
  raw_scrape_data = $raw_json::jsonb,
  updated_at      = NOW()
WHERE id = $outcome_id;
```

---

## Fase 4: Recalcular scores por insight y avatar

Una vez actualizadas las métricas, recalcular qué estrategia funciona mejor.

### Por tipo de variante (¿qué formato gana?)
```sql
SELECT
  co.variant_type,
  co.framework_used,
  AVG(co.engagement_score)   AS avg_score,
  MAX(co.engagement_score)   AS max_score,
  COUNT(*)                   AS sample_size,
  co.avatar_id,
  a.name                     AS avatar_name
FROM content_outcomes co
JOIN avatars a ON a.id = co.avatar_id
WHERE co.scrape_status IN ('success', 'manual')
  AND co.engagement_score > 0
GROUP BY co.variant_type, co.framework_used, co.avatar_id, a.name
ORDER BY avg_score DESC;
```

### Por insight (¿qué insight generó mejor contenido?)
```sql
SELECT
  pi.title                   AS insight_title,
  pi.insight_type,
  MAX(co.engagement_score)   AS best_score,
  AVG(co.engagement_score)   AS avg_score,
  COUNT(*)                   AS variants_published
FROM content_outcomes co
JOIN proactive_insights pi ON pi.id = co.proactive_insight_id
WHERE co.scrape_status IN ('success', 'manual')
GROUP BY pi.id, pi.title, pi.insight_type
ORDER BY best_score DESC
LIMIT 10;
```

### Identificar ganadores (top 20%)
```sql
WITH scores AS (
  SELECT
    id,
    variant_type,
    framework_used,
    engagement_score,
    PERCENT_RANK() OVER (
      PARTITION BY platform, variant_type
      ORDER BY engagement_score
    ) AS percentile
  FROM content_outcomes
  WHERE scrape_status IN ('success', 'manual')
    AND engagement_score > 0
)
SELECT * FROM scores WHERE percentile >= 0.80
ORDER BY engagement_score DESC;
```

---

## Fase 5: Actualizar proactive_insights con resultado

Si un insight tiene variantes con engagement_score en top 20%:
```sql
UPDATE proactive_insights
SET
  status = 'validated',
  confidence = CASE
    WHEN $max_score > 5 THEN 'high'
    WHEN $max_score > 2 THEN 'medium'
    ELSE 'low'
  END
WHERE id = $insight_id;
```

Si todas las variantes tienen score bajo (< 0.5%):
```sql
UPDATE proactive_insights
SET status = 'revisión', confidence = 'low'
WHERE id = $insight_id;
```

---

## Fase 6: Reporte al usuario

Mostrar en este formato:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 REPORTE DE ENGAGEMENT — [fecha]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Posts monitoreados: [N]
  ✅ Scrapeados automáticamente: [N]
  ✍️  Ingresados manualmente: [N]
  🔒 Bloqueados (requieren manual): [N]

─────────────────────────────────────
🏆 FORMATOS QUE MEJOR FUNCIONAN
─────────────────────────────────────

1. [variant_type] — Promedio: [score]%
   Muestra: [N] posts | Mejor: [max_score]%

2. [variant_type] — Promedio: [score]%
   Muestra: [N] posts | Mejor: [max_score]%

─────────────────────────────────────
🔥 POST CON MEJOR PERFORMANCE
─────────────────────────────────────

URL: [post_url]
Hook: "[hook_text]"
Framework: [PAS/AIDA] | Tipo: [variant_type]
Engagement: [score]% | [likes]❤️ [comments]💬 [shares]🔁

─────────────────────────────────────
💡 RECOMENDACIONES
─────────────────────────────────────

[Basado en los datos, qué formato priorizar,
 qué insight_type genera más engagement,
 qué framework funciona mejor para este avatar]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Agregar URL manualmente (registro inicial)

Si el usuario quiere registrar un post publicado que aún no está en la tabla:

```sql
INSERT INTO content_outcomes (
  proactive_insight_id,
  avatar_id,
  variant_type,
  platform,
  post_url,
  published_at,
  hook_text,
  framework_used,
  copy_summary,
  scrape_status
) VALUES (
  $insight_id,    -- NULL si no viene de un insight proactivo
  $avatar_id,     -- NULL si no está mapeado
  $variant_type,  -- 'organic_reel' | 'organic_carousel' | ...
  $platform,      -- 'facebook' | 'instagram' | ...
  $post_url,
  $published_at,
  $hook_text,
  $framework_used,
  $copy_summary,
  'pending'
);
```

---

## Ejecución periódica (opcional)

Para correr automáticamente cada 24h, usar `pg_cron` en Supabase:

```sql
-- Ejecutar diariamente a las 9am (hora del servidor)
SELECT cron.schedule(
  'monitor-content-outcomes',
  '0 9 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.settings.site_url') || '/api/monitor/run',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')),
    body := '{}'::jsonb
  ) $$
);
```

O invocar manualmente cuando el usuario lo pida desde el dashboard.

---

## Reglas de scraping ético

| Regla | Detalle |
|-------|---------|
| Rate limiting | Esperar 2-3s entre requests (no banear IP) |
| No bypassear login | Si pide auth, pasar a manual — nunca simular login |
| Solo URLs propias | El usuario confirma que son sus posts antes de scrape |
| Respetar robots.txt | Si la plataforma bloquea, no insistir |
| Fallback siempre | Si scrape falla, manual entry — nunca datos inventados |

---

## Ejemplos de invocación

- "Monitorea mis posts publicados"
- "¿Cómo va el engagement de mis publicaciones?"
- "Actualiza las métricas de mis redes"
- "Recalcula los scores de mis estrategias"
- "Registra este post: [URL] es un reel de Facebook"
- "¿Qué formato de contenido me funciona mejor?"
- "Scrape mis publicaciones de la semana"

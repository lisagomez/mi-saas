---
name: content-prompt-gen
description: |
  Toma un insight proactivo (de proactive_insights o texto manual) y el perfil del avatar,
  y genera copy listo para pegar usando frameworks AIDA (inorgánico/conversión) y PAS
  (orgánico/engagement). Produce 2 bloques por formato: texto completo + versión corta.
  Usar cuando el usuario diga: "genera contenido del insight", "crea copy del avatar",
  "prompts de contenido", "generador de prompts", "copy para ads", "copy orgánico",
  "contenido del insight proactivo", "genera el anuncio", "haz el copy", "contenido para redes".
allowed-tools: Read, Bash, mcp__supabase__execute_sql
---

# Content Prompt Generator

> Un insight sin copy es un hallazgo muerto.
> Este skill convierte divergencias de la biblioteca de avatares en contenido listo para publicar.

---

## Fase 1: Cargar el insight

### Opción A — Desde `proactive_insights` (automático)

```sql
SELECT
  pi.id,
  pi.insight_type,
  pi.title,
  pi.body,
  pi.confidence,
  a.name          AS avatar_name,
  a.origin,
  a.residence,
  a.profile_json
FROM proactive_insights pi
JOIN avatars a ON a.id = pi.avatar_id
WHERE pi.status = 'pending'
ORDER BY pi.created_at DESC
LIMIT 5;
```

Mostrar la lista al usuario y preguntar: "¿Para cuál de estos insights genero el copy?"

### Opción B — Insight manual

Si el usuario pega el texto directamente, usar ese contenido como `pi.body`.
Preguntar: "¿Para qué avatar es este insight?" y cargar el perfil correspondiente.

---

## Fase 2: Cargar contexto completo del avatar

```sql
SELECT
  ai.insight_type,
  ai.content,
  ai.evidence_url
FROM avatar_insights ai
WHERE ai.avatar_id = $avatar_id
  AND ai.id NOT IN (
    SELECT parent_insight_id FROM avatar_insights
    WHERE parent_insight_id IS NOT NULL
  )
ORDER BY ai.insight_type;
```

También recuperar directives del catálogo:
```sql
SELECT directives
FROM preferences_catalog
WHERE is_active = true
  AND (
    $origin = ANY(regions)
    OR $residence = ANY(regions)
    OR array_length(regions, 1) = 0
  )
ORDER BY sort_order
LIMIT 1;
```

Con esto construyes el **perfil completo** para el LLM:
```
Avatar: {name}
Origen: {origin} | Residencia: {residence}
Estilo musical: {musical_style}
Motivadores: {top_motivators}
Barreras: {top_barriers}
Gancho recomendado: {recommended_hook}
Directives del catálogo: {directives}
Insight a trabajar: {pi.body}
Tipo de insight: {pi.insight_type}
```

---

## Fase 3: Generar copy con IA

Usar `generateText` + `JSON.parse` manual vía OpenRouter.
**Nunca usar `generateObject`** (no compatible con OpenRouter).

Leer el template en: `.claude/skills/ai/references/single-call.md`

**Modelo recomendado:** `google/gemini-2.0-flash-001`

---

### Prompt para contenido ORGÁNICO — Framework PAS

```
Eres un copywriter especialista en marketing para migrantes latinos en EE.UU.
Tu tono: cálido, directo, en español mexicano coloquial. Sin anglicismos forzados.

AVATAR:
{perfil_completo}

INSIGHT A TRABAJAR:
{pi.body}

FRAMEWORK: PAS (Problem → Agitation → Solution)

Genera copy orgánico para engagement. El objetivo es que comenten, compartan y guarden.
NO es venta directa. Es identificación emocional.

Responde SOLO con JSON válido:
{
  "formato_reel": {
    "hook": "Primera línea que para el scroll (máx 8 palabras)",
    "script": "Guión completo del Reel, máx 45 segundos de lectura",
    "cta": "Llamado a comentar o compartir (NO a comprar)",
    "hashtags": ["#tag1", "#tag2"]
  },
  "formato_carousel": {
    "slide_1": "Portada — el problema en una frase",
    "slides_desarrollo": ["slide 2", "slide 3", "slide 4"],
    "slide_cierre": "Slide final con solución + CTA suave",
    "caption": "Texto del post, máx 150 palabras"
  },
  "formato_facebook_post": {
    "apertura": "Primera línea (el problema nombrado)",
    "desarrollo": "Agitación + solución en 3-4 párrafos cortos",
    "cta": "Pregunta que invite a comentar"
  }
}
```

---

### Prompt para contenido INORGÁNICO — Framework AIDA

```
Eres un especialista en Facebook Ads para negocios latinos en EE.UU.
Objetivo: conversión directa. Cada palabra debe empujar al clic.

AVATAR:
{perfil_completo}

INSIGHT A TRABAJAR:
{pi.body}

FRAMEWORK: AIDA (Attention → Interest → Desire → Action)

Genera copy de paga optimizado para conversión. Directo, urgente, emocional.

Responde SOLO con JSON válido:
{
  "facebook_ad": {
    "headline": "Título del anuncio (máx 40 caracteres)",
    "primary_text": "Texto principal del ad (máx 125 caracteres para preview completo)",
    "primary_text_long": "Versión completa sin límite de caracteres",
    "descripcion": "Descripción bajo el headline (máx 30 caracteres)",
    "cta_button": "SHOP_NOW | LEARN_MORE | SIGN_UP | CONTACT_US | GET_QUOTE",
    "variante_urgencia": "Misma estructura con elemento de escasez o tiempo"
  },
  "whatsapp_broadcast": {
    "apertura": "Primera línea que no parece spam (máx 60 caracteres)",
    "cuerpo": "Mensaje completo, máx 200 palabras, con emojis estratégicos",
    "cta": "Link o instrucción de respuesta"
  },
  "retargeting_ad": {
    "headline": "Para quien ya vio pero no compró",
    "primary_text": "Supera la objeción principal del avatar",
    "cta_button": "Botón sugerido"
  }
}
```

---

## Fase 4: Formatear output al usuario

Mostrar los resultados en bloques copy-paste listos. Usar este formato exacto:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 CONTENIDO ORGÁNICO — PAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ REEL ]
🎬 Hook:
{hook}

📝 Script:
{script}

💬 CTA: {cta}
#️⃣ {hashtags}

─────────────────────────────

[ CAROUSEL ]
Slide 1: {slide_1}
Slide 2-4: {slides_desarrollo}
Cierre: {slide_cierre}

📋 Caption:
{caption}

─────────────────────────────

[ FACEBOOK POST ]
{apertura}

{desarrollo}

{cta}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 CONTENIDO INORGÁNICO — AIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ FACEBOOK AD ]
Headline: {headline}
Texto principal: {primary_text}
Descripción: {descripcion}
Botón: {cta_button}

Versión larga:
{primary_text_long}

Variante con urgencia:
{variante_urgencia}

─────────────────────────────

[ WHATSAPP BROADCAST ]
{apertura}

{cuerpo}

{cta}

─────────────────────────────

[ RETARGETING ]
Headline: {headline_retargeting}
{primary_text_retargeting}
Botón: {cta_button_retargeting}
```

---

## Fase 5: Marcar insight como procesado

Preguntar al usuario: "¿Marcamos este insight como 'actioned' en tu biblioteca?"

Si confirma:
```sql
UPDATE proactive_insights
SET status = 'actioned'
WHERE id = $insight_id;
```

---

## Reglas de tono (CancioBot específicas)

| Contexto | Tono |
|----------|------|
| Orgánico | Cálido, nostálgico, familiar. "Tu mamá merece más que un mensaje de texto." |
| Inorgánico | Directo, urgente, emocional. "Solo esta semana: canción personalizada desde $XX." |
| Retargeting | Empático con la objeción. "Sabemos que dudaste. Esta es la razón para no esperar más." |

Evitar siempre:
- Anglicismos forzados ("check out", "upgrade")
- Frases genéricas ("la mejor calidad", "no lo pienses más")
- CTAs sin urgencia real ("Contáctanos cuando quieras")

---

## Ejemplos de invocación

- "Genera el copy del último insight proactivo"
- "Haz el contenido para el avatar de Honduras"
- "Crea los prompts del insight de contradicción"
- "Quiero el ad para Facebook del insight pendiente"
- "Genera copy orgánico e inorgánico del insight de blind spot"

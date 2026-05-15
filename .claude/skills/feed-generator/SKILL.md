---
name: feed-generator
description: |
  Toma las plantillas JSON de proactive_insights (generadas por strategy-bridge) y las distribuye
  en un calendario semanal con mezcla 50% Atracción / 30% Educación / 20% Conversión.
  Acepta un "Tema Semanal" como hilo narrativo. Output: JSON con Fecha, Canal, Formato,
  Prompt Final (con contexto del avatar + tema) y Objetivo.
  Usar cuando el usuario diga: "genera el feed", "calendario de contenido", "arma la semana",
  "feed semanal", "distribuye las plantillas", "feed-generator", "planea el contenido",
  "organiza el contenido de la semana", "genera el calendario", "crea el plan de publicaciones".
allowed-tools: Read, mcp__supabase__execute_sql
---

# Feed Generator

> strategy-bridge produce insights con clasificación 4D.
> Este skill los convierte en un calendario semanal listo para ejecutar.
> El Tema Semanal es el hilo que da cohesión narrativa a todo el feed.

---

## Modelo mental

```
proactive_insights (5 plantillas con clasificación 4D)
        ↓
  [Fase 1] Cargar avatar + insights del avatar
        ↓
  [Fase 2] Clasificar cada insight en Objetivo (A/E/C)
        ↓
  [Fase 3] Calcular slots y asignar fechas/días
        ↓
  [Fase 4] Construir prompt_final (tema + plantilla original)
        ↓
  Output: JSON con 7 entradas listas para content-prompt-gen
```

---

## Paso 0: Recopilar inputs del usuario

Antes de ejecutar, preguntar:

```
Para armar el calendario necesito 3 datos:

1. ¿Cuál es el Tema Semanal?
   (Ej: "Mamá merece más que un mensaje de texto", "El regalo que no se olvida",
   "Para el que vive lejos pero siente cerca")

2. ¿Cuántos posts por semana? (default: 7 — uno por día)

3. ¿La semana arranca el lunes {fecha_próximo_lunes}?
   (Enter para confirmar o escribe otra fecha)
```

Si el usuario ya proporcionó el `tema_semanal` en su mensaje, usar ese directamente.
Para `fecha_inicio` default: calcular el próximo lunes desde la fecha actual.

---

## Fase 1: Cargar datos del avatar e insights

### 1a — Identificar el avatar

Si el usuario especificó un avatar:
```sql
SELECT id, name, origin, residence, musical_style, profile_json
FROM avatars
WHERE name ILIKE '%{nombre_avatar}%'
LIMIT 1;
```

Si no especificó → usar el más reciente:
```sql
SELECT id, name, origin, residence, musical_style, profile_json
FROM avatars
ORDER BY updated_at DESC
LIMIT 1;
```

Si no existe ningún avatar → abortar:
```
No encontré ningún avatar registrado. Ejecuta primero /avatar-research y luego /strategy-bridge.
```

### 1b — Cargar proactive_insights del avatar

```sql
SELECT
  id,
  insight_type,
  title,
  body,
  confidence,
  status,
  classification,
  prompt_template
FROM proactive_insights
WHERE avatar_id = '{avatar_id}'
  AND status IN ('pending', 'actioned')
ORDER BY created_at DESC;
```

Si retorna 0 filas → abortar:
```
No encontré plantillas para este avatar. Ejecuta /strategy-bridge primero.
```

**Nota defensiva:** Si algún insight tiene `classification` nulo o incompleto, asignar defaults:
- `classification->>'canal'` nulo → `"Instagram"`
- `classification->>'formato'` nulo → `"reel"`
- `classification->>'tipo'` nulo → `"organico"`

---

## Fase 2: Clasificar cada insight en Objetivo

Mapping determinista por `insight_type` (no usar IA — ya está resuelto upstream):

| insight_type           | Objetivo     | Razón                                        |
|------------------------|--------------|----------------------------------------------|
| `hook_opportunity`     | Atracción    | Gancho emocional = tope de funnel            |
| `channel_recommendation` | Atracción  | Visibilidad en canal = awareness             |
| `timing_insight`       | Educación    | Informa cuándo y cómo = valor informativo    |
| `barrier_response`     | Educación    | Superar objeciones enseñando = prep de venta |
| `price_anchoring`      | Conversión   | Presenta el precio = fondo de funnel         |

Resultado esperado con 5 insights de strategy-bridge:
- 2 Atracción (hook + channel)
- 2 Educación (timing + barrier)
- 1 Conversión (price)

---

## Fase 3: Calcular distribución y asignar fechas

### 3a — Calcular slots por Objetivo

Con `n_posts` posts en la semana:

```
n_atraccion = ceil(n_posts × 0.50)
n_conversion = max(1, floor(n_posts × 0.20))
n_educacion  = n_posts − n_atraccion − n_conversion
```

Ejemplos:
| n_posts | Atracción | Educación | Conversión |
|---------|-----------|-----------|------------|
| 5       | 3         | 1         | 1          |
| 7       | 4         | 2         | 1          |
| 10      | 5         | 3         | 2          |
| 14      | 7         | 4         | 3          |

### 3b — Asignar insights a slots (con reutilización si n > 5)

Los insights base son los 5 de strategy-bridge. Si se necesitan más slots que insights disponibles por Objetivo, reutilizar el insight con **variación de formato**:

**Tabla de formato alternativo:**
| Formato original   | Formato de reutilización   |
|--------------------|----------------------------|
| `reel`             | `carousel`                 |
| `carousel`         | `post_estatico`            |
| `post_estatico`    | `story`                    |
| `story`            | `carousel`                 |
| `facebook_ad`      | `retargeting_ad`           |
| `whatsapp_broadcast` | `facebook_ad`            |
| `retargeting_ad`   | `facebook_ad`              |

Cuando se reutiliza un insight, el `prompt_final` debe indicar la variación (ver Fase 4).

### 3c — Asignar días de la semana

Para 7 posts, distribución por lógica de funnel:

| Día        | Objetivo    | Razonamiento                                       |
|------------|-------------|----------------------------------------------------|
| Lunes      | Atracción   | Arranque de semana, máximo alcance orgánico        |
| Martes     | Educación   | Contenido de valor, buen engagement de mid-week   |
| Miércoles  | Atracción   | Pico de actividad en redes, segunda pieza gancho  |
| Jueves     | Educación   | Prepara objeciones antes del día de decisión      |
| Viernes    | Conversión  | Pico de decisiones de compra fin de semana        |
| Sábado     | Atracción   | Leisure browsing, formatos de descubrimiento       |
| Domingo    | Atracción   | Cierre semanal, preparar la siguiente semana      |

Para `n_posts` != 7, distribuir los slots en días intercalados comenzando en `fecha_inicio`.

Calcular las fechas concretas sumando días desde `fecha_inicio` (lunes = día 0).

---

## Fase 4: Construir el prompt_final

Para **cada entrada del calendario**, el `prompt_final` tiene esta estructura:

```
TEMA SEMANAL: {tema_semanal}.
Fecha de publicación: {fecha} ({dia_semana}).
Canal: {canal} | Formato: {formato} | Objetivo: {objetivo}.
{bloque_variacion — solo si es insight reutilizado}

{prompt_template original del insight}
```

**Bloque de variación** (solo cuando el insight se usa más de una vez):
```
VARIACIÓN DE FORMATO: Esta es la segunda versión del insight "{insight.title}".
Adaptar el prompt al formato {nuevo_formato} manteniendo el mismo ángulo emocional.
```

**Bloque de contexto del avatar** (al final, siempre):
```
CONTEXTO DEL AVATAR:
Avatar: {avatar.name} | Origen: {avatar.origin} → Residencia: {avatar.residence}
Estilo musical: {avatar.musical_style}
Canal preferido: {classification.canal}
```

---

## Fase 5: Armar el JSON de salida

Construir el array `feed_calendar` con una entrada por post:

```json
{
  "meta": {
    "avatar_id": "{avatar_id}",
    "avatar_name": "{avatar_name}",
    "tema_semanal": "{tema_semanal}",
    "semana_inicio": "{fecha_inicio}",
    "semana_fin": "{fecha_fin}",
    "distribucion": {
      "atraccion": {n_atraccion},
      "educacion": {n_educacion},
      "conversion": {n_conversion}
    },
    "generado_en": "{timestamp_now}"
  },
  "calendar": [
    {
      "dia": "Lunes",
      "fecha": "YYYY-MM-DD",
      "canal": "Instagram",
      "formato": "reel",
      "objetivo": "Atracción",
      "insight_id": "{uuid del proactive_insight}",
      "insight_type": "hook_opportunity",
      "titulo_insight": "{insight.title}",
      "reutilizado": false,
      "prompt_final": "TEMA SEMANAL: ...\n\n{prompt_template}"
    }
  ]
}
```

---

## Fase 6: Output al usuario

Mostrar en dos formatos:

### 6a — Resumen visual del calendario

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 FEED SEMANAL — {avatar_name}
   Tema: "{tema_semanal}"
   Semana del {fecha_inicio} al {fecha_fin}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Lun {fecha}  │ 🎯 Atracción  │ Instagram · reel
               │ "{titulo_insight}"

  Mar {fecha}  │ 📚 Educación  │ Facebook · carousel
               │ "{titulo_insight}"

  Mié {fecha}  │ 🎯 Atracción  │ TikTok · reel
               │ "{titulo_insight}"

  Jue {fecha}  │ 📚 Educación  │ Instagram · post_estatico
               │ "{titulo_insight}"

  Vie {fecha}  │ 💰 Conversión │ Facebook · facebook_ad
               │ "{titulo_insight}"

  Sáb {fecha}  │ 🎯 Atracción  │ Instagram · carousel  [variación]
               │ "{titulo_insight}"

  Dom {fecha}  │ 🎯 Atracción  │ WhatsApp · whatsapp_broadcast [variación]
               │ "{titulo_insight}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Distribución: 4 Atracción · 2 Educación · 1 Conversión
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6b — JSON completo

Imprimir el objeto JSON completo en un bloque de código (copy-paste listo).

---

## Fase 7: Siguiente paso sugerido

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
¿Qué hacer con este calendario?

→ /content-prompt-gen para expandir cada prompt_final en copy
  completo (Reel script, Carousel slides, Facebook Ad, etc.)

→ Copiar el JSON para tu herramienta de scheduling
  (Buffer, Metricool, Meta Business Suite, etc.)

→ /monitor para registrar métricas reales una vez publicado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Reglas de diseño

1. **No re-clasificar** lo que strategy-bridge ya hizo. Los campos `classification.canal`,
   `classification.formato`, `classification.tipo` se leen tal cual de la DB.

2. **No IA para distribuir.** La asignación de Objetivo y días es 100% determinista.
   La IA solo participa en content-prompt-gen (siguiente paso).

3. **prompt_final ≠ copy terminado.** Es el contexto estructurado listo para que
   content-prompt-gen genere el copy con AIDA/PAS. No expandir aquí.

4. **Tema Semanal = cabecera, no reescritura.** Se prepende al prompt_template original.
   No modificar el template generado por strategy-bridge.

5. **Reutilización = variación de formato,** no de contenido. El mismo insight
   en dos formatos distintos el mismo día o en días separados.

---

## Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| No insights encontrados | strategy-bridge no ejecutado | Ejecutar `/strategy-bridge` primero |
| Distribución no suma `n_posts` | Redondeo | Usar fórmula: n_A=ceil, n_C=max(1,floor), n_E=resto |
| classification nulo en insight | Insight creado antes de matriz 4D | Asignar defaults: canal=Instagram, formato=reel |
| Tema semanal demasiado largo | El usuario pegó un párrafo | Truncar a 15 palabras para la cabecera |
| Avatar no encontrado | Nombre mal escrito | Usar ILIKE '%término%', mostrar opciones si hay múltiples |

---

## Integración en el pipeline

```
avatar-research
      ↓
strategy-bridge  ──→  proactive_insights (5 templates + clasificación 4D)
      ↓
feed-generator   ──→  calendario semanal JSON (7 entradas con prompt_final)
      ↓
content-prompt-gen ──→ copy terminado por formato (Reel script, FB Ad, etc.)
      ↓
monitor          ──→  métricas reales de engagement post-publicación
```

El `insight_id` en cada entrada del calendario permite que `content-prompt-gen` cargue
el perfil completo del avatar y el `monitor` registre los resultados en `content_outcomes`.

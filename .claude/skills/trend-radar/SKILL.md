---
name: trend-radar
description: |
  Detecta las 3 tendencias principales del nicho vía búsqueda web, las cruza con los dolores
  activos del avatar (desde Supabase) y genera con IA un weekly_theme optimizado para el feed.
  Output: JSON auditável con trending_themes, reasoning explícito y feed_generator_input
  listo para pasar directamente a /feed-generator.
  Usar cuando el usuario diga: "encuentra el tema de la semana", "trend radar", "qué tendencias hay",
  "busca tendencias del nicho", "genera el tema semanal", "investiga tendencias",
  "qué está pasando en el nicho", "tema para el feed", "automatiza el tema", "qué hablo esta semana",
  "dame el weekly theme", "analiza las tendencias".
allowed-tools: Read, WebSearch, mcp__supabase__execute_sql, mcp__supabase__apply_migration
---

# Trend Radar

> El feed sin contexto cultural es ruido.
> Este skill cruza lo que está pasando en el mundo con lo que duele en el avatar,
> y encuentra el tema que hace que el contenido de esta semana sea inevitable.

---

## Modelo mental

```
WebSearch (3 búsquedas)        avatars + avatar_insights (DB)
        ↓                               ↓
  3 tendencias actuales    ×    dolores + motivadores del avatar
                    ↓
              IA: intersección óptima
                    ↓
         weekly_theme + reasoning (auditáble)
                    ↓
         feed_generator_input → /feed-generator
```

---

## Paso 0: Recopilar inputs

### 0a — Leer el nicho desde business_domain

```sql
SELECT niche_description, target_audience, key_differentiators
FROM business_domain
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

Si retorna vacío → usar contexto hardcoded de fallback:
```
Nicho: canciones personalizadas para migrantes latinos en EE.UU.
Audiencia: familias mexicanas, hondureñas, cubanas, guatemaltecas y puertorriqueñas
           radicadas en EE.UU. que quieren regalar experiencias emocionales.
Diferenciador: canción con historia real del cliente, entregada por WhatsApp en 48h.
```

### 0b — Identificar avatar

Si el usuario especificó un avatar:
```sql
SELECT id, name, origin, residence, musical_style, profile_json
FROM avatars
WHERE name ILIKE '%{nombre}%'
LIMIT 1;
```

Si no especificó → usar el más reciente:
```sql
SELECT id, name, origin, residence, musical_style, profile_json
FROM avatars
ORDER BY updated_at DESC
LIMIT 1;
```

Si hay múltiples avatars y el usuario no especificó → mostrar lista y preguntar cuál usar.

Si no existe ningún avatar → abortar:
```
No encontré ningún avatar registrado. Ejecuta /avatar-research y /strategy-bridge primero.
```

### 0c — Cargar dolores activos del avatar

```sql
SELECT insight_type, content
FROM avatar_insights
WHERE avatar_id = '{avatar_id}'
  AND insight_type IN ('pain_point', 'emotional_trigger', 'spending_behavior')
ORDER BY insight_type;
```

También extraer del `profile_json`:
- `profile_json->>'top_motivators'`
- `profile_json->>'top_barriers'`
- `profile_json->>'best_contact_time'`
- `profile_json->>'preferred_channels'`
- `profile_json->>'recommended_hook'`

Si `avatar_insights` está vacío → usar solo `profile_json`. Si ambos vacíos → abortar con:
```
El avatar no tiene dolores registrados. Ejecuta /strategy-bridge para generar el perfil completo.
```

---

## Fase 1: Detectar tendencias (3 búsquedas web)

Ejecutar las 3 búsquedas en paralelo. Incluir el mes y año actual en cada query para forzar resultados recientes.

### Búsqueda 1 — Tendencias del nicho ahora
```
query: "{niche_short} tendencias {mes} {año}"
```
Donde `niche_short` = las 4-5 palabras clave del nicho (ej: "canciones personalizadas latinos EE.UU.")

Extraer: ¿qué formatos, ángulos o temas están resonando en el nicho esta semana?

### Búsqueda 2 — Fechas y momentos culturales próximos
```
query: "fechas especiales familia latina {mes} {año} EE.UU."
```
Extraer: ¿hay alguna fecha cultural, religiosa o familiar relevante en los próximos 15 días
que el avatar celebre? (Día de la Madre, Quinceañeras, Día del Padre, Navidad anticipada,
Día de Muertos, Independencia MX, etc.)

### Búsqueda 3 — Comportamiento de contenido en los canales del avatar
```
query: "contenido viral Instagram Facebook latinos migrantes {mes} {año}"
```
Extraer: ¿qué tipo de contenido (formato, ángulo emocional, copy style) está performando
para esta audiencia en los canales preferidos del avatar?

### Procesamiento de resultados

Para cada búsqueda, extraer exactamente:
```json
{
  "titulo": "Descripción de la tendencia en 1 línea",
  "fuente": "URL de la fuente",
  "resumen": "Qué está pasando. Máx 60 palabras.",
  "relevancia_estimada": "alta|media|baja",
  "por_que_relevante": "Cómo conecta con el nicho y el avatar"
}
```

Si una búsqueda no retorna resultados útiles → marcar como `sin_datos` y continuar con las otras.
No fallar el skill si 1 de 3 búsquedas es pobre — trabajar con lo que hay.

---

## Fase 2: Intersección IA — tendencia × dolor → weekly_theme

Usar `generateText` + `JSON.parse` manual vía OpenRouter.
**Nunca usar `generateObject`** (no compatible con OpenRouter).

**Modelo:** `google/gemini-2.0-flash-001` · **Temperatura:** 0.3

**Prompt de referencia:** El prompt completo (con campos, comparación contra tema previo,
`relevance_score`, `relevance_vs_previous`) vive en:
`supabase/functions/trend-radar/index.ts` — constante `iaPrompt` (~línea 190).

Usar ese mismo prompt para runs manuales. Los placeholders `{prevContext}` y `{prevThemeJson}`
requieren consultar el último registro exitoso en `weekly_trends`:

```sql
SELECT id, theme_json, relevance_score
FROM weekly_trends
WHERE status = 'success'
ORDER BY created_at DESC
LIMIT 1;
```

Si no existe tema previo → enviar el bloque `'TEMA PREVIO: Primera ejecución'`.

**Variante dialectal obligatoria:** Derivar la variante desde `avatar.origin` e incluir
el bloque siguiente en el prompt de IA antes de los placeholders de tendencias y dolores:

```
VARIANTE DIALECTAL — respetar en weekly_theme, reasoning y textos de ejemplo:
Honduras / Guatemala / El Salvador / México → español con "tú" (tuteo coloquial neutro)
Argentina / Uruguay → voseo rioplatense ("vos", "sos", "regalás")
Puerto Rico / Cuba / República Dominicana → tuteo caribeño coloquial
Otro → tuteo neutro latinoamericano
PROHIBIDO: mezclar variantes. NUNCA usar "regalás/acordás/extrañás" para avatares no argentinos.
```

### Manejo de error de parseo
1. Limpiar fences markdown (```` ```json ``` ````), reintentar parse una vez
2. Si falla de nuevo → mostrar respuesta cruda. No fallar silenciosamente.

---

## Fase 2b: Persistir resultado en weekly_trends

Incluye los campos de Decisión Autónoma introducidos en la migración `weekly_trends_decision_columns`:

```sql
INSERT INTO weekly_trends (
  avatar_id, avatar_name, theme_json, reasoning,
  relevance_score, decision_type, decision_log,
  status, source
)
VALUES (
  '{avatar_id}', '{avatar_name}', '{theme_json}'::jsonb, '{reasoning}',
  {relevance_score},
  'first_run',   -- o 'auto_replace' / 'suggest_adjustment' según lógica abajo
  '{decision_log}'::jsonb,
  'success', 'skill'
)
RETURNING id;
```

**Lógica de decisión (igual que en Edge Function):**
- Sin tema previo o sin `relevance_score` previo → `first_run`, no tocar posts
- Mejora ≥ 20% → `auto_replace`: mover posts `Ideado` al nuevo `weekly_theme_id`, nota en Generado/Aprobado
- Mejora < 20% → `suggest_adjustment`: nota de oportunidad en posts no Publicados

---

## Fase 3: Construir feed_generator_input

Con el `weekly_theme` aprobado, construir el bloque conector para `/feed-generator`:

```json
"feed_generator_input": {
  "tema_semanal": "{weekly_theme}",
  "avatar_id": "{avatar_id}",
  "avatar_name": "{avatar_name}",
  "num_posts": 7,
  "fecha_inicio": "{proximo_lunes}"
}
```

Calcular `fecha_inicio` = próximo lunes desde hoy (o el lunes indicado por el usuario).

---

## Fase 4: Output al usuario

### 4a — Resumen de tendencias detectadas

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TENDENCIAS DETECTADAS — Semana {fecha}
   Nicho: {niche_short}
   Avatar: {avatar_name} ({origin} → {residence})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. [{relevancia}] {titulo_1}
     {resumen_1}
     Fuente: {fuente_1}

  2. [{relevancia}] {titulo_2}
     {resumen_2}
     Fuente: {fuente_2}

  3. [{relevancia}] {titulo_3}
     {resumen_3}
     Fuente: {fuente_3}
```

### 4b — Weekly theme con auditoría completa

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WEEKLY THEME SELECCIONADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "{weekly_theme}"

  Confianza: {confidence} — {confidence_reason}
  Urgencia: {urgency.nivel} — {urgency.explicacion}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 AUDITORÍA (reasoning)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{reasoning}

  Tendencia usada: {trend_applied.titulo}
  Por qué esta y no las otras: {trend_applied.por_que_esta_y_no_las_otras}
  Timing: {trend_why_now}

  Dolor activado: {pain_addressed.descripcion}
  Puente emocional: {pain_mechanism}

  Riesgos: {risks}

  Canales sugeridos: {suggested_channels}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 ALTERNATIVA (si el tema principal no convence)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "{alternative_theme.theme}"
  {alternative_theme.reasoning}
```

### 4c — JSON completo (copy-paste listo)

```json
{output_json_completo}
```

---

## Fase 5: Conectar con feed-generator

Preguntar al usuario:

```
¿Genero el calendario semanal con este tema?

  Tema: "{weekly_theme}"
  Posts: 7 (Lun-Dom)
  Semana: {fecha_inicio} al {fecha_fin}
  Avatar: {avatar_name}

  → S para continuar con /feed-generator
  → A para usar la alternativa "{alternative_theme.theme}"
  → N para ajustar el tema manualmente
```

Si el usuario confirma (S o respuesta afirmativa):
→ Ejecutar `/feed-generator` pasando `feed_generator_input` como contexto
→ El `tema_semanal` del feed-generator = `weekly_theme` de este output

Si elige alternativa (A):
→ Repetir el output con `alternative_theme` como tema principal
→ Confirmar de nuevo antes de correr feed-generator

Si prefiere ajuste manual (N):
→ Pedir el tema ajustado al usuario
→ Actualizar `feed_generator_input.tema_semanal` con el texto del usuario
→ Confirmar y ejecutar

---

## Reglas de diseño

1. **WebSearch es orientativo, no definitivo.** Si los resultados son pobres, la IA puede
   inferir tendencias desde el contexto del avatar y la fecha. Siempre indicar esto en
   `confidence_reason`.

2. **El reasoning es innegociable.** Si la IA produce un reasoning de menos de 80 palabras,
   reintentar con temperatura más baja y la instrucción explícita de expandir.

3. **No inventar tendencias.** Si WebSearch retorna resultados irrelevantes, usar solo
   los datos del avatar y la fecha para generar un tema basado en cultura/calendario,
   y marcar `confidence: "medium"` con explicación.

4. **Una sola llamada de IA.** La intersección completa (las 3 tendencias + todos los
   dolores) entra en un solo prompt. No hacer llamadas separadas por tendencia.

5. **El nicho se lee de business_domain.** Si está vacío, el fallback hardcoded funciona.
   No preguntar al usuario qué es el nicho a menos que el fallback sea insuficiente.

6. **Fecha automática.** El `fecha_inicio` del `feed_generator_input` se calcula
   automáticamente (próximo lunes). No preguntar al usuario a menos que lo especifique.

---

## Reglas de tono

### Variante dialectal — obligatoria según origen del avatar

| Origen del avatar | Variante a usar | Formas correctas | Prohibido |
|-------------------|-----------------|-----------------|-----------|
| Honduras, Guatemala, El Salvador, México | Tuteo coloquial neutro | "tú", "te", "tu", "recuérdalo", "te extraña" | "regalás", "acordás", "vos", "sos" |
| Argentina, Uruguay | Voseo rioplatense | "vos", "sos", "regalás", "acordás", "sabés" | "tú" en lugar de "vos" |
| Puerto Rico, Cuba, Rep. Dominicana | Tuteo caribeño | "tú", "dale", "qué vacano" | Voseo rioplatense |
| Colombia, Venezuela, Perú, Chile | Tuteo coloquial regional | "tú", "te", "¿cierto?" | Voseo rioplatense |

**Regla de oro:** Si `avatar.origin` no coincide con ningún país de la tabla → usar tuteo neutro latinoamericano.
NUNCA mezclar variantes. Un avatar hondureño NUNCA usa "regalás". Un avatar argentino NUNCA tutea con acento neutro forzado.

---

## Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| WebSearch sin resultados útiles | Nicho muy específico | Ampliar query a nicho padre (ej: "regalos personalizados latinos") |
| IA genera theme genérico | Avatar sin dolores ricos | Verificar que avatar_insights tenga pain_point; si no, correr /strategy-bridge |
| JSON inválido de la IA | Modelo añadió markdown | Limpiar fences + reintentar parse |
| feed_generator_input vacío | avatar_id nulo | Verificar que el avatar se cargó correctamente en Paso 0b |
| reasoning < 80 palabras | Respuesta truncada | Reintentar con instrucción explícita de longitud mínima |

---

## Integración en el pipeline

```
avatar-research
      ↓
strategy-bridge   →  proactive_insights (dolores + clasificación 4D)
      ↓
trend-radar  ──→ [WebSearch: 3 búsquedas]
             ──→ [DB: avatar_insights]
             ──→ [IA: intersección]
             ──→ weekly_theme + reasoning (JSON auditáble)
      ↓
feed-generator  ──→ calendario semanal JSON (7 entradas)
      ↓
content-prompt-gen ──→ copy terminado por formato
      ↓
monitor         ──→ métricas reales post-publicación
```

El `feed_generator_input.tema_semanal` es el único dato que necesita el
siguiente skill. Todo lo demás (avatar_id, num_posts, fecha) ya está pre-calculado.

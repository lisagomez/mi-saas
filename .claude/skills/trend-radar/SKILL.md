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
allowed-tools: Read, WebSearch, mcp__supabase__execute_sql
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

**Modelo:** `google/gemini-2.0-flash-001`
**Temperatura:** 0.3 (balance creatividad/consistencia)

Leer el template base en: `.claude/skills/ai/references/single-call.md`

### Prompt de intersección

```
Eres un estratega de marketing especializado en negocios de regalo emocional para migrantes latinos en EE.UU.

NICHO DEL NEGOCIO:
{niche_description}

PERFIL DEL AVATAR:
Nombre: {avatar.name}
Origen: {avatar.origin} → Residencia en EE.UU.: {avatar.residence}
Estilo musical preferido: {avatar.musical_style}
Motivadores principales: {top_motivators}
Barreras principales: {top_barriers}
Canal preferido: {preferred_channels}
Mejor momento de contacto: {best_contact_time}
Gancho recomendado: {recommended_hook}

DOLORES Y TRIGGERS (de biblioteca de insights):
{avatar_insights_pain_point}
{avatar_insights_emotional_trigger}

TENDENCIAS DETECTADAS ESTA SEMANA:
1. [{relevancia_1}] {titulo_1}
   Fuente: {fuente_1}
   Resumen: {resumen_1}
   Conexión con avatar: {por_que_relevante_1}

2. [{relevancia_2}] {titulo_2}
   Fuente: {fuente_2}
   Resumen: {resumen_2}
   Conexión con avatar: {por_que_relevante_2}

3. [{relevancia_3}] {titulo_3}
   Fuente: {fuente_3}
   Resumen: {resumen_3}
   Conexión con avatar: {por_que_relevante_3}

FECHA DE LA SEMANA: {fecha_inicio} al {fecha_fin}

─────────────────────────────────────────────
TU TAREA:
Encuentra la INTERSECCIÓN ÓPTIMA entre una tendencia y un dolor/motivador del avatar.
El weekly_theme resultante debe:
- Ser un ángulo narrativo que cohesione 7 piezas de contenido
- Conectar una tendencia real CON una emoción verdadera del avatar
- Ser específico (no genérico), memorable (5-10 palabras), en español
- Funcionar como hilo conductor en Instagram Reels, carousels y Facebook Ads

CAMPO CRÍTICO — reasoning:
Este campo es para auditoría humana. Sé explícito y honesto:
- Por qué elegiste ESA tendencia y no las otras
- Exactamente cuál dolor/motivador activa y cómo
- Si hay urgencia temporal real (fecha próxima), cuantifícala
- Admite limitaciones: si la tendencia es débil, dilo
- Mínimo 100 palabras

Responde SOLO con JSON válido — sin markdown, sin texto previo ni posterior:
{
  "weekly_theme": "string (5-10 palabras, español, sin signos de puntuación al final)",
  "reasoning": "string — párrafo detallado para auditoría, mín 100 palabras",
  "trend_applied": {
    "titulo": "cuál tendencia se usó",
    "fuente": "URL o identificador",
    "por_que_esta_y_no_las_otras": "razón explícita de por qué ganó esta tendencia"
  },
  "trend_why_now": "por qué esta tendencia es especialmente relevante ESTA semana (no genérico)",
  "pain_addressed": {
    "tipo": "pain_point | emotional_trigger | spending_behavior",
    "descripcion": "el dolor específico que activa el tema"
  },
  "pain_mechanism": "cómo exactamente el weekly_theme conecta con ese dolor — el puente emocional",
  "confidence": "high | medium | low",
  "confidence_reason": "por qué ese nivel — sé honesto si la data es escasa",
  "urgency": {
    "nivel": "alta | media | baja",
    "explicacion": "una línea concreta, ej: 'Día del Padre en 18 días — ventana de compra activa'"
  },
  "suggested_channels": ["canal1", "canal2"],
  "risks": "qué podría salir mal con este tema o por qué podría no resonar",
  "alternative_theme": {
    "theme": "segunda opción si la principal no convence (5-10 palabras)",
    "reasoning": "50 palabras: por qué es la segunda opción y cuándo preferirla"
  }
}
```

### Manejo de error de parseo

Si `JSON.parse` falla en el primer intento:
1. Limpiar la respuesta (remover markdown fences, texto introductorio)
2. Reintentar el parse una vez
3. Si falla de nuevo → mostrar la respuesta en crudo al usuario con mensaje:
   ```
   La IA retornó un formato inesperado. Aquí está la respuesta sin procesar:
   [respuesta cruda]
   ```
   No fallar silenciosamente.

Registrar el costo en `ai_usage`:
```sql
INSERT INTO ai_usage (model, tokens_input, tokens_output, cost_usd, feature)
VALUES (
  'google/gemini-2.0-flash-001',
  {tokens_in},
  {tokens_out},
  {costo_calculado},
  'trend-radar'
);
```

---

## Fase 2b: Persistir resultado en weekly_trends

Guardar el resultado en la tabla `weekly_trends` **siempre** — tanto en runs manuales (skill)
como automáticos (cron). Esto crea el historial compartido y permite auditorías futuras.

```sql
INSERT INTO weekly_trends (
  avatar_id,
  avatar_name,
  theme_json,
  reasoning,
  status,
  source,
  execution_ms
)
VALUES (
  '{avatar_id}',
  '{avatar_name}',
  '{theme_json_completo}'::jsonb,
  '{reasoning}',
  'success',
  'skill',
  {execution_ms_estimado}
)
RETURNING id;
```

Guardar el `id` retornado como `weekly_trend_id` — puede ser útil para trazabilidad.

**Nota:** No incluir `search_results_raw` en el path manual para mantener el INSERT simple.
Si el usuario pide auditoría completa, incluirlo. El campo acepta `NULL`.

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

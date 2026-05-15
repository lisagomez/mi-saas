---
name: avatar-research
description: |
  Investiga hábitos de consumo de un perfil de cliente (avatar) combinando búsqueda web
  con datos reales de Supabase (leads, orders, preferences_catalog).
  Genera un reporte estructurado: demografía, preferencias musicales, comportamiento de compra,
  canales de consumo, y pain points. Persiste el resultado en agent_reports.
  Usar cuando el usuario diga: "investiga mi avatar", "perfil de cliente", "avatar research",
  "hábitos de consumo", "quién es mi cliente", "investiga a mi cliente", "perfil de comprador",
  "estudia mi audiencia", "analiza mi avatar", "investigación de mercado", "buyer persona".
allowed-tools: WebSearch, Bash, Read, mcp__supabase__execute_sql, mcp__supabase__apply_migration
---

# Avatar Research

> Combina datos reales de tu base de clientes con investigación web para construir
> un perfil de consumo profundo. No es suposición — es evidencia.

---

## Fase 0: Consultar divergencia previa (si hay biblioteca existente)

Antes de investigar, detectar qué ya se sabe y qué contradice la biblioteca actual.
Esto orienta las búsquedas web hacia los ángulos menos explorados.

### ¿Hay avatares guardados?
```sql
SELECT COUNT(*) FROM avatars WHERE embedding IS NOT NULL;
```
Si el resultado es 0, saltar esta fase.

### Buscar insights más divergentes del perfil a investigar

Calcular el centroide de los avatares existentes y buscar lo más lejano.
Negar el centroide en la aplicación antes de enviarlo (para usar el índice HNSW):
```
negated_centroid = centroid_vector.map(x => -x)
```

```sql
SELECT
  ai.insight_type,
  ai.content,
  ai.evidence_url,
  a.name          AS from_avatar,
  (ai.embedding <=> $negated_centroid) AS divergence_score
FROM avatar_insights ai
JOIN avatars a ON a.id = ai.avatar_id
WHERE ai.id NOT IN (
    SELECT parent_insight_id FROM avatar_insights
    WHERE parent_insight_id IS NOT NULL
)
ORDER BY ai.embedding <=> $negated_centroid
LIMIT 10;
```

### Detectar contradicciones activas en la biblioteca
```sql
SELECT
  a.content       AS insight_a,
  b.content       AS insight_b,
  av_a.name       AS avatar_a,
  av_b.name       AS avatar_b,
  (a.embedding <=> b.embedding) AS distance
FROM avatar_insights a
JOIN avatar_insights b
  ON a.insight_type = b.insight_type AND a.id < b.id
JOIN avatars av_a ON av_a.id = a.avatar_id
JOIN avatars av_b ON av_b.id = b.avatar_id
WHERE (a.embedding <=> b.embedding) > 0.7
ORDER BY distance DESC
LIMIT 5;
```

Mostrar al usuario antes de iniciar:
```
Encontré [N] insights divergentes y [M] contradicciones activas.
Las búsquedas web se orientarán a resolver: [lista de temas contradictorios].
```

Usar esos temas como input adicional en las búsquedas de Fase 3.

---

## Fase 1: Capturar el perfil base

Preguntar al usuario UNA de estas dos opciones:

**Opción A — Perfil manual:**
```
¿Cuál es el perfil que quieres investigar?
Dame: país de origen, estado/región en EE.UU., rango de edad, ocasión principal, estilo musical.
(Ejemplo: "Mexicanos de Jalisco viviendo en Los Ángeles, 35-50 años, Día de las Madres, banda/norteño")
```

**Opción B — Extraer de tus leads reales:**
```
¿Prefieres que analice el perfil de tus leads reales en Supabase?
```

Si elige Opción B, ejecutar:
```sql
SELECT
  origin,
  residence,
  COUNT(*) AS total_leads,
  SUM(CASE WHEN qualification_status = 'calificado' THEN 1 ELSE 0 END) AS calificados
FROM leads
WHERE origin IS NOT NULL
GROUP BY origin, residence
ORDER BY total_leads DESC
LIMIT 10;
```

Y también:
```sql
SELECT
  o.musical_style,
  l.origin,
  l.residence,
  COUNT(*) AS total_orders,
  AVG(s.submit_attempts) AS avg_song_attempts
FROM orders o
JOIN leads l ON o.lead_id = l.id
LEFT JOIN songs s ON s.order_id = o.id
WHERE o.musical_style IS NOT NULL
GROUP BY o.musical_style, l.origin, l.residence
ORDER BY total_orders DESC;
```

Usar el origen/residencia más frecuente como base del perfil a investigar.

---

## Fase 2: Enriquecer con datos internos

Cruzar el perfil con las tablas de preferencias:

```sql
SELECT regions, styles, directives
FROM preferences_catalog
WHERE is_active = true
ORDER BY sort_order;
```

Identificar si el perfil del avatar coincide con alguna región/estilo configurado.
Si hay coincidencia, incluir las `directives` en el contexto de investigación.

También consultar patrones de conversión:
```sql
SELECT
  l.origin,
  l.residence,
  COUNT(DISTINCT l.id) AS leads,
  COUNT(DISTINCT o.id) AS orders,
  ROUND(COUNT(DISTINCT o.id)::numeric / NULLIF(COUNT(DISTINCT l.id), 0) * 100, 1) AS conversion_pct
FROM leads l
LEFT JOIN orders o ON o.lead_id = l.id
GROUP BY l.origin, l.residence
HAVING COUNT(DISTINCT l.id) > 0
ORDER BY conversion_pct DESC;
```

---

## Fase 3: Investigación web

Hacer búsquedas orientadas al perfil identificado. Adaptar los términos al país de origen y región de residencia.

### Búsquedas obligatorias (5 mínimo):

1. **Demografía y poder adquisitivo:**
   ```
   "[origen] immigrants [estado EE.UU.] spending habits income 2024"
   "migrantes [origen] [estado] consumo remesas gastos"
   ```

2. **Comportamiento digital y WhatsApp:**
   ```
   "Latino immigrants WhatsApp usage habits United States"
   "migrantes latinos consumo digital redes sociales"
   ```

3. **Regalos y ocasiones especiales:**
   ```
   "[origen] immigrants Mother's Day gifts spending [estado]"
   "latinos EE.UU. regalos especiales [ocasión] hábitos compra"
   ```

4. **Preferencias musicales por región:**
   ```
   "[estilo musical] [origen] fans demographics United States"
   "música [estilo] audiencia migrantes latinoamerica"
   ```

5. **Pain points y motivadores de compra:**
   ```
   "Latino immigrants gift-giving nostalgia emotional triggers"
   "migrantes sentimiento pertenencia regalo personalizado"
   ```

Extraer de los resultados:
- Datos duros (% de uso, gasto promedio, frecuencia)
- Motivadores emocionales principales
- Canales de consumo preferidos
- Barreras de compra (precio, desconfianza, idioma)
- Ocasiones de mayor gasto

### Síntesis con IA (ai → single-call)

Con los fragmentos brutos de todas las búsquedas, llamar al modelo para extraer insights
estructurados. Usar `generateText` + `JSON.parse` manual — **nunca `generateObject`**
(no compatible con OpenRouter).

Leer el template en: `.claude/skills/ai/references/single-call.md`

**Modelo recomendado:** `google/gemini-2.0-flash-001` (síntesis larga, bajo costo)

**Prompt base:**
```
Eres un analista de mercado especialista en migrantes latinos en EE.UU.
Analiza estos resultados de investigación web sobre [perfil] y responde SOLO con JSON válido:
{
  "avg_spend_usd_min": number,
  "avg_spend_usd_max": number,
  "top_motivators": string[],     // máximo 3, los más fuertes emocionalmente
  "top_barriers": string[],       // máximo 2
  "preferred_channels": string[], // WhatsApp, Facebook, Instagram, referidos...
  "best_contact_time": string,    // ej: "viernes 7-9pm hora local"
  "recommended_hook": string,     // frase corta que resuena con el avatar
  "confidence": "high" | "medium" | "low"  // qué tan sólida es la evidencia encontrada
}

Resultados de búsqueda:
[FRAGMENTOS BRUTOS AQUÍ]
```

Registrar el costo en `ai_usage`: modelo, tokens_input, tokens_output, cost_usd.

---

## Fase 4: Síntesis — Reporte estructurado

Generar el reporte en este formato exacto:

```markdown
# Avatar: [Nombre descriptivo]
*Generado: [fecha]*

## Demografía
- **País de origen:** [país]
- **Región en EE.UU.:** [estado/ciudad]
- **Rango de edad:** [rango]
- **Ingreso promedio estimado:** $XX,XXX/año
- **Tamaño del segmento estimado:** ~X,XXX personas (fuente: [búsqueda])

## Perfil de consumo
- **Gasto promedio en regalos/ocasión:** $XX - $XX USD
- **Frecuencia de compra de regalos:** [X veces/año]
- **Canales preferidos:** WhatsApp / Facebook / Referidos / Instagram
- **Dispositivo principal:** Móvil ([X]% según fuente)
- **Idioma preferido en comunicación:** Español [variante]

## Preferencias musicales
- **Estilo principal:** [estilo]
- **Artistas referencia:** [lista]
- **Subgéneros relevantes:** [lista]
- **Ocasión → Estilo más pedido:** Día de Madres = [estilo], Cumpleaños = [estilo]

## Motivadores emocionales (los más fuertes)
1. [Motivador 1]: [descripción]
2. [Motivador 2]: [descripción]
3. [Motivador 3]: [descripción]

## Barreras de compra
1. [Barrera 1]: [cómo superarla]
2. [Barrera 2]: [cómo superarla]

## Datos de tus leads reales
- **Total leads de este perfil:** [N]
- **Tasa de conversión observada:** [X]%
- **Estilo musical más pedido:** [estilo]
- **Origen más frecuente:** [origen]
> *Estos datos son de tu Supabase — no proyecciones.*

## Oportunidades de mensaje
- **Gancho emocional recomendado:** "[frase que resuena]"
- **Objeción principal a manejar:** "[objeción]"
- **Momento ideal de contacto:** [día/hora según hábitos]

## Fuentes consultadas
- [URL o descripción de fuente 1]
- [URL o descripción de fuente 2]
- ...
```

---

## Fase 4.5: Generar embedding del avatar (ai → rag / setup-base)

Antes de persistir, generar el embedding del perfil para habilitar búsqueda semántica
en la biblioteca de avatares futura.

Leer el provider configurado en: `.claude/skills/ai/references/agents/00-setup-base.md`

**Modelo de embedding:** `openai/text-embedding-3-small` via OpenRouter (1536 dims)

**Input — concatenar estos campos del avatar sintetizado:**
```
"{name} {origin} {residence} {musical_style} {top_motivators.join(' ')} {top_barriers.join(' ')} {recommended_hook}"
```

Guardar el vector resultante para usarlo en el INSERT de Fase 5.

> Si OpenRouter no está configurado (`OPENROUTER_API_KEY` ausente), omitir este paso
> y dejar `embedding = NULL`. El avatar se guarda sin vector — se puede backfill después.

---

## Fase 5: Persistir en Supabase

### Setup inicial (solo primera vez)

Si la constraint de `agent_reports` no incluye `avatar_research`, aplicar:

```sql
ALTER TABLE agent_reports DROP CONSTRAINT IF EXISTS agent_reports_agent_type_check;
ALTER TABLE agent_reports ADD CONSTRAINT agent_reports_agent_type_check
  CHECK (agent_type = ANY (ARRAY[
    'investigator'::text,
    'financial'::text,
    'promotions'::text,
    'avatar_research'::text
  ]));
```

### Guardar el reporte

Usar `RETURNING id` para capturar el `agent_report_id` — **es obligatorio para el bridge**:

```sql
INSERT INTO agent_reports (agent_type, report_json, generated_at)
VALUES (
  'avatar_research',
  '{
    "avatar_name": "[nombre]",
    "origin": "[origen]",
    "residence": "[residencia]",
    "age_range": "[rango]",
    "musical_style": "[estilo]",
    "avg_spend_usd": [número],
    "conversion_pct": [número],
    "top_motivators": ["...", "..."],
    "top_barriers": ["...", "..."],
    "recommended_hook": "[frase]",
    "preferred_channels": ["WhatsApp", "Facebook"],
    "best_contact_time": "[día/hora]",
    "sources": ["...", "..."],
    "report_md": "[markdown completo escapado]"
  }'::jsonb,
  NOW()
)
RETURNING id;
```

Guardar el `id` retornado como `$agent_report_id` — se pasa a Fase 6.

---

## Fase 6: Bridge automático → capa de estrategia

**Esta fase es obligatoria.** Ejecutar inmediatamente después de guardar en `agent_reports`.

Con el `$agent_report_id` obtenido en Fase 5, ejecutar el skill `strategy-bridge`:
- Crea el registro en `avatars` con `profile_json` completo → obtiene `avatar_id`
- Genera 5 `avatar_insights` inmutables del perfil
- Llama a IA para producir 5 `proactive_insights` (status='pending') listos para content-prompt-gen
- Mantiene la cadena: `agent_reports.id` → `avatars.agent_report_id` → `avatar_insights.avatar_id` → `proactive_insights.avatar_id`

El `avatar_id` queda disponible para toda la capa de estrategia sin ningún paso manual.

---

## Output final al usuario

Mostrar:
1. El reporte completo en markdown
2. **3 insights accionables** numerados — qué cambiar hoy en el bot/mensajes
3. Resumen del bridge:
   ```
   ✅ Avatar registrado con ID: {avatar_id}
   ✅ 5 proactive_insights generados — listos para /content-prompt-gen
   ```

---

## Ejemplos de invocación

- "Investiga mi avatar — migrantes mexicanos en California"
- "Quién es mi cliente ideal?"
- "Haz un avatar research de mis leads de Jalisco"
- "Analiza los hábitos de consumo de mi audiencia"
- "Buyer persona de mis clientes de Honduras en Florida"

---

## Integración con otros agentes

| Si el resultado muestra... | Siguiente paso sugerido |
|---------------------------|------------------------|
| Baja conversión en segmento | Revisar `preferences_catalog` — ajustar directives para esa región |
| Ocasión de alto gasto no cubierta | Agregar a `promotions_catalog` |
| Canal nuevo identificado | Documentar en `business_domain` como métrica de experiencia |
| Competitor no registrado | Agregar a tabla `competitors` |
| Bridge completado | Ejecutar `/content-prompt-gen` para generar copy del insight más relevante |

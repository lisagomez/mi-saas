---
name: strategy-bridge
description: |
  Toma el JSON resultante de una investigación de avatar (agent_reports tipo avatar_research)
  y lo materializa en la capa de estrategia proactiva: crea el registro en `avatars`,
  genera `avatar_insights` inmutables, y produce 3-5 `proactive_insights` listos para
  content-prompt-gen. Mantiene trazabilidad completa: avatar_id viaja desde la investigación
  hasta la estrategia final.
  Usar cuando el usuario diga: "bridge del avatar", "genera insights proactivos",
  "convierte la investigación en estrategia", "prepara el avatar para contenido",
  "strategy bridge", "conecta el avatar con el contenido", "activa el pipeline",
  "genera los proactive insights del avatar".
  También se activa automáticamente al final del skill avatar-research.
allowed-tools: Bash, Read, mcp__supabase__execute_sql, mcp__supabase__apply_migration
---

# Strategy Bridge

> La investigación del avatar es datos brutos.
> Este skill los convierte en estrategia accionable — sin intervención humana.
> El `avatar_id` es el hilo que conecta todo: investigación → insights → contenido.

---

## Flujo completo

```
agent_reports (avatar_research)
        ↓
  [Fase 1] avatars row (upsert)        → avatar_id
        ↓
  [Fase 2] avatar_insights (inmutables) → 5 insights del perfil
        ↓
  [Fase 3] IA genera proactive_insights → 3-5 insights accionables (status='pending')
        ↓
  content-prompt-gen lo consume
```

---

## Fase 1: Localizar el reporte fuente

### Opción A — Usar el reporte más reciente
```sql
SELECT id, report_json, generated_at
FROM agent_reports
WHERE agent_type = 'avatar_research'
ORDER BY generated_at DESC
LIMIT 1;
```

### Opción B — Reporte específico por ID
Si el usuario proveyó un `agent_report_id`:
```sql
SELECT id, report_json, generated_at
FROM agent_reports
WHERE id = '$agent_report_id'
  AND agent_type = 'avatar_research';
```

Extraer del `report_json`:
```
avatar_name, origin, residence, age_range, musical_style,
avg_spend_usd, top_motivators[], top_barriers[],
recommended_hook, preferred_channels[], sources[]
```

Si no existe ningún reporte → abortar con:
```
No encontré ninguna investigación de avatar. Ejecuta primero /avatar-research.
```

---

## Fase 2: Upsert en `avatars`

Antes de insertar, verificar si ya existe el avatar para evitar duplicados:

```sql
SELECT id FROM avatars
WHERE name = '$avatar_name'
  AND origin = '$origin'
  AND residence = '$residence'
LIMIT 1;
```

**Si existe** → usar ese `id` como `avatar_id`. Actualizar `profile_json` y `agent_report_id`:
```sql
UPDATE avatars
SET profile_json = '$profile_json'::jsonb,
    agent_report_id = '$agent_report_id',
    updated_at = NOW()
WHERE id = '$existing_avatar_id';
```

**Si no existe** → insertar:
```sql
INSERT INTO avatars (name, origin, residence, age_range, musical_style, profile_json, agent_report_id)
VALUES (
  '$avatar_name',
  '$origin',
  '$residence',
  '$age_range',
  '$musical_style',
  '$profile_json'::jsonb,
  '$agent_report_id'
)
RETURNING id;
```

El `profile_json` debe contener el JSON completo del reporte (sin `report_md`):
```json
{
  "avg_spend_usd": 45,
  "top_motivators": ["nostalgia familiar", "celebración de logros"],
  "top_barriers": ["desconfianza en pagos online", "precio percibido alto"],
  "recommended_hook": "Dale a tu mamá la canción que nunca olvidará",
  "preferred_channels": ["WhatsApp", "Facebook"],
  "best_contact_time": "viernes 7-9pm hora local",
  "confidence": "high",
  "sources": ["..."]
}
```

Guardar el `avatar_id` resultante — **este ID viaja a todas las operaciones siguientes**.

---

## Fase 3: Insertar `avatar_insights` (inmutables)

Los `avatar_insights` son la biblioteca permanente del perfil. Se insertan UNA vez.
Nunca editar — si cambia el dato, insertar nueva fila con `parent_insight_id` = fila anterior.

Verificar primero si ya existen insights para este avatar:
```sql
SELECT COUNT(*) FROM avatar_insights WHERE avatar_id = '$avatar_id';
```

Si ya existen → saltar esta fase (no duplicar).

Si no existen → insertar 5 insights clave del perfil:

```sql
INSERT INTO avatar_insights (avatar_id, insight_type, content, evidence_url)
VALUES
  ('$avatar_id', 'spending_behavior',
   'Gasto promedio en regalos: $[min]-$[max] USD por ocasión. Ocasiones principales: [lista].',
   NULL),

  ('$avatar_id', 'emotional_trigger',
   '[Motivador 1]: [descripción]. [Motivador 2]: [descripción]. [Motivador 3]: [descripción].',
   NULL),

  ('$avatar_id', 'pain_point',
   'Barrera principal: [barrera 1]. Cómo superar: [solución]. Barrera secundaria: [barrera 2].',
   NULL),

  ('$avatar_id', 'channel_preference',
   'Canal principal: [canal]. Momento de mayor receptividad: [hora/día]. Dispositivo: móvil.',
   NULL),

  ('$avatar_id', 'musical_preference',
   'Estilo musical: [estilo]. Contexto de escucha: [contexto]. Artistas referencia: [lista].',
   NULL);
```

Sustituir los placeholders con los valores reales del `report_json`.

---

## Fase 4: Generar `proactive_insights` con IA

Aquí entra la IA para convertir el perfil en insights **accionables** — listos para copy.

Usar `generateText` + `JSON.parse` manual. **Nunca `generateObject`** (no compatible con OpenRouter).

Leer el template en: `.claude/skills/ai/references/single-call.md`

**Modelo:** `google/gemini-2.0-flash-001`

**Prompt — Clasificación obligatoria en Matriz 4D:**
```
Eres un estratega de marketing para negocios latinos en EE.UU.
Dado este perfil de avatar, genera exactamente 5 insights proactivos.
Cada insight DEBE clasificarse en una matriz de 4 dimensiones y llevar
una plantilla de prompt lista para usar por un sistema de generación de contenido.

AVATAR:
Nombre: {avatar_name}
Origen: {origin} | Residencia: {residence}
Estilo musical: {musical_style}
Gasto promedio: ${avg_spend_usd} USD
Motivadores: {top_motivators}
Barreras: {top_barriers}
Gancho recomendado: {recommended_hook}
Canal preferido: {preferred_channels}
Momento de contacto: {best_contact_time}

MATRIZ 4D (valores permitidos):

  canal:            "Instagram" | "Facebook" | "WhatsApp" | "TikTok" | "YouTube"
  tipo:             "organico" | "inorganico"
  formato:          "reel" | "carousel" | "post_estatico" | "story" |
                    "facebook_ad" | "whatsapp_broadcast" | "retargeting_ad"
  estrategia_venta: "PAS" | "AIDA" | "storytelling" | "social_proof" |
                    "urgencia_escasez" | "manejo_objeciones"

REGLAS DE CLASIFICACIÓN:
- Cada insight DEBE tener exactamente UN valor por dimensión
- No repetir la misma combinación canal+formato en los 5 insights
- tipo "organico" → formatos: reel, carousel, post_estatico, story
- tipo "inorganico" → formatos: facebook_ad, whatsapp_broadcast, retargeting_ad
- Elegir la combinación más efectiva para el insight y el perfil del avatar

PROMPT TEMPLATE:
- Debe ser un texto listo para pegar en un generador de contenido
- Incluir el framework de la estrategia_venta como instrucción explícita
- Referenciar datos reales del avatar (gasto, canal, timing, motivador)
- Máx 200 palabras. No usar placeholders vagos como "[nombre]"
- Escribir en español, tono adecuado al tipo (cálido=orgánico, directo=inorgánico)

Responde SOLO con JSON válido — array de exactamente 5 objetos:
[
  {
    "insight_type": "hook_opportunity" | "barrier_response" | "timing_insight" | "channel_recommendation" | "price_anchoring",
    "title": "Título corto del insight (máx 8 palabras)",
    "body": "Descripción accionable. Incluir datos numéricos del perfil. Máx 120 palabras.",
    "confidence": "high" | "medium" | "low",
    "classification": {
      "canal": "[valor permitido]",
      "tipo": "[valor permitido]",
      "formato": "[valor permitido]",
      "estrategia_venta": "[valor permitido]"
    },
    "prompt_template": "[texto del prompt listo para usar]"
  }
]

Tipos requeridos (uno de cada uno):
- hook_opportunity: el gancho emocional más potente → preferir orgánico/reel
- barrier_response: superar la objeción principal → preferir inorgánico/retargeting
- timing_insight: cuándo contactar → preferir inorgánico/whatsapp_broadcast
- channel_recommendation: qué canal domina → elegir el más específico del avatar
- price_anchoring: presentar el precio → preferir inorgánico/facebook_ad con AIDA
```

Registrar el costo en `ai_usage` (tabla ai_usage: model, tokens_input, tokens_output, cost_usd).

---

## Fase 5: Insertar `proactive_insights` con matriz 4D

Con el array JSON de la IA, insertar cada insight con `classification` y `prompt_template`:

```sql
INSERT INTO proactive_insights
  (avatar_id, insight_type, title, body, confidence, status, classification, prompt_template)
VALUES
  ('$avatar_id', 'hook_opportunity',
   '$title_1', '$body_1', '$conf_1', 'pending',
   '{"canal":"$canal_1","tipo":"$tipo_1","formato":"$formato_1","estrategia_venta":"$estrategia_1"}'::jsonb,
   '$prompt_template_1'),

  ('$avatar_id', 'barrier_response',
   '$title_2', '$body_2', '$conf_2', 'pending',
   '{"canal":"$canal_2","tipo":"$tipo_2","formato":"$formato_2","estrategia_venta":"$estrategia_2"}'::jsonb,
   '$prompt_template_2'),

  ('$avatar_id', 'timing_insight',
   '$title_3', '$body_3', '$conf_3', 'pending',
   '{"canal":"$canal_3","tipo":"$tipo_3","formato":"$formato_3","estrategia_venta":"$estrategia_3"}'::jsonb,
   '$prompt_template_3'),

  ('$avatar_id', 'channel_recommendation',
   '$title_4', '$body_4', '$conf_4', 'pending',
   '{"canal":"$canal_4","tipo":"$tipo_4","formato":"$formato_4","estrategia_venta":"$estrategia_4"}'::jsonb,
   '$prompt_template_4'),

  ('$avatar_id', 'price_anchoring',
   '$title_5', '$body_5', '$conf_5', 'pending',
   '{"canal":"$canal_5","tipo":"$tipo_5","formato":"$formato_5","estrategia_venta":"$estrategia_5"}'::jsonb,
   '$prompt_template_5')

RETURNING id, insight_type, title,
  classification->>'canal'         AS canal,
  classification->>'tipo'          AS tipo,
  classification->>'formato'       AS formato,
  classification->>'estrategia_venta' AS estrategia_venta;
```

**`status = 'pending'`** siempre — así `content-prompt-gen` y la app Avatar Research los detectan.

---

## Fase 6: Output al usuario

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Strategy Bridge completado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avatar registrado:
  🪪 Nombre:     {avatar_name}
  📍 Perfil:     {origin} → {residence}
  🆔 avatar_id:  {avatar_id}

Plantillas generadas (Matriz 4D):
  1. [hook_opportunity]        {canal_1} · {tipo_1} · {formato_1} · {estrategia_1}
     → {title_1}

  2. [barrier_response]        {canal_2} · {tipo_2} · {formato_2} · {estrategia_2}
     → {title_2}

  3. [timing_insight]          {canal_3} · {tipo_3} · {formato_3} · {estrategia_3}
     → {title_3}

  4. [channel_recommendation]  {canal_4} · {tipo_4} · {formato_4} · {estrategia_4}
     → {title_4}

  5. [price_anchoring]         {canal_5} · {tipo_5} · {formato_5} · {estrategia_5}
     → {title_5}

JSON exportable disponible en /avatar-research → card del avatar → "Ver JSON"

Siguiente paso:
  → /content-prompt-gen para copy listo
  → /avatar-research para ver y copiar el JSON estructurado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Trazabilidad garantizada

```
agent_reports.id (avatar_research)
        ↓  avatar.agent_report_id
avatars.id = avatar_id
        ↓  avatar_insights.avatar_id
        ↓  proactive_insights.avatar_id
                ↓  leído por content-prompt-gen
                        ↓  genera copy con contexto completo del avatar
```

El `avatar_id` nunca se pierde en ningún paso. Si `content-prompt-gen` necesita el perfil completo,
hace JOIN con `avatars.profile_json` — toda la investigación está ahí.

---

## Integración con avatar-research

Este skill se ejecuta **automáticamente al final de `/avatar-research`** (Fase 6 del skill).
También puede ejecutarse manualmente si la investigación ya fue guardada previamente.

Triggers de invocación manual:
- "bridge del avatar"
- "genera los insights proactivos"
- "conecta la investigación con el contenido"
- "activa el pipeline del avatar [nombre]"
- "prepara el avatar para content-prompt-gen"

---

## Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| No se encontró reporte | `agent_reports` vacío | Ejecutar `/avatar-research` primero |
| `avatar_id` null | INSERT falló | Verificar campos NOT NULL: name, origin, residence, profile_json |
| Insights duplicados | avatar_insights ya existen | El skill detecta COUNT > 0 y salta la Fase 3 |
| IA retorna JSON inválido | Modelo inconsistente | Reintentar con temperatura 0, o parsear manualmente |
| `proactive_insights` no aparecen en content-prompt-gen | status != 'pending' | Verificar que el INSERT no cambió el default |

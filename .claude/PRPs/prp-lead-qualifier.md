# PRP-002: Agente calificador de leads (sentimiento + intención de pago)

> **Estado**: COMPLETADO
> **Fecha**: 2026-03-16
> **Proyecto**: CancioBot (mi-saas)

---

## Objetivo

Que un agente de IA analice el sentimiento y la intención de pago del lead a partir de la conversación en WhatsApp y clasifique el resultado en "califica" o "no califica"; si no califica, enviar cierre con gracia y registrar al lead en lista de nutrición para seguimiento manual; si califica, continuar el flujo pidiendo historia y estilo musical.

## Por Qué

| Problema | Solución |
|----------|----------|
| Se desperdicia IA y tiempo en leads sin intención real de pago | Filtrar antes de generar letra/audio; solo leads calificados pasan a producción |
| Cierre brusco con leads fríos da mala imagen | Cierre con gracia + opción de nutrición manual para el creativo |
| Sin trazabilidad de quién calificó o no | Estado del lead en BD + lista de nutrición consultable por el equipo |

**Valor de negocio**: Reducir % de IA desperdiciada en leads fríos (meta &lt; 5%), mejorar tasa de cierre en leads calificados (meta 60%), y dar visibilidad al creativo sobre leads no calificados para seguimiento manual.

## Qué

### Criterios de Éxito
- [ ] Tras uno o más mensajes del lead después del saludo, el sistema invoca al agente calificador (OpenRouter, modelo económico) con el historial reciente de la conversación.
- [ ] El agente devuelve una clasificación binaria: "califica" o "no califica" (con opción de razón breve para logs).
- [ ] Si "no califica": el asistente envía por WhatsApp un mensaje de cierre con gracia; el lead queda con estado `no_calificado` y se registra en `nurturing_list` para acceso del creativo.
- [ ] Si "califica": el lead queda con estado `calificado` y el asistente envía el siguiente mensaje del flujo (solicitar historia y estilo musical).
- [ ] Cada llamada al agente calificador se registra en `ai_usage` (modelo, tokens, costo) y se respeta la lógica de presupuesto IA si existe (guardedAICall / límite mensual).

### Comportamiento Esperado

1. El lead ya recibió el saludo y presentación del servicio (PRP-001).
2. El lead escribe uno o más mensajes (ej. "Me interesa", "Cuánto cuesta?", "Solo estaba viendo", etc.).
3. El webhook de WhatsApp recibe el mensaje; se persiste en `conversations` (o equivalente) asociado al `lead_id`.
4. Se determina si hay que evaluar ya (ej. después de N mensajes del usuario, o tras un timeout desde el saludo). Si es momento de calificar:
   - Se arma el contexto: últimos K mensajes de la conversación (lead + bot).
   - Se llama al agente calificador (prompt fijo: analizar sentimiento y disposición de pago; devolver structured output: `{ qualified: boolean, reason?: string }`).
   - Se actualiza el lead: `qualification_status` = `calificado` | `no_calificado`, `qualified_at` = now si aplica.
   - Si `no_calificado`: se envía mensaje de cierre con gracia por WhatsApp; se inserta en `nurturing_list` (lead_id, motivo opcional).
   - Si `calificado`: se envía mensaje siguiente ("Cuéntame para quién es / qué ocasión es" y "¿Qué estilo te gusta?").
5. Si aún no es momento de calificar, el bot puede responder con un mensaje corto que invite a seguir la conversación (opcional en esta feature).
6. La conversación queda lista para el siguiente PRP (recolección de historia y estilo).

---

## Contexto

### Referencias
- `BUSINESS_LOGIC.md` — Flujo pasos 3–5, tablas `leads`, `conversations`, `nurturing_list`, `ai_usage`; routing modelo económico para calificación; guardedAICall.
- `prp-whatsapp-entry-greeting.md` — Webhook WhatsApp, tabla `leads`, feature `whatsapp-bot`. Este PRP extiende el mismo webhook y usa el mismo lead.
- `.claude/skills/ai/references/agents/00-setup-base.md` y `structured-outputs.md` — OpenRouter, Vercel AI SDK, structured output con Zod.
- Arquitectura: `whatsapp-bot/qualifier/` (agente calificador).

### Arquitectura Propuesta (Feature-First)

```
src/features/whatsapp-bot/
├── qualifier/
│   ├── services/
│   │   └── run-qualifier.ts    # Llama OpenRouter, parsea resultado
│   ├── types/
│   │   └── qualifier-result.ts # { qualified, reason? }
│   └── prompts/
│       └── qualifier-prompt.ts # Prompt del agente (sentimiento + intención de pago)
├── conversation/               # (esta feature o anterior)
│   └── services/
│       └── store-message.ts     # Persistir mensaje en conversations
```

- **Trigger**: Desde el handler del webhook WhatsApp (o desde un servicio llamado por el webhook), tras persistir el mensaje, decidir si se ejecuta el calificador; si sí, llamar a `run-qualifier`, actualizar lead y enviar respuesta por WhatsApp.
- **Modelo**: OpenRouter con modelo económico (ej. `gpt-4o-mini` o equivalente) para esta tarea; uso de structured output (Zod) para `{ qualified: boolean, reason?: string }`.

### Modelo de Datos

**Extensión de `leads` (migración):**

```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(20) DEFAULT 'pending'
    CHECK (qualification_status IN ('pending', 'calificado', 'no_calificado')),
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;

COMMENT ON COLUMN leads.qualification_status IS 'pending = aún no evaluado; calificado = sigue flujo; no_calificado = cierre gracia + nurturing';
```

**Tabla `conversations` (mensajes por lead):**

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content_text TEXT,
  content_audio_url TEXT,
  message_id_whatsapp VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead_created ON conversations(lead_id, created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Solo backend (service_role) inserta; roles internos leen
CREATE POLICY "Service role full access conversations"
  ON conversations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated read conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'creativo', 'admin_pagos')
    )
  );
```

**Tabla `nurturing_list` (leads no calificados):**

```sql
CREATE TABLE nurturing_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE UNIQUE,
  reason TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nurturing_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read nurturing_list"
  ON nurturing_list FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'creativo')
    )
  );

CREATE POLICY "Service insert nurturing_list"
  ON nurturing_list FOR INSERT
  TO service_role
  WITH CHECK (true);
```

**Tabla `ai_usage` (log de llamadas IA):**  
Crear si no existe; campos: id, lead_id o order_id (nullable), model, tokens_input, tokens_output, cost_usd, created_at. RLS: solo backend escribe; roles admin leen.

---

## Blueprint (Assembly Line)

> Solo fases. Subtareas se generan al entrar a cada fase (bucle agéntico).

### Fase 1: Persistencia de conversación
**Objetivo**: Por cada mensaje entrante del webhook WhatsApp (texto o referencia a audio), guardar en `conversations` (lead_id, role=user, content_text o content_audio_url, message_id_whatsapp, created_at). Asegurar que el lead exista (creado en PRP-001).
**Validación**: Mensaje de prueba guardado en `conversations` y asociado al lead correcto.

### Fase 2: Modelo y prompt del calificador
**Objetivo**: Definir prompt del agente (sentimiento + intención de pago; instrucción de responder solo con clasificación) y contrato de salida (Zod: qualified boolean, reason opcional). Configurar llamada a OpenRouter con modelo económico (ej. gpt-4o-mini). Función `runQualifier(conversationContext: string)` que devuelve `{ qualified, reason? }`.
**Validación**: Test unitario o script que con una conversación de ejemplo devuelve qualified true/false coherente.

### Fase 3: Integración en flujo WhatsApp
**Objetivo**: En el handler del webhook, tras guardar el mensaje, aplicar regla "cuándo calificar" (ej. al menos 1 respuesta del usuario después del saludo). Si toca calificar: obtener últimos N mensajes, llamar a `runQualifier`, actualizar `leads.qualification_status` y `qualified_at`, registrar en `ai_usage`. Si no calificado: insertar en `nurturing_list`, enviar mensaje de cierre con gracia por WhatsApp. Si calificado: enviar mensaje de siguiente paso (pedir historia y estilo).
**Validación**: Flujo E2E con mensaje de prueba: lead pasa a calificado o no_calificado, respuesta correcta por WhatsApp y datos correctos en BD.

### Fase 4: Validación final
**Objetivo**: Criterios de éxito del PRP cumplidos y calidad de código.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Calificador se ejecuta solo cuando corresponde y actualiza lead + nurturing_list según resultado
- [ ] Llamadas al agente registradas en `ai_usage`
- [ ] Criterios de éxito del PRP revisados y cumplidos

---

## Aprendizajes (Self-Annealing)

### [2026-03-16]: Tipado Supabase con Database manual
- **Error**: El cliente `createClient<Database>(url, key)` infería `never` en `.from('leads').insert()` y en otras tablas nuevas (leads, conversations, nurturing_list, ai_usage).
- **Fix**: Usar aserciones `as never` en los payloads de `insert`/`update` donde el tipo inferido fallaba; tipar explícitamente variables con `Database['public']['Tables'][table]['Insert']` donde aporta valor.
- **Aplicar en**: Proyectos que extienden Database a mano; idealmente generar tipos con `supabase gen types types` para evitar `never`.

### [2026-03-16]: Uso del AI SDK generateObject (usage)
- **Error**: `usage.promptTokens` y `usage.completionTokens` no existen en `LanguageModelUsage` del AI SDK v6.
- **Fix**: Usar `usage.inputTokens` y `usage.outputTokens` y mapear a `promptTokens`/`completionTokens` en nuestro DTO si hace falta.
- **Aplicar en**: Cualquier código que lea `usage` de `generateObject` o `generateText`.

---

## Gotchas

- [ ] Definir bien "cuándo" calificar: por número de mensajes del usuario, por tiempo desde el primer mensaje, o por detección de intención explícita (ej. "quiero una canción"). Evitar calificar con solo "hola".
- [ ] Mensajes de audio: si el flujo incluye audio, el calificador necesita texto; definir si en esta fase solo texto o si se requiere transcripción (otra feature/PRP).
- [ ] Respuesta por WhatsApp: usar la misma capa de envío que PRP-001 (WhatsApp Cloud API); mensajes de cierre y de siguiente paso en constantes o copy reutilizable.
- [ ] Presupuesto IA: si ya existe `guardedAICall` o límite mensual, usarlo antes de llamar al calificador; si no existe, al menos registrar en `ai_usage` para futura integración.
- [ ] Idempotencia: no volver a calificar un lead ya en estado `calificado` o `no_calificado`; ignorar o responder sin re-ejecutar el agente.

## Anti-Patrones

- NO usar modelo avanzado/caro para la calificación; usar siempre el modelo económico definido en el stack.
- NO guardar contenido sensible innecesario en logs; reason opcional para debugging interno, no exponer en cliente.
- NO enviar dos mensajes contradictorios (ej. cierre y siguiente paso); una sola rama por resultado del calificador.

---

*PRP pendiente de aprobación. No se ha modificado código.*

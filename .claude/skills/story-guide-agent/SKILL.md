# Skill: story-guide-agent

## Propósito
Implementar o mejorar el agente conversacional que guía la recopilación de historia para corridos personalizados.
Reemplaza `detectStoryDone` (lista de keywords) + `detectMissingDetails` (llamada separada post-estilo)
con un solo agente que corre en runtime durante `recopilando_historia`.

## Cuándo activar
- "El bot no detecta cuando termina la historia"
- "Los clientes no escriben 'listo' y se quedan atorados"
- "Mejorar la calidad de las historias recopiladas"
- "El agente de historia no está funcionando"
- "Ajusta el criterio de completitud de la historia"

---

## Arquitectura

```
Cliente manda mensaje (recopilando_historia)
   ↓
appendStoryChunk()           ← siempre guarda
extractAndSaveLocation()     ← fire-and-forget
   ↓
runStoryGuideAgent({
  storyAccumulated,          ← historia completa hasta ahora (post-save)
  newMessage,                ← mensaje actual
  leadMeta: { origin, residence }
})
   ↓
action='complete'  → updateOrderStatus('recopilando_estilo')
                   → sendAndStore(STORY_RECEIVED_ASK_STYLE_MESSAGE)

action='collecting' + reply  → sendAndStore(reply)   ← pregunta puntual
action='collecting' sin reply → silencio             ← chunk demasiado corto
```

## Archivo principal
`src/features/whatsapp-bot/conversation/services/run-story-guide-agent.ts`

## Integración en route.ts
`src/app/api/webhooks/whatsapp/route.ts` → función `handleQualifiedLead()`
- Estado `recopilando_historia`: usa el agente
- Estado `recopilando_estilo`: simplificado, llama directamente `handleGenerateLyrics()`
- Estado `aclarando_detalles`: eliminado (el agente lo maneja inline)

---

## Criterios de completitud (en el system prompt del agente)

1. Al menos un nombre propio (persona o lugar significativo)
2. Contexto narrativo claro (se entiende de qué trata la canción)
3. Más de 80 palabras acumuladas
4. Fechas importantes con año (no solo "el 16 de enero")

---

## Modelo y costo
- Modelo: `MODELS.basic` (openai/gpt-4o-mini via OpenRouter)
- Costo estimado: ~$0.001-0.002 por mensaje en fase de historia
- Promedio 3-5 mensajes por orden: ~$0.005-0.01 total por pedido

---

## Cómo ajustar el agente

### Criterios muy estrictos → muchos "collecting" → clientes aportan más detalle
### Criterios muy laxos → "complete" prematuro → corridos genéricos

Para ajustar, editar el SYSTEM prompt en `run-story-guide-agent.ts`:
- Cambiar el umbral de palabras (default: 80)
- Agregar o quitar criterios en la lista
- Ajustar el tono del reply (más cálido, más directo, etc.)

### Campos de aclaración conocidos (aprendidos de conversaciones reales)
1. **Año del evento** — "el 16 de enero" sin año
2. **Forma del apodo** — "el Fily" → ¿"Fily", "el Fily" o "el Compa Fily"?
3. **Personas secundarias** — amigos/compañeros sin nombre claro
4. **Lugar de nacimiento** — si no está en `leads.origin`

Estos criterios ya están cubiertos en el system prompt. Si se aprenden nuevos, agregarlos.

---

## Lo que este agente reemplaza

| Antes | Después |
|-------|---------|
| `detectStoryDone()` — lista de keywords | Completitud semántica por IA |
| Instrucción "escribe *listo*" en ASK_STORY_MESSAGE | El bot detecta automáticamente |
| `detectMissingDetails()` — llamada separada | Inline durante recopilación |
| Estado `aclarando_detalles` + transición extra | Eliminado |
| Bot silencioso durante recopilación | Retroalimentación activa |

---

## Testing manual

1. Resetear orden del lead: `DELETE FROM orders WHERE lead_id = '...'`
2. Mandar mensaje corto → bot debe preguntar algo específico
3. Mandar historia completa (> 80 palabras, con nombre, con año) → debe pasar a estilo
4. Verificar que NO pide "listo"

## Aprendizajes de conversaciones reales (CancioBot)
Ver `.claude/CONVERSATIONAL_CONTEXT.md` para patrones de lenguaje observados.
El skill `conversational-context` actualiza ese contexto cuando llegan nuevos chats.

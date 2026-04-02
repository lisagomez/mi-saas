# PRP-001: Orders + Flujo Conversacional Post-Calificacion

> **Estado**: COMPLETADO ✓
> **Fecha**: 2026-03-17
> **Proyecto**: CancioBot

---

## Objetivo

Implementar la tabla `orders` en Supabase y el flujo conversacional post-calificacion en el webhook de WhatsApp: el asistente solicita historia y estilo musical al cliente calificado, y genera la letra de la cancion con IA usando OpenRouter.

## Por Que

| Problema | Solucion |
|----------|----------|
| Tras la calificacion, el bot solo envia un mensaje estatico ("cuéntame la historia") y se detiene — no hay recoleccion estructurada ni generacion de letra | Flujo conversacional multi-turn que recopila historia y estilo, los almacena en `orders`, y dispara generacion de letra con IA avanzada |
| El tiempo de respuesta manual para generar la letra es 1-3 dias | Generacion automatica con IA en segundos, letra lista en la misma sesion de WhatsApp |
| No hay trazabilidad del pedido desde la calificacion hasta la entrega | Tabla `orders` con estado, costo IA y relacion al lead |

**Valor de negocio**: Reduce tiempo de produccion de letra de dias a minutos. Permite escalar de 3-5 a 30+ clientes/dia sin mas colaboradores. Elimina dependencia humana en el paso de mayor friccion creativa.

## Que

### Criterios de Exito

- [ ] Lead calificado recibe respuesta conversacional solicitando historia (no un mensaje plano final)
- [ ] El bot acepta historia en multiples mensajes y confirma cuando ha recibido suficiente informacion
- [ ] El bot solicita estilo musical y registra la preferencia
- [ ] Se crea un registro en `orders` con estado `recopilando_info` al inicio, `letra_generada` al terminar
- [ ] La letra generada se almacena en tabla `songs` vinculada al `order`
- [ ] El bot envia la letra al cliente por WhatsApp
- [ ] El uso de IA queda registrado en `ai_usage` con `order_id`
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso

### Comportamiento Esperado (Happy Path)

1. Cliente calificado envia un mensaje cualquiera
2. Bot detecta `qualification_status = 'calificado'` y `order` en estado `recopilando_historia` (o ausente → crea uno)
3. Bot responde: *"Perfecto, compa! Cuéntame la historia o dedicatoria para la canción. Puede ser en uno o varios mensajes, avísame cuando termines escribiendo 'listo'."*
4. Cliente envia 1-N mensajes de historia
5. Cliente escribe "listo" (o variantes: "ya", "eso es todo", "terminé")
6. Bot confirma historia recibida y pregunta estilo: *"¡Ya tengo tu historia! ¿Y qué estilo te late? Banda, pop, romántica, reggaeton, corrido tumbado..."*
7. Cliente responde el estilo
8. Bot responde: *"¡Sale! Dame un momento, ya estoy generando tu letra..."*
9. Sistema llama a OpenRouter (modelo `advanced`) con historia + estilo + prompt del catalogo de preferencias
10. Bot envia la letra generada al cliente
11. Order se actualiza a `letra_generada`

---

## Contexto

### Referencias

- `src/app/api/webhooks/whatsapp/route.ts` — Webhook principal. Aqui se agrega la rama post-calificacion
- `src/features/whatsapp-bot/qualifier/services/run-qualifier.ts` — Patron de llamada IA con `generateObject` + `zodSchema`
- `src/features/whatsapp-bot/services/log-ai-usage.ts` — Patron de log de uso IA
- `src/features/whatsapp-bot/conversation/services/store-message.ts` — Patron de almacenamiento de mensajes
- `src/lib/ai/openrouter.ts` — `MODELS.balanced` para generacion de letra
- `BUSINESS_LOGIC.md §2` — Flujo principal pasos 5-10
- `BUSINESS_LOGIC.md §9` — Sistema de optimizacion de presupuesto IA (guard de budget)

### Arquitectura Propuesta (Feature-First)

```
src/features/orders/
├── components/          # (vacio en esta fase — UI es WhatsApp)
├── services/
│   ├── get-or-create-order.ts       # Obtiene o crea order para un lead calificado
│   ├── update-order-status.ts       # Actualiza estado del order
│   ├── append-story-chunk.ts        # Concatena chunk de historia al order
│   └── generate-lyrics.ts           # Llama OpenRouter y guarda en songs
├── types/
│   ├── order.ts                     # OrderStatus enum + Order type
│   └── lyrics-result.ts             # Schema Zod de respuesta de generacion
└── prompts/
    └── lyrics-prompt.ts             # System prompt + builder para generacion de letra

src/features/whatsapp-bot/
└── conversation/
    └── services/
        └── detect-story-done.ts     # Detecta si el cliente indica que termino la historia

Nuevo archivo:
src/app/api/webhooks/whatsapp/route.ts  (modificado — rama post-calificacion)
```

### Modelo de Datos

```sql
-- Orders: pedidos post-calificacion
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'recopilando_historia'
    CHECK (status IN (
      'recopilando_historia',
      'recopilando_estilo',
      'generando_letra',
      'letra_generada',
      'pago_pendiente',
      'pago_confirmado',
      'entregado',
      'requiere_procesamiento_manual'
    )),
  story_text TEXT,
  musical_style VARCHAR(100),
  ai_cost_usd DECIMAL(12, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)   -- un pedido activo por lead (V1)
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access orders"
  ON public.orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo', 'admin_pagos')
    )
  );

-- Songs: letras generadas por order
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lyrics_text TEXT NOT NULL,
  model_used VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access songs"
  ON public.songs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read songs"
  ON public.songs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo')
    )
  );

-- Actualizar ai_usage para linkear a order_id (columna ya existe como nullable)
-- No requiere migracion adicional, el campo order_id ya esta en la tabla
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migracion de Base de Datos

**Objetivo**: Crear tablas `orders` y `songs` en Supabase con RLS correcta y columnas necesarias para el flujo completo
**Validacion**: `list_tables` de Supabase MCP muestra ambas tablas; `get_advisors` sin alertas de RLS

### Fase 2: Types y Servicios de Orders

**Objetivo**: Crear tipos TypeScript (OrderStatus, Order) y servicios CRUD para orders (`get-or-create-order`, `update-order-status`, `append-story-chunk`)
**Validacion**: `npm run typecheck` pasa sin errores en los nuevos archivos

### Fase 3: Generacion de Letra con IA

**Objetivo**: Crear el servicio `generate-lyrics.ts` que llama a OpenRouter con el modelo `advanced`, guarda la letra en `songs`, y registra el uso en `ai_usage`
**Validacion**: `npm run typecheck` pasa; funcion exportable y tipos correctos

### Fase 4: Logica Conversacional Post-Calificacion en Webhook

**Objetivo**: Modificar `route.ts` del webhook para manejar leads calificados con estado de order: rama `recopilando_historia` (acumula story), deteccion de "listo", rama `recopilando_estilo`, y disparo de generacion de letra
**Validacion**: `npm run typecheck` pasa; flujo sin errores de compilacion

### Fase 5: Copy Conversacional

**Objetivo**: Agregar los mensajes del asistente al archivo `copy.ts` para todas las etapas del flujo post-calificacion (solicitar historia, confirmar historia, solicitar estilo, mensaje de espera, envio de letra)
**Validacion**: Todos los strings usados en `route.ts` exportados desde `copy.ts`

### Fase 6: Validacion Final

**Objetivo**: Sistema funcionando end-to-end con typecheck y build limpios
**Validacion**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot de la app confirma que no hay errores visuales
- [ ] Criterios de exito cumplidos (revision manual del flujo en codigo)

---

## Aprendizajes (Self-Annealing)

### 2026-03-17: package.json no tiene script "typecheck"
- **Error**: `npm run typecheck` falla con "Missing script"
- **Fix**: Usar `npx tsc --noEmit` directamente
- **Aplicar en**: Todos los proyectos hasta agregar el script en package.json

---

## Gotchas

- [ ] El webhook recibe mensajes de forma asincrona; si el cliente envia mensajes muy rapido, pueden llegar mensajes desordenados — usar `updated_at` para ordenar
- [ ] La columna `order_id` ya existe en `ai_usage` como `uuid` nullable — no re-crearla
- [ ] El modelo `MODELS.balanced` (`anthropic/claude-3-5-sonnet`) es el correcto para generacion de letra; `MODELS.basic` solo para calificacion y tareas simples
- [ ] Supabase RLS con `service_role` bypass — todas las escrituras del webhook usan `createAdminClient()`, no el cliente de usuario
- [ ] La deteccion de "listo" debe ser tolerante a variantes ("ya", "eso es todo", "terminé", "termine", "listo") — usar logica simple de keywords, no IA, para ahorrar tokens
- [ ] `UNIQUE(lead_id)` en `orders` es un simplificacion para V1; en V2 se permite historial de pedidos multiples por lead
- [ ] La letra generada puede superar 4096 caracteres — WhatsApp acepta hasta 4096 chars por mensaje; si es mas larga, dividir en chunks

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan (seguir patron de `run-qualifier.ts` para `generate-lyrics.ts`)
- NO ignorar errores de TypeScript
- NO hardcodear el modelo de IA (usar `MODELS.balanced` desde `openrouter.ts`)
- NO omitir validacion Zod en la respuesta de generacion de letra
- NO llamar a la IA sin guard de budget (aunque en V1 el guard es solo log; en V2 sera bloqueo)
- NO almacenar la letra solo en memoria — siempre persistir en `songs` antes de enviar

---

*PRP pendiente aprobacion. No se ha modificado codigo.*

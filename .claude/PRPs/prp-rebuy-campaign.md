# PRP-010: Panel de Campaña de Recompra vía WhatsApp

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-23
> **Proyecto**: CancioBot (mi-saas)

---

## Objetivo

Completar y exponer en el dashboard de administrador el flujo de campaña de recompra: mostrar candidatos elegibles (clientes con pedidos pagados), seleccionar una promoción activa, y enviar la campaña vía WhatsApp con un solo click.

## Por Qué

| Problema | Solución |
|----------|----------|
| Los clientes que ya pagaron (pago_confirmado, entregado, video_pago_confirmado) no reciben seguimiento post-venta | Campaña automática que identifica candidatos y les envía una promoción activa vía WhatsApp |
| `getRebuyCandidates` solo filtra por status `entregado`, ignorando `pago_confirmado` y `video_pago_confirmado` | Expandir el filtro a los 3 status de pedido pagado |
| La tabla `rebuys` (usada para registrar envíos y evitar spam) puede no existir en producción | Crear migración que garantice su existencia con RLS |
| El mensaje de recompra usa campo `discount_fixed_mxn` pero CancioBot opera en USD | Corregir el texto del mensaje y el label del panel para reflejar precios en USD |
| El panel ya existe bajo el tab "Agentes" pero está aislado — los administradores pueden no descubrirlo | Ya integrado: el panel está en `AdminView`. El foco es corregir la lógica, no mover UI |

**Valor de negocio**: Reactivar clientes pasados incrementa LTV sin costo de adquisición. Con 1 campaña mensual a 10+ clientes, CancioBot puede generar pedidos recurrentes de forma automática.

## Qué

### Criterios de Éxito
- [ ] `getRebuyCandidates` retorna leads con orders de status `entregado`, `pago_confirmado` O `video_pago_confirmado`
- [ ] La tabla `rebuys` existe en Supabase con RLS habilitado y la migración es idempotente
- [ ] El panel muestra correctamente el número de candidatos elegibles con teléfono y pedidos
- [ ] Al hacer click en "Enviar campaña", los mensajes llegan vía WhatsApp y se registra en `rebuys`
- [ ] El mensaje de recompra usa `discount_fixed_usd` o `discount_percent` (no MXN) para ser coherente con CancioBot en EE.UU.
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado

**Happy Path del Admin:**
1. Admin abre dashboard → tab "Agentes"
2. Ve el `PromotionsAgentPanel` con dropdown de promociones activas
3. Selecciona una promoción y hace click en "Vista previa de destinatarios"
4. Ve la lista de candidatos: leads que compraron (cualquier status pagado) y no han recibido campaña en 30 días
5. Confirma el envío con el botón de campaña
6. El sistema envía el mensaje de WhatsApp a cada candidato y registra el envío en `rebuys`
7. La UI muestra el resumen: total / enviados / fallidos

---

## Contexto

### Referencias
- `src/features/agents/promotions/services/get-rebuy-candidates.ts` — lógica de candidatos (a corregir filtro de status)
- `src/features/agents/promotions/services/send-rebuy-campaign.ts` — Server Actions de preview y envío
- `src/features/agents/promotions/components/PromotionsAgentPanel.tsx` — UI ya completa (revisar labels MXN→USD)
- `src/features/dashboard/components/admin-view.tsx` — ya renderiza `PromotionsAgentPanel` en tab "Agentes"
- `src/app/(main)/dashboard/page.tsx` — ya pasa `activePromotions` al `AdminView`
- `src/features/catalogs/services/get-active-promotion.ts` — `formatPromotionMessage` usa `discount_fixed_mxn`
- `src/features/whatsapp-bot/services/send-whatsapp-message.ts` — `sendWhatsAppText(phone, text)`

### Arquitectura Propuesta

No se requiere nueva estructura de features. Los cambios son correcciones quirúrgicas en archivos existentes:

```
src/features/agents/promotions/
├── services/
│   ├── get-rebuy-candidates.ts    ← corregir filtro de status (3 valores)
│   └── send-rebuy-campaign.ts     ← corregir label MXN en mensaje de texto
└── components/
    └── PromotionsAgentPanel.tsx   ← corregir label "discount_fixed_mxn" si se muestra

src/features/catalogs/services/
└── get-active-promotion.ts        ← corregir formatPromotionMessage para USD

supabase/migrations/
└── YYYYMMDDHHMMSS_create_rebuys.sql  ← migración idempotente para tabla rebuys
```

### Modelo de Datos

La tabla `rebuys` ya es referenciada por el código existente pero puede no existir en BD:

```sql
CREATE TABLE IF NOT EXISTS rebuys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES promotions_catalog(id),
  status      TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rebuys ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden leer/escribir rebuys
CREATE POLICY "admin_full_access_rebuys" ON rebuys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrador'
    )
  );

-- Índice para la consulta de 30 días recientes
CREATE INDEX IF NOT EXISTS rebuys_lead_sent_at_idx ON rebuys (lead_id, sent_at DESC);
```

### Filtro de Status Corregido

`getRebuyCandidates` debe consultar los 3 status pagados:

```typescript
// Antes: .eq('status', 'entregado')
// Después:
.in('status', ['entregado', 'pago_confirmado', 'video_pago_confirmado'])
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase con el bucle agéntico.

### Fase 1: Migración BD — Tabla `rebuys`
**Objetivo**: Garantizar que la tabla `rebuys` existe en Supabase con estructura correcta y RLS habilitado, de forma idempotente (sin romper si ya existe).
**Validación**: `list_tables` en Supabase MCP confirma la tabla. `get_advisors` no reporta RLS faltante.

### Fase 2: Corregir lógica de candidatos
**Objetivo**: `getRebuyCandidates` filtra por los 3 status de pedido pagado (`entregado`, `pago_confirmado`, `video_pago_confirmado`) y el campo `sent_at` se inserta correctamente en `rebuys`.
**Validación**: Typecheck pasa. La función retorna candidatos adicionales cuando hay órdenes con status `pago_confirmado`.

### Fase 3: Corregir mensaje y labels USD
**Objetivo**: El mensaje de WhatsApp y los labels del panel usan terminología en USD, consistente con el mercado de CancioBot en EE.UU. Se elimina referencia a "MXN" en mensajes al cliente.
**Validación**: El template del mensaje no menciona MXN. El panel muestra "descuento" sin moneda específica o con USD.

### Fase 4: Validación Final
**Objetivo**: El flujo completo funciona end-to-end: preview de candidatos → confirmación → envío → reporte.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma que el panel "Agentes" carga con candidatos y botón de envío habilitado (si hay candidatos y promoción activa)
- [ ] Criterios de éxito del PRP cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] La tabla `rebuys` puede no existir en producción — la migración DEBE ser idempotente (`CREATE TABLE IF NOT EXISTS`)
- [ ] El query de `getRebuyCandidates` hace JOIN con `leads` usando `leads!inner(phone)` — este patrón ya funciona para `eq`, verificar que `.in()` con múltiples status también lo soporta en Supabase
- [ ] `formatPromotionMessage` en `get-active-promotion.ts` se usa también en el flujo conversacional del bot — al cambiar labels, verificar que no se rompa el bot de WhatsApp para nuevos pedidos
- [ ] `send-rebuy-campaign.ts` usa `as never` en inserts de Supabase — indica tipos no alineados con el schema generado. Al agregar la tabla `rebuys` correctamente, regenerar tipos si es posible
- [ ] El campo `sent_at` en `rebuys` debe estar presente en el schema; el código actual hace `gte('sent_at', thirtyDaysAgo)` — verificar que la migración incluya este campo

## Anti-Patrones

- NO crear un nuevo componente de panel si `PromotionsAgentPanel` ya está integrado y funcional
- NO mover el panel a otro tab o cambiar la estructura de `AdminView` — ya está en el lugar correcto
- NO hardcodear el texto del mensaje (usar `formatPromotionMessage` existente)
- NO ignorar errores de TypeScript con `as never` — resolverlos con tipos correctos post-migración

---

*PRP pendiente aprobación. No se ha modificado código.*

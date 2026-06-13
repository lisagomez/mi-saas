# PRP-001: WhatsApp Leads + Campanas de Promocion Avanzadas

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-03-25
> **Proyecto**: CancioBot

---

## Objetivo

Extender el sistema de Leads existente para enriquecer los datos de clientes que interactuaron via WhatsApp Business, agregar filtros avanzados por criterios de pago y comportamiento, y habilitar el envio de campanas de promocion segmentadas desde el dashboard del administrador.

## Por Que

| Problema | Solucion |
|----------|----------|
| La vista de Leads actual solo muestra clientes con pedidos entregados, sin posibilidad de filtrar por fecha, residencia, origen o numero de compras | Agregar filtros dinamicos en la UI para segmentar la audiencia antes de enviar una campana |
| No hay forma de ver el historial de campanas enviadas ni saber cuales leads ya recibieron una promocion especifica | Agregar una seccion de historial de rebuys con tasa de exito por campana |
| El mensaje de campana es generico y estatico | Permitir personalizar el mensaje de campana con variables dinamicas (nombre, numero de compras, ultima fecha de pedido) |
| No hay proteccion contra enviar la misma promocion dos veces al mismo lead | Agregar validacion que detecte y advierta sobre leads que ya recibieron esa promocion |

**Valor de negocio**: Incrementar la tasa de recompra de clientes convertidos, reducir mensajes duplicados que generan spam, y dar al administrador visibilidad completa sobre el rendimiento de cada campana de WhatsApp.

## Que

### Criterios de Exito
- [ ] El administrador puede filtrar leads por: residencia, origen, numero minimo de pedidos, rango de fecha de ultimo pedido
- [ ] El sistema advierte (con opcion de ignorar) si alguno de los leads seleccionados ya recibio esa promocion
- [ ] El mensaje de campana puede incluir variables: `{{pedidos}}` y `{{fecha_ultimo_pedido}}`
- [ ] Existe una seccion "Historial de Campanas" que muestra cada campana enviada con metricas (total, enviados, fallidos, fecha)
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado

1. Admin navega a la tab "Leads" del dashboard
2. Aplica filtros (ej: residencia = "Florida", pedidos >= 2)
3. La tabla se actualiza en tiempo real mostrando solo los leads que cumplen el filtro
4. Admin selecciona leads manualmente o usa "Seleccionar filtrados"
5. Sistema advierte: "3 de los 12 leads seleccionados ya recibieron esta promocion. Continuar de todas formas?"
6. Admin confirma y envia campana
7. Se muestra resumen: 12 total, 10 enviados, 2 fallidos
8. En la tab "Historial" aparece el registro de la campana con fecha y metricas

---

## Contexto

### Referencias
- `src/features/leads/components/LeadsView.tsx` - UI actual a extender (tabla + seleccion + envio)
- `src/features/leads/services/get-converted-leads.ts` - Query de leads convertidos a extender con filtros
- `src/features/leads/services/send-campaign-to-selected.ts` - Server Action de envio a extender con variables dinamicas y deduplicacion
- `src/features/dashboard/components/admin-view.tsx` - AdminView donde se renderiza LeadsView (tab "leads")
- `src/app/(main)/dashboard/page.tsx` - Server Component que carga datos para el dashboard
- `src/features/catalogs/services/get-active-promotion.ts` - `formatPromotionMessage` usada en el envio
- `src/types/database.ts` - Interfaces `Lead`, `Order`, `Rebuy`, `PromotionsCatalog`

### Arquitectura Propuesta (Feature-First)

No se crea una feature nueva. Todo se extiende dentro de `src/features/leads/`:

```
src/features/leads/
├── components/
│   ├── LeadsView.tsx            (MODIFICAR - agregar filtros + aviso duplicados)
│   ├── LeadsFilters.tsx         (NUEVO - componente de filtros client-side)
│   └── CampaignHistoryView.tsx  (NUEVO - historial de rebuys con metricas)
├── hooks/
│   └── useLeadsFilters.ts       (NUEVO - logica de filtrado client-side)
├── services/
│   ├── get-converted-leads.ts   (MODIFICAR - exponer mas campos para filtros)
│   ├── send-campaign-to-selected.ts (MODIFICAR - variables dinamicas + check duplicados)
│   └── get-campaign-history.ts  (NUEVO - query historial de rebuys agrupado por campana)
└── types/
    └── leads.ts                 (NUEVO - tipos locales: LeadsFilter, CampaignHistory)
```

### Modelo de Datos

No se necesitan migraciones nuevas. El modelo actual soporta todos los requerimientos:

- `leads` - ya tiene `origin`, `residence`, `created_at`
- `orders` - ya tiene `status`, `created_at` para filtrar por fecha de ultimo pedido
- `rebuys` - ya tiene `lead_id`, `promotion_id`, `status`, `sent_at` para deduplicacion e historial

El unico cambio en queries es:
1. `get-converted-leads.ts`: agregar campo `leadId` como clave mas campos para filtros (ya estan, solo necesitan exponerse correctamente)
2. `get-campaign-history.ts`: nueva query que agrupa `rebuys` por `promotion_id` + `sent_at` con conteo de `sent`/`failed`

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agentico (mapear contexto -> generar subtareas -> ejecutar)

### Fase 1: Tipos y Servicios Base
**Objetivo**: Definir los tipos locales de la feature y extender los servicios existentes para soportar filtros, variables dinamicas en mensajes, deteccion de duplicados, e historial de campanas
**Validacion**: Los servicios compilan sin errores de TypeScript; `npm run typecheck` pasa en esta fase

### Fase 2: Hook de Filtros Client-Side
**Objetivo**: Crear `useLeadsFilters` que recibe la lista completa de leads y retorna la lista filtrada + estado de los filtros activos, sin hacer fetch adicionales (todo client-side sobre los datos ya cargados)
**Validacion**: El hook exporta correctamente los tipos y funciones; no hay `any` en el codigo

### Fase 3: Componente LeadsFilters
**Objetivo**: Crear el componente `LeadsFilters.tsx` con inputs para filtrar por residencia (select dinamico de valores unicos), origen (select), minimo de pedidos (number input), y rango de fecha de ultimo pedido (date range)
**Validacion**: El componente renderiza sin errores; los filtros llaman al hook correctamente

### Fase 4: Componente CampaignHistoryView
**Objetivo**: Crear `CampaignHistoryView.tsx` que recibe el historial de campanas y los muestra en una tabla con columnas: Promocion, Fecha, Total, Enviados, Fallidos, Tasa de exito
**Validacion**: El componente renderiza correctamente con datos mock; tipado correcto

### Fase 5: Actualizar LeadsView y AdminView
**Objetivo**: Integrar `LeadsFilters` y `CampaignHistoryView` en `LeadsView.tsx`; agregar sub-tabs "Leads" e "Historial" dentro de la tab; actualizar `AdminView` y `dashboard/page.tsx` para pasar el historial de campanas como prop
**Validacion**: La UI muestra filtros funcionales, la seleccion responde a los filtros activos, el historial se renderiza en su sub-tab

### Fase 6: Validacion Final
**Objetivo**: Sistema funcionando end-to-end
**Validacion**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] La vista Leads muestra filtros funcionales
- [ ] El aviso de duplicados aparece cuando corresponde
- [ ] El historial de campanas se carga correctamente
- [ ] Criterios de exito cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta seccion CRECE con cada error encontrado durante la implementacion.

---

## Gotchas

> Cosas criticas a tener en cuenta ANTES de implementar

- [ ] `get-converted-leads.ts` usa `createAdminClient` (no RLS) — mantener ese patron en todos los servicios nuevos de esta feature
- [ ] `send-campaign-to-selected.ts` es `'use server'` — los tipos de parametros deben ser serializables (no pasar objetos Date, usar strings ISO)
- [ ] La tabla `rebuys` no tiene columna `sent_at` en `database.ts` pero si en la interface `Rebuy` con `sent_at: string` — verificar que la columna exista en Supabase antes de hacer query de historial
- [ ] Los filtros de fecha se hacen client-side sobre datos ya cargados para evitar re-fetches — si hay muchos leads (>500), considerar paginacion en el futuro
- [ ] El campo `promotionId` en `Rebuy` es `promotion_id: string | null` — filtrar nulls al agrupar por campana en historial
- [ ] Variables dinamicas en mensaje (`{{pedidos}}`, `{{fecha_ultimo_pedido}}`) deben sanitizarse para evitar injection en el string del mensaje de WhatsApp

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan (seguir el patron de `LeadsView` + Server Actions)
- NO ignorar errores de TypeScript
- NO hardcodear valores (usar constantes para los nombres de variables dinamicas)
- NO omitir validacion Zod en inputs de usuario
- NO hacer fetch adicionales en el cliente para los filtros — usar los datos ya cargados en el Server Component

---

*PRP pendiente aprobacion. No se ha modificado codigo.*

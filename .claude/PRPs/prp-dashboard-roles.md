# PRP-004: Dashboard Multi-Rol

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-03-17
> **Proyecto**: mi-saas (CancioBot)

---

## Objetivo

Construir un dashboard con 3 vistas diferenciadas por rol de usuario: **Creativo** (letras pendientes de revisión/aprobación), **Agente Investigador** (tabla de competencia editable manualmente), y **Agente Financiero** (métricas ROI/ROAS/CAC/LTV, flujo de caja, barra de presupuesto IA). El rol **Administrador** ve las 3 vistas unificadas. Todos los datos provienen de Supabase en tiempo real.

---

## Por Qué

| Problema | Solución |
|----------|----------|
| El dashboard actual solo sirve al rol `admin_pagos` (confirmación de pagos). El `creativo` ve un mensaje genérico sin funcionalidad real. | Vista dedicada al Creativo para revisar y aprobar letras generadas por IA antes de entrega. |
| No existe visibilidad competitiva interna. El equipo no tiene un lugar centralizado para monitorear competidores. | Vista de Agente Investigador con tabla de competencia editable que persiste en Supabase. |
| No hay métricas financieras del negocio. Sin ROI/ROAS/CAC/LTV no se puede tomar decisiones de inversión. | Vista de Agente Financiero con métricas calculadas desde datos reales (orders, ai_usage, leads). |
| El Administrador tiene que hacer inferencias desde múltiples fuentes. | Vista unificada que agrega las 3 perspectivas en un solo panel. |

**Valor de negocio**: Reduce tiempo de revisión de letras, permite decisiones de inversión basadas en datos reales, y da visibilidad competitiva al equipo. Reemplaza el dashboard placeholder actual con herramientas operativas reales.

---

## Qué

### Criterios de Éxito

- [ ] Rol `creativo` ve SOLO su vista: letras en estado `letra_generada` con `story_text` y `lyrics_text`, con botón de aprobación
- [ ] Rol `administrador` (nuevo rol extendido) ve SOLO su vista: tabla de competidores con campos precio/propuesta/ventaja/desventaja, editable inline
- [ ] Rol `admin_pagos` (renombrado a Agente Financiero en UI) ve SOLO su vista: métricas ROI, ROAS, CAC, LTV, flujo de caja, barra de presupuesto IA
- [ ] Rol `administrador` ve las 3 vistas en tabs o secciones
- [ ] Métricas financieras calculadas desde datos reales de Supabase (`orders`, `ai_usage`, `leads`)
- [ ] Tabla de competencia persiste en nueva tabla `competitors` en Supabase con RLS
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado

**Vista Creativo:**
El creativo inicia sesión y ve una lista de pedidos con status `letra_generada`. Para cada pedido se muestra: teléfono del lead, `story_text` (historia del cliente), y `lyrics_text` (letra generada por IA). Puede marcar una letra como "Aprobada" lo que avanza el order a `pago_pendiente`.

**Vista Agente Investigador:**
El agente investigador ve una tabla con filas de competidores. Cada fila tiene: nombre del competidor, precio, propuesta de valor, ventajas, desventajas. Las celdas son editables inline (click para editar). Hay un botón para agregar nuevo competidor. Los cambios se guardan automáticamente en Supabase.

**Vista Agente Financiero:**
El agente financiero ve un panel con tarjetas de métricas: ROI, ROAS, CAC, LTV. Debajo, un gráfico de flujo de caja mensual (ingresos de pedidos entregados). Al fondo, una barra de presupuesto IA que muestra costo acumulado de `ai_usage` vs. un presupuesto configurable. Todos los números se calculan desde Supabase en tiempo real.

**Vista Administrador:**
Tabs o secciones que contienen las 3 vistas anteriores más el panel existente de confirmación de pagos.

---

## Contexto

### Referencias de Código Existente
- `/home/gsore/code/mi-saas/src/app/(main)/dashboard/page.tsx` — página actual del dashboard, patrón de fetch con role-check
- `/home/gsore/code/mi-saas/src/features/orders/components/payment-confirmation-panel.tsx` — componente de panel existente, patrón a seguir para componentes de rol
- `/home/gsore/code/mi-saas/src/features/orders/services/confirm-payment.ts` — patrón para Server Actions
- `/home/gsore/code/mi-saas/src/types/database.ts` — tipos existentes: `UserRole`, `Order`, `Song`, `AiUsage`, `Lead`
- `/home/gsore/code/mi-saas/supabase/migrations/` — migraciones existentes para entender el esquema

### Roles Actuales (de `database.ts`)
```typescript
type UserRole = 'creativo' | 'admin_pagos' | 'administrador'
```
> Nota: El PRP asume que `admin_pagos` es el "Agente Financiero" en la UI (sin cambio de DB). El nuevo rol "Agente Investigador" requiere un nuevo valor en el enum o reutilizar un rol. **Decisión de arquitectura pendiente**: agregar `agente_investigador` al enum o usar `administrador` para ese rol. Se recomienda agregar `agente_investigador` al enum de Supabase.

### Arquitectura Propuesta (Feature-First)

```
src/features/dashboard/
├── components/
│   ├── dashboard-router.tsx          # Renderiza la vista según el rol
│   ├── creativo-view.tsx             # Vista del Creativo
│   ├── investigador-view.tsx         # Vista del Agente Investigador
│   ├── financiero-view.tsx           # Vista del Agente Financiero
│   ├── admin-view.tsx                # Vista del Administrador (tabs)
│   ├── lyrics-approval-card.tsx      # Tarjeta de letra para revisión
│   ├── competitors-table.tsx         # Tabla editable de competidores
│   ├── metric-card.tsx               # Tarjeta de métrica (ROI, ROAS, etc.)
│   ├── cash-flow-chart.tsx           # Gráfico de flujo de caja
│   └── ai-budget-bar.tsx             # Barra de presupuesto IA
├── hooks/
│   ├── use-lyrics-approval.ts        # Lógica de aprobación de letras
│   ├── use-competitors.ts            # CRUD de competidores
│   └── use-financial-metrics.ts      # Cálculo de métricas financieras
├── services/
│   ├── approve-lyrics.ts             # Server Action: aprobar letra → pago_pendiente
│   ├── upsert-competitor.ts          # Server Action: guardar competidor
│   └── delete-competitor.ts         # Server Action: eliminar competidor
└── types/
    ├── competitor.ts                 # Tipo Competitor
    └── financial-metrics.ts         # Tipos para ROI, ROAS, CAC, LTV
```

### Modelo de Datos

**Nueva tabla: `competitors`**
```sql
CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT,
  proposal TEXT,
  advantages TEXT,
  disadvantages TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

-- Lectura: investigador y administrador
CREATE POLICY "Authenticated read competitors"
  ON public.competitors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'agente_investigador')
    )
  );

-- Escritura: investigador y administrador
CREATE POLICY "Authenticated write competitors"
  ON public.competitors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'agente_investigador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'agente_investigador')
    )
  );
```

**Nuevo valor en enum `user_role`:**
```sql
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agente_investigador';
```

**Actualización de `database.ts`:**
```typescript
export type UserRole = 'creativo' | 'admin_pagos' | 'administrador' | 'agente_investigador'
```

**Cálculo de métricas financieras (SQL queries)**:
- **Ingresos**: `SUM` de orders con status `entregado` (asumir precio fijo configurable, e.g., `$350 MXN`)
- **Costo IA**: `SUM(cost_usd)` de `ai_usage`
- **CAC**: Costo total de leads calificados / leads que convirtieron (orders entregados)
- **LTV**: Ingresos por cliente (V1: precio único por canción)
- **ROAS**: Ingresos / Inversión publicitaria (campo configurable)
- **ROI**: (Ingresos - Costo total) / Costo total × 100
- **Presupuesto IA**: `SUM(cost_usd)` de `ai_usage` vs. límite configurable en `localStorage` o tabla `settings`

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo fases. Las subtareas se generan al entrar a cada fase con el bucle agéntico.

### Fase 1: Base de Datos y Tipos
**Objetivo**: Agregar `agente_investigador` al enum de roles, crear tabla `competitors` con RLS, actualizar `database.ts` con los nuevos tipos (`Competitor`, `FinancialMetrics`).
**Validación**: La migración aplica sin errores. `npm run typecheck` pasa.

### Fase 2: Vista Creativo — Aprobación de Letras
**Objetivo**: Componente `CreativoView` que muestra orders en estado `letra_generada` con `story_text` y `lyrics_text`. Server Action `approve-lyrics` que avanza el status a `pago_pendiente`. El dashboard redirige a esta vista cuando el rol es `creativo`.
**Validación**: Un usuario con rol `creativo` ve la lista de letras pendientes y puede aprobar una.

### Fase 3: Vista Agente Investigador — Tabla de Competencia
**Objetivo**: Componente `InvestigadorView` con tabla editable (inline edit) de competidores. Server Actions `upsert-competitor` y `delete-competitor`. El dashboard redirige a esta vista cuando el rol es `agente_investigador`.
**Validación**: Un usuario con rol `agente_investigador` puede agregar, editar y eliminar competidores. Los cambios persisten en Supabase.

### Fase 4: Vista Agente Financiero — Métricas y Presupuesto
**Objetivo**: Componente `FinancieroView` con tarjetas de métricas (ROI, ROAS, CAC, LTV), gráfico de flujo de caja mensual (Recharts o similar, con dynamic import para SSR), y barra de presupuesto IA. Todas las métricas calculadas desde queries reales a Supabase. El dashboard redirige a esta vista cuando el rol es `admin_pagos`.
**Validación**: Las métricas muestran valores calculados (o `$0` si no hay datos). El gráfico renderiza sin errores de SSR.

### Fase 5: Vista Administrador — Panel Unificado
**Objetivo**: Componente `AdminView` con tabs (Letras, Competencia, Financiero, Pagos). Integra las 3 vistas anteriores más el `PaymentConfirmationPanel` existente. El `DashboardRouter` redirige a esta vista cuando el rol es `administrador`.
**Validación**: El administrador puede navegar entre los 4 tabs y ver los datos de cada uno.

### Fase 6: Integración Final y Refactor del Dashboard
**Objetivo**: Reemplazar `src/app/(main)/dashboard/page.tsx` con el nuevo `DashboardRouter` que delega a la vista correcta según el rol. Eliminar lógica de role-check dispersa en la página principal.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Cada rol ve solo su vista (verificado manualmente o con Playwright)
- [ ] El Administrador ve los 4 tabs funcionando
- [ ] No hay regresión en la funcionalidad de confirmación de pagos existente

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] Recharts (o cualquier librería de gráficos) requiere `dynamic import` con `{ ssr: false }` en Next.js App Router para evitar errores de hidratación
- [ ] El enum de Postgres `user_role` ya tiene valores existentes; usar `ADD VALUE IF NOT EXISTS` para no romper en re-run
- [ ] RLS de `competitors`: el rol `agente_investigador` no existe aún en la DB al momento de crear las políticas; la migración debe agregar el valor al enum ANTES de crear las políticas
- [ ] El presupuesto IA configurable puede guardarse en `localStorage` en V1 para evitar una tabla extra de settings
- [ ] `ai_cost_usd` en `orders` y `cost_usd` en `ai_usage` son en USD decimal; convertir a MXN para mostrar en UI (usar constante de tipo de cambio configurable)
- [ ] El status `letra_generada` ya existe en el enum de orders — no agregar duplicados
- [ ] Inline edit en la tabla de competidores: usar estado local + debounce o botón "Guardar" explícito para evitar demasiadas llamadas al Server Action

## Anti-Patrones

- NO crear un nuevo `page.tsx` por rol; usar un único `DashboardRouter` en el `page.tsx` existente
- NO duplicar la lógica de fetch de perfil/rol; centralizarla en el `page.tsx` que pasa el rol como prop
- NO ignorar errores de TypeScript con `any`; tipar correctamente las respuestas de Supabase
- NO hardcodear el precio por canción o el tipo de cambio; usar constantes en un archivo de configuración
- NO omitir `loading` / `empty state` en las vistas; cada vista debe manejar datos vacíos graciosamente

---

*PRP pendiente aprobación. No se ha modificado código.*

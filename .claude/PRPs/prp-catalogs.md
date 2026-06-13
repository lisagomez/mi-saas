# PRP-007: Catálogos — Promociones, Preferencias, Presupuesto y Dominio de Negocio

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-03-19
> **Proyecto**: CancioBot

---

## Objetivo

Construir la feature `catalogs` que centraliza en base de datos los cuatro catálogos configurables del negocio (promociones, preferencias musicales, presupuesto y dominio de negocio), expone un panel de administración para gestionarlos, e integra cada catálogo con los agentes y flujos que los consumen (bot de WhatsApp, generación de letra y agente financiero).

---

## Por Qué

| Problema | Solución |
|----------|----------|
| Las preferencias musicales están hardcodeadas en `music-prompt.ts`; cambiar un estilo requiere deploy | Moverlas a la tabla `preferences_catalog` y cargarlas desde DB en runtime |
| No existe control de promociones activas; el bot nunca oferta descuentos por ocasión especial | Tabla `promotions_catalog` + lógica de detección de ocasión en el bot |
| No hay control de presupuesto real; el `guardedAICall` del BUSINESS_LOGIC nunca fue implementado | Tablas `budgets` + `expenses` con guard de presupuesto activo en cada llamada IA |
| Las fórmulas del dominio de negocio no están en DB; el Agente Financiero no puede leerlas sin contexto | Tabla `business_domain` con registros nombre/fórmula/descripción consultables por el agente |

**Valor de negocio**: El administrador puede ajustar precios, estilos, presupuesto y fórmulas desde el panel sin tocar código; el bot oferta promociones en tiempo real; el presupuesto de IA deja de ser ilimitado (control de costos crítico para rentabilidad).

---

## Qué

### Criterios de Éxito

- [ ] El administrador puede crear/editar/desactivar promociones desde `/dashboard/catalogs/promotions`
- [ ] El bot identifica la ocasión del cliente y, si hay una promoción activa para esa ocasión, la menciona en el flujo post-calificación
- [ ] El administrador puede crear/editar/eliminar entradas de preferencias musicales desde `/dashboard/catalogs/preferences`
- [ ] `buildMusicPrompt` consulta `preferences_catalog` en DB en lugar del array hardcodeado en `music-prompt.ts`
- [ ] El administrador puede configurar presupuestos por categoría y período desde `/dashboard/catalogs/budget`
- [ ] Cada llamada a IA pasa por `guardedAICall`: si el gasto mensual >= límite, el pedido pasa a `requiere_procesamiento_manual` y el dashboard muestra alerta
- [ ] La tabla `business_domain` existe con las 9 fórmulas del BUSINESS_LOGIC.md §5 pre-cargadas vía seed
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso

### Comportamiento Esperado (Happy Path)

**Promociones:**
1. Administrador crea promoción "Día de las Madres — 15% off" con fechas 05-10 al 05-15 y ocasión `cumpleanos_madre`
2. Cliente inicia conversación y menciona "para el día de mi mamá"
3. El bot detecta la ocasión, consulta `promotions_catalog`, encuentra la promoción activa y la menciona: *"¡Qué onda! Tenemos una promoción especial del 15% off para el Día de las Madres..."*

**Preferencias Musicales:**
1. Administrador agrega entrada: región `oaxaca`, estilo `son istmeño`, directivas `son istmeño oaxaqueño, marimba, tempo 100-110 BPM`
2. Cliente de Oaxaca pide estilo `son`
3. `buildMusicPrompt` lee la nueva entrada desde DB y genera el prompt correcto

**Presupuesto:**
1. Administrador configura límite mensual de IA: $50 USD
2. El mes lleva $49.80 gastados
3. Llega nuevo pedido, el `guardedAICall` detecta que el próximo gasto superaría el límite
4. El pedido pasa a `requiere_procesamiento_manual`, el dashboard muestra alerta en rojo

**Dominio de Negocio:**
1. Agente Financiero consulta `business_domain` por nombre `ROI`
2. Recibe: `(Ganancia neta / Inversión total) × 100`
3. Aplica la fórmula con datos reales de la DB sin alucinaciones

---

## Contexto

### Referencias

- `src/features/orders/prompts/music-prompt.ts` — Catálogo de preferencias actual (hardcodeado, debe migrarse a DB)
- `src/features/whatsapp-bot/qualifier/services/run-qualifier.ts` — Punto de integración para detectar ocasión y ofrecer promoción
- `src/app/api/webhooks/whatsapp/route.ts` — Flujo principal donde se llama `buildMusicPrompt` y `generateLyrics`
- `src/features/dashboard/` — Patrón de UI para panel de administración (seguir estructura: components/hooks/services/store/types)
- `src/features/orders/services/generate-lyrics.ts` — Punto donde se debe integrar `guardedAICall`
- `supabase/migrations/20260316000002_leads_conversations_qualifier.sql` — Patrón de migración con RLS a seguir
- `src/types/database.ts` — Tipos globales de BD que deben actualizarse con las nuevas tablas
- `BUSINESS_LOGIC.md §4` — Definición completa de los 4 catálogos
- `BUSINESS_LOGIC.md §5` — Fórmulas del dominio de negocio (seed de `business_domain`)
- `BUSINESS_LOGIC.md §9` — Lógica de `guardedAICall` y routing de modelos

### Arquitectura Propuesta (Feature-First)

```
src/features/catalogs/
├── components/
│   ├── promotions/
│   │   ├── PromotionsList.tsx
│   │   ├── PromotionForm.tsx
│   │   └── PromotionCard.tsx
│   ├── preferences/
│   │   ├── PreferencesList.tsx
│   │   ├── PreferenceForm.tsx
│   │   └── PreferenceCard.tsx
│   ├── budget/
│   │   ├── BudgetOverview.tsx
│   │   ├── BudgetForm.tsx
│   │   └── BudgetProgressBar.tsx
│   └── business-domain/
│       ├── DomainList.tsx
│       └── DomainForm.tsx
├── hooks/
│   ├── usePromotions.ts
│   ├── usePreferences.ts
│   ├── useBudget.ts
│   └── useBusinessDomain.ts
├── services/
│   ├── get-active-promotion.ts       # Consulta promoción activa por ocasión
│   ├── detect-occasion.ts            # IA básica: extrae ocasión del texto del cliente
│   ├── build-music-prompt-db.ts      # Reemplaza music-prompt.ts usando DB
│   ├── guarded-ai-call.ts            # Budget guard antes de cada llamada IA
│   ├── get-monthly-spend.ts          # Suma ai_usage del mes actual
│   └── get-monthly-budget.ts         # Leer límite activo de budgets
├── store/
│   └── catalogs-store.ts
└── types/
    └── catalogs.ts
```

**Rutas del panel:**
```
src/app/(main)/dashboard/catalogs/
├── page.tsx                          # Índice de catálogos (4 tarjetas)
├── promotions/
│   ├── page.tsx
│   └── [id]/page.tsx
├── preferences/
│   ├── page.tsx
│   └── [id]/page.tsx
├── budget/
│   └── page.tsx
└── business-domain/
    └── page.tsx
```

**Server Actions:**
```
src/actions/catalogs/
├── promotions.ts
├── preferences.ts
├── budget.ts
└── business-domain.ts
```

### Modelo de Datos

```sql
-- Catálogo de promociones por ocasión y fechas
CREATE TABLE public.promotions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- "Día de las Madres 2026"
  occasion TEXT NOT NULL,                      -- "cumpleanos_madre", "boda", "aniversario", etc.
  description TEXT,                            -- Texto que el bot menciona
  discount_percent DECIMAL(5,2),               -- 15.00 = 15%
  discount_fixed_mxn DECIMAL(10,2),            -- O descuento fijo en MXN
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promotions_catalog ENABLE ROW LEVEL SECURITY;

-- Solo administrador puede gestionar; service role acceso total
CREATE POLICY "Service role full access promotions_catalog"
  ON public.promotions_catalog FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read promotions_catalog"
  ON public.promotions_catalog FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role::text IN ('administrador')
  ));

CREATE POLICY "Admin write promotions_catalog"
  ON public.promotions_catalog FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ));

-- Catálogo de preferencias musicales (migración del array hardcodeado)
CREATE TABLE public.preferences_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regions TEXT[] NOT NULL DEFAULT '{}',        -- keywords de origen/residencia
  styles TEXT[] NOT NULL,                      -- keywords de estilo musical
  directives TEXT NOT NULL,                    -- prompt para Suno/Freebeat
  sort_order INTEGER NOT NULL DEFAULT 100,     -- prioridad de matching (menor = primero)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.preferences_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access preferences_catalog"
  ON public.preferences_catalog FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read preferences_catalog"
  ON public.preferences_catalog FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role::text IN ('administrador', 'creativo')
  ));

CREATE POLICY "Admin write preferences_catalog"
  ON public.preferences_catalog FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ));

-- Presupuestos por categoría y período
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL                       -- 'ai_tokens', 'marketing', 'suscripciones', 'operacion'
    CHECK (category IN ('ai_tokens', 'marketing', 'suscripciones', 'operacion')),
  period_month DATE NOT NULL,                  -- primer día del mes: 2026-03-01
  limit_usd DECIMAL(12,2),                     -- límite en USD (para IA)
  limit_mxn DECIMAL(12,2),                     -- límite en MXN (para otras categorías)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, period_month)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access budgets"
  ON public.budgets FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin read write budgets"
  ON public.budgets FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ));

-- Gastos operativos (suscripciones, ads, etc. — los tokens van en ai_usage)
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL
    CHECK (category IN ('marketing', 'suscripciones', 'operacion')),
  description TEXT NOT NULL,
  amount_mxn DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access expenses"
  ON public.expenses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin read write expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ));

-- Dominio de negocio: fórmulas y benchmarks (skill reutilizable)
CREATE TABLE public.business_domain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                   -- "ROI", "LTV", "ROAS", etc.
  formula TEXT NOT NULL,                       -- "(Ganancia neta / Inversión total) × 100"
  description TEXT,                            -- contexto adicional
  category TEXT NOT NULL DEFAULT 'rentabilidad'
    CHECK (category IN ('rentabilidad', 'experiencia', 'operacion')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_domain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access business_domain"
  ON public.business_domain FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read business_domain"
  ON public.business_domain FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role::text IN ('administrador', 'agente_investigador')
  ));

CREATE POLICY "Admin write business_domain"
  ON public.business_domain FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'administrador'
  ));
```

**Seed obligatorio** (`preferences_catalog`): migrar las 10 entradas del array `CATALOG` en `music-prompt.ts`.

**Seed obligatorio** (`business_domain`): insertar las 10 fórmulas de `BUSINESS_LOGIC.md §5` (Margen neto, Punto de equilibrio, Flujo de caja, Retención, CAC, LTV, Ratio LTV/CAC, ROAS, ROI, NPS).

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migración de Base de Datos

**Objetivo**: Crear las 4 tablas (`promotions_catalog`, `preferences_catalog`, `budgets`, `expenses`, `business_domain`) con RLS correcto, seeds para preferencias musicales y dominio de negocio, y tipos TypeScript actualizados en `database.ts`.

**Validación**: Tablas visibles en Supabase; seeds aplicados; `database.ts` contiene los nuevos tipos sin errores de typecheck.

---

### Fase 2: Servicios de Catálogos (Backend)

**Objetivo**: Implementar todos los servicios de `src/features/catalogs/services/`:
- `get-active-promotion.ts` — consulta promoción activa para una ocasión y fecha actual
- `detect-occasion.ts` — IA básica que extrae ocasión especial del texto del cliente (cumpleaños, boda, aniversario, día de madres, etc.)
- `build-music-prompt-db.ts` — reemplaza `music-prompt.ts` consultando `preferences_catalog` en DB; fallback al hardcodeado si falla
- `guarded-ai-call.ts` — wrapper que verifica gasto mensual vs. límite en `budgets` antes de permitir llamada IA
- `get-monthly-spend.ts` — suma `cost_usd` de `ai_usage` del mes en curso
- `get-monthly-budget.ts` — lee el `limit_usd` activo de `budgets` para `ai_tokens` del mes en curso

**Validación**: Cada servicio tiene tipos correctos; typecheck pasa; los servicios de DB son async con manejo de errores explícito.

---

### Fase 3: Integración en Flujos Existentes

**Objetivo**: Conectar los nuevos servicios con los flujos ya existentes:

1. **WhatsApp bot** — Después de calificación positiva, llamar `detectOccasion` sobre el texto y `getActivePromotion`; si hay promoción, inyectarla en el mensaje de confirmación al cliente.
2. **`buildMusicPrompt`** — Actualizar `src/features/orders/prompts/music-prompt.ts` o el punto donde se llama en el webhook para usar `buildMusicPromptDb` con fallback al array local si la DB tarda o falla.
3. **`guardedAICall`** — Envolver las llamadas a `generateLyrics` y cualquier otra llamada IA en el webhook para pasar por el guard de presupuesto.

**Validación**: El flujo conversacional completo funciona sin errores; si la DB de preferencias está vacía, el fallback hardcodeado actúa; si el presupuesto está superado, el pedido queda en `requiere_procesamiento_manual`.

---

### Fase 4: Panel de Administración — Catálogos UI

**Objetivo**: Construir las páginas del panel de administración en `/dashboard/catalogs/` con las 4 secciones:

- **Promociones**: tabla con columnas nombre/ocasión/vigencia/estado + formulario crear/editar/toggle activo
- **Preferencias musicales**: tabla con columnas regiones/estilos/directivas + formulario con campos array editable
- **Presupuesto**: vista por mes con barras de progreso (gastado vs. límite) + formulario para configurar límite por categoría; tabla de gastos con formulario de registro manual
- **Dominio de negocio**: tabla de fórmulas nombre/fórmula/categoría + formulario crear/editar (solo admin)

Usar shadcn/ui, seguir el patrón de `src/features/dashboard/components/`.

**Validación**: Todas las rutas cargan sin errores; CRUD funciona para cada catálogo; solo el rol `administrador` puede acceder; Playwright screenshot confirma UI cargada.

---

### Fase 5: Validación Final

**Objetivo**: Sistema de catálogos funcionando end-to-end desde panel hasta bot.

**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma `/dashboard/catalogs` cargado con las 4 secciones
- [ ] Crear promoción desde UI → aparece en tabla → se activa en la fecha
- [ ] Crear nueva preferencia en UI → `buildMusicPromptDb` la usa en el próximo pedido
- [ ] Configurar presupuesto a $0.01 → próximo pedido de generación de letra pasa a `requiere_procesamiento_manual`
- [ ] Tabla `business_domain` tiene las 9 fórmulas del §5 pre-cargadas

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

_(Vacío — se llena durante la implementación)_

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] `build-music-prompt-db.ts` DEBE tener fallback al array hardcodeado de `music-prompt.ts` para el caso de error de red o DB lenta — el flujo conversacional no puede bloquearse por la DB de preferencias
- [ ] `detect-occasion.ts` usa el modelo BÁSICO (económico) — NO usar el modelo avanzado para una extracción simple
- [ ] El `guardedAICall` necesita manejar el caso donde NO existe un `budget` configurado para el mes: en ese caso NO debe bloquear (presupuesto ilimitado por defecto, hasta que el admin configure uno)
- [ ] Las columnas `regions` y `styles` de `preferences_catalog` son `TEXT[]` en Postgres — los comparisons de arrays deben usar `@>` o `unnest()`, no `IN`; en el servicio TypeScript se hace el matching en memoria después de traer todos los registros activos (igual que el array actual)
- [ ] Los Server Actions de catálogos solo son accesibles por el rol `administrador` — verificar sesión y rol en cada action con `getServerSession` antes de ejecutar la mutación
- [ ] Al migrar el seed de `preferences_catalog`, mantener el array original en `music-prompt.ts` como fallback hasta que la fase 3 esté completa

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan
- NO ignorar errores de TypeScript
- NO hardcodear valores (usar constantes)
- NO omitir validación Zod en inputs de usuario
- NO bloquear el flujo conversacional por errores en la DB de catálogos (siempre fallback graceful)
- NO eliminar el array hardcodeado de `music-prompt.ts` hasta que el seed de DB esté aplicado y verificado

---

*PRP pendiente aprobación. No se ha modificado código.*

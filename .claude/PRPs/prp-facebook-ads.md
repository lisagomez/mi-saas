# PRP-009: Facebook Ads — Tracking de Campañas, ROAS y Atribución de Leads

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-03-19
> **Proyecto**: CancioBot

---

## Objetivo

Implementar tracking completo de campañas de Facebook Ads en CancioBot: ingreso de datos de gasto por campaña (manual y/o vía Meta Marketing API), atribución de leads a campañas específicas extendiendo el campo `source` de la tabla `leads`, y cálculo real del ROAS en el Agente Financiero que actualmente devuelve `null`.

## Por Qué

| Problema | Solución |
|----------|----------|
| El Agente Financiero devuelve `roas: null` siempre porque no hay datos de campañas en la BD | Nueva tabla `facebook_campaigns` con gasto por campaña; el agente lee gasto real para calcular ROAS |
| No se sabe qué campaña de Facebook generó cada lead — el campo `source` solo dice `'facebook'` | Extender `source` para almacenar el `utm_campaign` o `campaign_id` proveniente del click en el anuncio |
| El Administrador no puede tomar decisiones de presupuesto de pauta sin ver qué campaña es rentable | Panel de Facebook Ads en el dashboard con tabla de campañas, gasto, leads atribuidos y ROAS por campaña |
| Ingresar el gasto de Facebook Ads manualmente es un proceso sin interfaz — hoy se hace como expense genérico | Formulario dedicado en el dashboard para crear/editar campañas y registrar gasto diario |

**Valor de negocio**: El Administrador puede ver en tiempo real cuáles campañas de Facebook generan leads que convierten, tomar decisiones de presupuesto basadas en ROAS real (no null), y reducir gasto en campañas no rentables.

## Qué

### Criterios de Éxito
- [ ] La tabla `facebook_campaigns` existe en Supabase con RLS habilitado
- [ ] El campo `source` de `leads` puede almacenar un `campaign_id` o `utm_campaign` (cadena libre) y el webhook de WhatsApp lo popula cuando viene de un clic de anuncio
- [ ] El formulario en el dashboard permite al Administrador crear campañas y registrar gasto manual (sin Meta Marketing API en fase inicial)
- [ ] El Agente Financiero calcula `roas` como `ingresos_atribuidos / gasto_campaña` y ya no devuelve `null` cuando existen datos de campañas
- [ ] El dashboard muestra un tab "Facebook Ads" con tabla de campañas: nombre, gasto, leads, leads calificados, pedidos entregados, ingresos atribuidos y ROAS por campaña
- [ ] Los tipos en `database.ts` y `EnrichedFinancialMetrics` reflejan el ROAS como `number | null` (no `null` fijo)

### Comportamiento Esperado

**Happy Path — ingreso manual de campaña:**
1. Administrador abre el tab "Facebook Ads" en el dashboard
2. Crea una nueva campaña: nombre, fecha inicio, fecha fin (opcional), presupuesto estimado
3. Registra gasto diario o acumulado en la campaña
4. El sistema muestra leads atribuidos a esa campaña (filtrados por `source = campaign_id`)
5. Si esos leads tienen pedidos entregados, calcula ingresos atribuidos
6. ROAS = ingresos atribuidos / gasto registrado — visible en la tabla y en las métricas del Agente Financiero

**Happy Path — atribución automática desde WhatsApp:**
1. Cliente hace clic en anuncio de Facebook → WhatsApp con `utm_campaign=navidad2026` en el deeplink
2. Webhook recibe el primer mensaje, extrae el parámetro UTM del `referral` del webhook de WhatsApp Business API
3. `getOrCreateLead` guarda `source = 'fb_navidad2026'` (prefijado con `fb_`) en la tabla `leads`
4. El panel muestra ese lead como atribuido a la campaña correspondiente

---

## Contexto

### Referencias
- `src/features/agents/financial/services/run-financial-agent.ts` — Agente Financiero con `roas: null` hardcodeado en línea 113; aquí se agrega el cálculo real
- `src/features/dashboard/services/get-financial-metrics.ts` — Servicio más simple también con `roas: null`; sincronizar ambos
- `src/features/dashboard/components/admin-view.tsx` — Aquí se agrega el tab "Facebook Ads" (TABS array en línea 40)
- `src/features/dashboard/components/financiero-view.tsx` — Componente que muestra métricas; agregar sección ROAS
- `src/features/whatsapp-bot/services/get-or-create-lead.ts` — Aquí se extiende para recibir `campaign_id` desde el webhook
- `src/types/database.ts` — Interfaces `EnrichedFinancialMetrics` (línea 230) y `FinancialMetrics` (línea 125); `roas: null` fijo debe cambiar a `number | null`
- `src/features/catalogs/components/BudgetPanel.tsx` — Patrón de UI para formularios de ingreso de datos del dashboard
- `src/features/dashboard/components/investigador-view.tsx` — Patrón para tabla editable en dashboard

### Arquitectura Propuesta (Feature-First)
```
src/features/facebook-ads/
├── components/
│   ├── FacebookAdsPanel.tsx        # Panel principal con tabla de campañas
│   ├── CampaignForm.tsx            # Formulario crear/editar campaña
│   └── CampaignSpendForm.tsx       # Formulario registrar gasto
├── services/
│   ├── create-campaign.ts          # Server Action: crear campaña
│   ├── update-campaign.ts          # Server Action: editar campaña
│   ├── log-campaign-spend.ts       # Server Action: registrar gasto
│   ├── get-campaigns-with-metrics.ts # Query: campañas + leads + ingresos + ROAS
│   └── delete-campaign.ts          # Server Action: eliminar campaña
└── types/
    └── facebook-ads.ts             # Tipos locales (CampaignWithMetrics, etc.)
```

### Modelo de Datos

```sql
-- Tabla principal de campañas
CREATE TABLE facebook_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  campaign_id_meta TEXT NULL,        -- ID de Meta (opcional, para futura API)
  source_key    TEXT NOT NULL UNIQUE, -- Clave para matching con leads.source (ej: 'fb_navidad2026')
  start_date    DATE NOT NULL,
  end_date      DATE NULL,
  budget_mxn    NUMERIC(12,2) NULL,  -- Presupuesto estimado
  notes         TEXT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de gasto por campaña (puede haber múltiples entradas por campaña)
CREATE TABLE campaign_spend (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES facebook_campaigns(id) ON DELETE CASCADE,
  spend_date      DATE NOT NULL,
  amount_mxn      NUMERIC(12,2) NOT NULL,
  notes           TEXT NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_spend ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden leer y escribir campañas y gastos
CREATE POLICY "Administradores: full access campaigns"
  ON facebook_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

CREATE POLICY "Administradores: full access campaign_spend"
  ON campaign_spend FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );
```

**Atribución de leads:** La tabla `leads` ya tiene el campo `source` (TEXT). La convención será:
- Leads orgánicos: `source = 'facebook'` (actual)
- Leads de campaña específica: `source = 'fb_{source_key}'` donde `source_key` viene del deeplink o UTM
- El servicio `get-campaigns-with-metrics.ts` hace un JOIN entre `facebook_campaigns.source_key` y `leads.source LIKE 'fb_%'`

**No se requiere ALTER TABLE en `leads`** — el campo `source` ya es TEXT libre y puede almacenar el valor extendido.

**Cálculo ROAS en el Agente Financiero:**
```
ROAS = SUM(ingresos de pedidos entregados atribuidos a campaña) / SUM(gasto de campaña)
```
El Agente Financiero calcula el ROAS global (todas las campañas). El panel de Facebook Ads muestra el ROAS por campaña.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Base de Datos
**Objetivo**: Crear y aplicar las migraciones de `facebook_campaigns` y `campaign_spend` con RLS correcto. Actualizar tipos en `database.ts` (interfaces `FacebookCampaign`, `CampaignSpend`, `CampaignWithMetrics`). Actualizar `EnrichedFinancialMetrics.roas` de `null` fijo a `number | null`.
**Validación**: `npm run typecheck` pasa; las tablas aparecen en Supabase con RLS activo.

### Fase 2: Servicios Backend
**Objetivo**: Implementar los Server Actions y queries en `src/features/facebook-ads/services/`: crear, editar, eliminar campañas; registrar gasto; consultar campañas con métricas (leads atribuidos, ingresos atribuidos, ROAS por campaña). Actualizar `run-financial-agent.ts` para calcular `roas` global real (suma de ingresos atribuidos / suma de gasto total en campañas). Actualizar `get-financial-metrics.ts` de forma consistente.
**Validación**: `npm run typecheck` pasa; los servicios retornan datos correctos en consola.

### Fase 3: Atribución desde WhatsApp
**Objetivo**: Extender `get-or-create-lead.ts` para aceptar un parámetro `campaignSource?: string` y persistirlo en `leads.source`. Verificar qué campo del webhook de WhatsApp Business API lleva el parámetro de referral/UTM y extraerlo en el webhook handler. Si el referral no incluye un `source_key` reconocido, default a `'facebook'`.
**Validación**: En prueba manual, crear un lead con `source = 'fb_test'` y verificar que el query de atribución lo asocia a la campaña con `source_key = 'test'`.

### Fase 4: UI — Panel de Facebook Ads
**Objetivo**: Implementar `FacebookAdsPanel.tsx` con tabla de campañas (nombre, gasto total, leads, leads calificados, pedidos entregados, ingresos atribuidos, ROAS), formulario para crear campaña y formulario para registrar gasto. Agregar el tab "📣 Facebook Ads" en `admin-view.tsx`. Agregar métrica ROAS en `financiero-view.tsx` (ya no es null fijo).
**Validación**: Playwright screenshot confirma que el tab aparece, la tabla se renderiza y el formulario de creación funciona.

### Fase 5: Validación Final
**Objetivo**: Sistema de Facebook Ads funcionando end-to-end.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma UI del panel con tab "Facebook Ads"
- [ ] Crear campaña → registrar gasto → verificar ROAS en panel y en Agente Financiero
- [ ] Lead con `source = 'fb_{key}'` aparece atribuido a la campaña correspondiente
- [ ] `EnrichedFinancialMetrics.roas` devuelve un número real (no null) cuando hay datos

---

## Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

*(Sin aprendizajes aún — se agregarán durante la implementación)*

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] `EnrichedFinancialMetrics.roas` está tipado como `null` literal (no `number | null`) en `database.ts` línea 239 — cambiar esto antes de intentar asignar un número real o TypeScript lanzará error
- [ ] `FinancialMetrics` (usado en `financiero-view.tsx`) y `EnrichedFinancialMetrics` (usado en `FinancialAgentPanel`) son dos interfaces separadas — ambas deben actualizarse en paralelo
- [ ] El campo `source` en `leads` es TEXT libre — no hay FK a `facebook_campaigns`; la atribución se hace por matching de string (`leads.source = 'fb_' || campaigns.source_key`), no por FK. Documentar esta convención en los servicios
- [ ] El webhook de WhatsApp Business API incluye un objeto `referral` en el primer mensaje cuando el usuario llega desde un anuncio de Click-to-WhatsApp. El campo relevante es `referral.source_url` o `referral.headline` — verificar la documentación exacta de Meta antes de implementar la Fase 3
- [ ] Meta Marketing API requiere un token de acceso de larga duración con permisos `ads_read` — esta integración es opcional en V1 (ingreso manual primero). Documentar claramente en la UI que la sincronización automática con Meta es una mejora futura
- [ ] RLS: solo el rol `administrador` puede acceder a campañas y gastos — verificar que el Agente Financiero usa `createAdminClient()` (ya lo hace) para leer los datos sin restricción de RLS

## Anti-Patrones

- NO crear una FK desde `leads.source` a `facebook_campaigns` — el campo source es multi-propósito y puede tener valores como `'facebook'`, `'organic'`, etc.
- NO hardcodear el ROAS como `null` en ningún código nuevo — si no hay datos, usar la función `insuf('ROAS')` existente en el Agente Financiero
- NO ignorar errores de TypeScript en las interfaces — el cambio de `roas: null` a `roas: number | null` puede romper componentes que asumen `null` siempre
- NO omitir validación Zod en los Server Actions de campañas y gastos
- NO implementar la integración con Meta Marketing API en esta versión — scope creep; ingreso manual primero

---

*PRP pendiente aprobación. No se ha modificado código.*

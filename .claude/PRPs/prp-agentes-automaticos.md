# PRP-008: Agentes Automáticos — Investigador, Financiero-Contable y Promociones

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-19
> **Proyecto**: CancioBot

---

## Objetivo

Implementar tres agentes automáticos con IA que operen sin intervención humana:
1. **Agente Investigador** — monitorea competencia periódicamente y calcula CAC/LTV con datos reales del sistema (sin alucinaciones).
2. **Agente Financiero-Contable** — mantiene métricas ROI/ROAS/LTV usando las fórmulas exactas de `business_domain` con datos de `budgets`, `expenses` y `ai_usage`.
3. **Agente de Promociones** — envía campañas segmentadas de recompra via WhatsApp usando `promotions_catalog`.

---

## Por Qué

| Problema | Solución |
|----------|----------|
| El Administrador no tiene visibilidad automática de qué hace la competencia ni cuándo cambia sus precios | El Agente Investigador analiza la tabla `competitors` periódicamente y genera un reporte de ventaja/desventaja/solución con recomendaciones |
| Las métricas financieras del dashboard son estáticas y usan fórmulas hardcodeadas con datos parciales (solo `ai_usage`, no `expenses` ni `budgets`) | El Agente Financiero-Contable lee las fórmulas exactas de `business_domain` y los datos de `budgets` + `expenses` + `ai_usage` para calcular ROI, ROAS, LTV, CAC, punto de equilibrio y flujo de caja reales |
| Los clientes que compraron no reciben seguimiento para recompra. El proceso es completamente manual | El Agente de Promociones consulta `rebuys`, identifica clientes elegibles por ocasión/fecha, y envía mensajes via WhatsApp con la promoción vigente del catálogo |

**Valor de negocio**: Los tres agentes eliminan trabajo manual del Administrador y generan ingresos por recompra sin costo de tiempo humano. El Agente de Promociones puede reactivar clientes inactivos de forma autónoma.

---

## Qué

### Criterios de Éxito

- [ ] El Agente Investigador se ejecuta como Server Action y genera un análisis de competencia con tabla ventaja/desventaja/solución/estrategia usando IA. Si `competitors` tiene menos de 2 registros → reporta "Datos insuficientes"
- [ ] El Agente Financiero-Contable calcula ROI, ROAS, CAC, LTV, punto de equilibrio y flujo de caja usando SOLO datos reales de BD (`expenses`, `budgets`, `ai_usage`, `orders`, `leads`). Ninguna fórmula hardcodeada fuera de `business_domain`
- [ ] El Agente de Promociones identifica leads con al menos un pedido `entregado` y sin recompra en los últimos 30 días, selecciona la promoción vigente, y envía mensaje de recompra via WhatsApp
- [ ] Los tres agentes son ejecutables manualmente desde el dashboard del Administrador (botón "Ejecutar ahora")
- [ ] Cada ejecución de agente registra costo en `ai_usage` y pasa por `guardedAiCall`
- [ ] Si no hay datos suficientes para una métrica, el agente reporta explícitamente "Datos insuficientes para calcular [métrica]" — nunca alucina un número

### Comportamiento Esperado

**Agente Investigador:**
1. Admin hace clic en "Ejecutar Agente Investigador" en el dashboard → tab Competencia
2. El agente lee todos los registros de `competitors`
3. Si hay menos de 2 competidores → retorna reporte vacío con aviso "Datos insuficientes"
4. Con datos suficientes → llama a IA (modelo básico vía `guardedAiCall`) con los datos de competencia
5. IA genera tabla: ventaja CancioBot, desventaja, estrategia de respuesta, recomendación de precio
6. El análisis se muestra en el tab Competencia como panel de reporte debajo de la tabla manual
7. El análisis se persiste en una nueva tabla `agent_reports` para histórico

**Agente Financiero-Contable:**
1. Admin abre tab Financiero → panel de Agente Financiero-Contable
2. Admin hace clic en "Recalcular métricas"
3. El agente lee:
   - `orders` (status=entregado) → ingresos reales (precio por pedido de `business_domain`)
   - `expenses` → gastos reales por categoría
   - `budgets` → límites por período
   - `ai_usage` → costo total tokens
   - `leads` → totales y convertidos
4. Aplica fórmulas de `business_domain` (las que tienen `is_active=true`) en orden: CAC → LTV → ROI → ROAS → punto_equilibrio → flujo_caja
5. Si una métrica no tiene datos suficientes → "Datos insuficientes para calcular [nombre]"
6. Resultado actualiza el estado del componente `FinancieroView` con métricas enriquecidas
7. Ejecución registrada en `ai_usage` (sin costo si no hubo llamada IA, o con costo si se usó IA para interpretar)

**Agente de Promociones:**
1. Admin abre tab Promociones → panel de Agente Promociones
2. Admin selecciona promoción activa del catálogo (o deja que el agente elija la vigente por fecha)
3. Admin hace clic en "Vista previa de campaña" → el agente muestra lista de destinatarios elegibles
   - Criterio: `orders.status = 'entregado'` + sin `rebuys` en últimos 30 días
4. Admin aprueba → el agente envía mensajes via `sendWhatsAppMessage` a cada lead
5. Cada envío se registra en `rebuys` con `lead_id`, `promotion_id`, `sent_at`
6. Dashboard muestra progreso: "X de Y mensajes enviados"

---

## Contexto

### Referencias

- `src/features/catalogs/services/guarded-ai-call.ts` — wrapper de presupuesto, USAR SIEMPRE para llamadas IA
- `src/features/catalogs/services/get-monthly-spend.ts` — gasto mensual acumulado
- `src/features/dashboard/services/get-financial-metrics.ts` — métricas actuales (parciales, este agente las reemplaza)
- `src/features/dashboard/components/investigador-view.tsx` — tabla de competencia existente, el agente añade panel de análisis debajo
- `src/features/dashboard/components/financiero-view.tsx` — panel financiero existente, el agente enriquece sus métricas
- `src/features/whatsapp-bot/services/send-whatsapp-message.ts` — envío de mensajes WhatsApp
- `src/features/catalogs/services/get-active-promotion.ts` — obtener promoción vigente por ocasión
- `src/types/database.ts` — tipos `BusinessDomain`, `Expense`, `Budget`, `PromotionsCatalog`, `FinancialMetrics`
- `src/features/dashboard/components/admin-view.tsx` — AdminView con tabs, aquí se integran los botones de agentes

### Arquitectura Propuesta (Feature-First)

```
src/features/agents/
├── investigator/
│   ├── services/
│   │   ├── run-investigator-agent.ts    # Server Action principal
│   │   └── build-competitor-analysis.ts # Prompt + llamada IA
│   ├── prompts/
│   │   └── investigator-prompt.ts       # System prompt del agente
│   ├── types/
│   │   └── investigator-result.ts       # Tipo InvestigatorReport
│   └── components/
│       └── investigator-agent-panel.tsx # Panel de resultado + botón ejecutar
│
├── financial/
│   ├── services/
│   │   ├── run-financial-agent.ts       # Server Action principal
│   │   └── compute-metrics.ts           # Lógica de cálculo con business_domain
│   ├── types/
│   │   └── financial-result.ts          # Tipo EnrichedFinancialMetrics
│   └── components/
│       └── financial-agent-panel.tsx    # Panel de métricas enriquecidas + botón
│
└── promotions/
    ├── services/
    │   ├── run-promotions-agent.ts      # Server Action principal
    │   ├── get-rebuy-candidates.ts      # Query leads elegibles para recompra
    │   └── send-rebuy-campaign.ts       # Envío masivo via sendWhatsAppMessage
    ├── types/
    │   └── promotions-result.ts         # Tipo CampaignResult
    └── components/
        └── promotions-agent-panel.tsx   # Selector de promo + preview + botón enviar
```

### Modelo de Datos

```sql
-- Tabla para histórico de reportes de agentes
CREATE TABLE agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL CHECK (agent_type IN ('investigator', 'financial', 'promotions')),
  report_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  ai_usage_id UUID REFERENCES ai_usage(id)
);

ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo administradores leen agent_reports"
  ON agent_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- Tabla rebuys (si no existe aún)
CREATE TABLE IF NOT EXISTS rebuys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  promotion_id UUID REFERENCES promotions_catalog(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

ALTER TABLE rebuys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo administradores acceden a rebuys"
  ON rebuys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );
```

**Nota**: Las tablas `budgets`, `expenses`, `business_domain`, `ai_usage`, `promotions_catalog`, `leads`, `orders` ya existen en BD con sus tipos definidos en `src/types/database.ts`.

### Fórmulas del Agente Financiero (fuente: business_domain)

El agente debe leer las fórmulas con `is_active = true` de la tabla `business_domain`. Las fórmulas canónicas del BUSINESS_LOGIC.md (sección 5) son:

| Métrica | Fórmula |
|---------|---------|
| CAC | `Gasto total en adquisición / Nuevos clientes adquiridos` → `SUM(expenses WHERE category='marketing') / COUNT(leads WHERE qualification_status='calificado')` |
| LTV | `Ticket promedio × Frecuencia × Tiempo retención × Margen` → `AVG(ingresos por cliente) × (orders_entregados / leads_calificados) × meses_activos × margen_neto` |
| ROI | `(Ingresos - Todos los gastos) / Todos los gastos × 100` |
| ROAS | `Ingresos atribuibles a campaña / Gasto en campaña` — requiere datos Facebook Ads (reportar "Sin datos" si no hay) |
| Punto de equilibrio | `Gastos fijos / Margen de contribución promedio` |
| Flujo de caja | `Ingresos confirmados - Gastos comprometidos del período` |

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Modelo de datos y tipos

**Objetivo**: Crear tabla `agent_reports` y tabla `rebuys` en Supabase con RLS. Actualizar `src/types/database.ts` con los nuevos tipos (`AgentReport`, `Rebuy`, `InvestigatorReport`, `EnrichedFinancialMetrics`, `CampaignResult`).
**Validación**: `npm run typecheck` sin errores. Las tablas existen en Supabase con RLS habilitado.

### Fase 2: Agente Investigador — servicio y componente

**Objetivo**: Implementar `run-investigator-agent.ts` (Server Action) que lee `competitors`, invoca IA vía `guardedAiCall` con el prompt del agente, genera tabla de análisis y persiste en `agent_reports`. Crear `investigator-agent-panel.tsx` con botón "Ejecutar" y visualización del reporte más reciente.
**Validación**: Botón en dashboard ejecuta el agente. El análisis aparece en pantalla. El registro se guarda en `agent_reports`. Si hay menos de 2 competidores → muestra aviso "Datos insuficientes".

### Fase 3: Agente Financiero-Contable — servicio y componente

**Objetivo**: Implementar `run-financial-agent.ts` que calcula métricas financieras completas leyendo `expenses`, `budgets`, `ai_usage`, `orders` y `leads`. Usa las fórmulas de `business_domain` (las filas con `is_active=true`). Reemplaza el cálculo parcial de `get-financial-metrics.ts`. Crea `financial-agent-panel.tsx` con el set completo de métricas, indicador de datos insuficientes por métrica, y botón "Recalcular".
**Validación**: Panel muestra ROI, CAC, LTV, punto de equilibrio y flujo de caja. Métricas sin datos muestran "Sin datos". `get-financial-metrics.ts` puede seguir existiendo para compatibilidad pero el agente enriquece las métricas.

### Fase 4: Agente de Promociones — servicio y componente

**Objetivo**: Implementar `get-rebuy-candidates.ts` que consulta leads con pedidos `entregado` y sin `rebuys` en últimos 30 días. Implementar `send-rebuy-campaign.ts` que envía mensajes via `sendWhatsAppMessage` con texto de la promoción formateado por `formatPromotionMessage`. Registrar cada envío en `rebuys`. Crear `promotions-agent-panel.tsx` con selector de promoción, preview de destinatarios y botón de envío con progreso.
**Validación**: Panel muestra lista de candidatos. Al confirmar, mensajes se envían y se registran en `rebuys`. El panel actualiza el contador de enviados.

### Fase 5: Integración en AdminView y dashboard

**Objetivo**: Integrar los tres paneles de agentes en `admin-view.tsx`. Agregar tab "Agentes" al AdminView con sub-tabs para cada agente. Asegurar que solo el rol `administrador` puede ver y ejecutar los agentes.
**Validación**: Tab "Agentes" visible solo para administrador. Los tres agentes son accesibles desde un solo lugar. No hay regresiones en las otras tabs.

### Fase 6: Validación Final

**Objetivo**: Sistema de agentes funcionando end-to-end sin errores de tipos ni build.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma que los tres paneles de agentes son visibles en el tab Agentes
- [ ] Agente Investigador ejecuta y muestra análisis (o aviso de datos insuficientes)
- [ ] Agente Financiero-Contable calcula métricas reales de BD
- [ ] Agente Promociones muestra candidatos y permite enviar campaña
- [ ] Todos los criterios de éxito del PRP cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

### 2026-05-14: Integración con capa de estrategia proactiva
- **Decisión**: Tras finalizar `avatar-research`, se dispara automáticamente el skill `strategy-bridge`.
- **Flujo añadido**: `agent_reports (avatar_research)` → `avatars` → `avatar_insights` → `proactive_insights (status=pending)` → `content-prompt-gen`.
- **Trazabilidad**: El `avatar_id` viaja desde el INSERT en `avatars` hasta `proactive_insights.avatar_id` y `avatar_insights.avatar_id`. El `agent_report_id` en `avatars` cierra el círculo hacia el reporte fuente.
- **Skill nuevo**: `.claude/skills/strategy-bridge/SKILL.md` — bridge entre investigación y estrategia de contenido.

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] **`guardedAiCall` es obligatorio** — toda llamada IA debe pasar por `src/features/catalogs/services/guarded-ai-call.ts`. Nunca llamar a IA directamente
- [ ] **Nunca alucinar métricas** — si `COUNT(leads) = 0` o `SUM(expenses) = 0`, retornar `null` con mensaje "Datos insuficientes para calcular [métrica]", no calcular con cero
- [ ] **ROAS requiere Facebook Ads** — la tabla `expenses` tiene categoría `marketing` pero no tiene atribución por campaña. ROAS debe reportarse como "Sin datos" hasta que exista la feature `facebook-ads`
- [ ] **`rebuys` puede no existir** — verificar si la tabla existe en Supabase antes de migrar. El BUSINESS_LOGIC.md la lista como tabla sugerida pero no confirmada
- [ ] **Server Actions con `'use server'`** — los servicios de agentes son Server Actions (llamados desde Client Components con botón), deben llevar `'use server'` al inicio
- [ ] **`dynamic import` para charts** — si `financial-agent-panel.tsx` incluye gráficas (Recharts), usar `dynamic` con `ssr: false` igual que `CashFlowChart` en `financiero-view.tsx`
- [ ] **Tab Agentes solo para `administrador`** — el rol `agente_investigador` que existe en `UserRole` no debe tener acceso a ejecutar agentes, solo el `administrador`
- [ ] **LTV formula multi-variable** — la fórmula completa requiere "tiempo de retención". Con datos actuales solo hay ticket promedio. Calcular lo que sea posible y anotar qué falta

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan (reusar `guardedAiCall`, `sendWhatsAppMessage`, `formatPromotionMessage`)
- NO ignorar errores de TypeScript
- NO hardcodear fórmulas financieras fuera de `business_domain` — leer siempre de BD
- NO omitir validación Zod en inputs de usuario (selector de promoción, filtros del agente)
- NO exponer el panel de agentes a roles que no sean `administrador`
- NO enviar campaña sin previa confirmación del admin (siempre mostrar vista previa primero)

---

*PRP pendiente aprobación. No se ha modificado código.*

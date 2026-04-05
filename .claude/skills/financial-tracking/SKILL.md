---
name: financial-tracking
description: "Seguimiento financiero completo de CancioBot: ingresos, gastos, ROI, ROAS, CAC, LTV, flujo de caja y presupuesto por categoría. Activar cuando el usuario dice: métricas financieras, cuánto estamos ganando, gastos, presupuesto, ROI, ROAS, CAC, LTV, flujo de caja, agente financiero."
allowed-tools: Read, Edit, Write, Bash, mcp__supabase__execute_sql, mcp__supabase__apply_migration
---

# Financial Tracking — CancioBot

Sistema de seguimiento financiero que calcula métricas reales desde la base de datos.
No usa IA para los cálculos — matemática pura sobre datos reales.

---

## Arquitectura

### Dos servicios financieros (no duplicados — sirven propósitos distintos)

| Servicio | Archivo | Usa | Para |
|----------|---------|-----|------|
| `getFinancialMetrics()` | `src/features/dashboard/services/get-financial-metrics.ts` | Solo `ai_usage` | Dashboard en tiempo real (admin_pagos + administrador) |
| `runFinancialAgent()` | `src/features/agents/financial/services/run-financial-agent.ts` | `expenses` + `ai_usage` + Facebook Ads | Análisis completo bajo demanda, persiste en `agent_reports` |

### Tablas involucradas

| Tabla | Qué guarda |
|-------|------------|
| `expenses` | Gastos manuales (marketing, suscripciones, operacion) en `amount_mxn` |
| `budgets` | Límites por categoría por mes (`limit_usd` para ai_tokens, `limit_mxn` para el resto) |
| `ai_usage` | Costo IA real en USD por llamada (logeado automáticamente por `guardedAiCall`) |
| `orders` | Pedidos entregados → ingresos (`status = 'entregado'`) |
| `campaign_spend` | Gasto en Facebook Ads por campaña en USD |
| `facebook_campaigns` | Campañas con `source_key` para atribución de leads |
| `agent_reports` | Reportes financieros históricos (`agent_type = 'financial'`) |

### Variables de entorno financieras

| Variable | Descripción | Default |
|----------|-------------|---------|
| `SONG_PRICE_USD` | Precio de canción en USD | 25 |
| `USD_TO_MXN` | Tasa de cambio para convertir expenses MXN → USD | 17 |

---

## Métricas Calculadas

### En `runFinancialAgent()` (completo)

```
Ingresos totales = ordersDelivered × SONG_PRICE_USD
Gastos totales   = Σ(expenses.amount_mxn × MXN_TO_USD) + totalAiCostUsd

ROI  = (Ingresos - Gastos) / Gastos × 100
CAC  = Gasto marketing / leads calificados
LTV  = Ingresos / pedidos entregados  (ticket promedio)
ROAS = ingresos atribuidos a FB / gasto FB   (desde facebook_campaigns + campaign_spend)
Punto equilibrio = gastos fijos / SONG_PRICE_USD  (gastos fijos = suscripciones + operacion)
Flujo de caja = Ingresos - Gastos del período
Costo IA mes   = Σ(ai_usage.cost_usd) del mes en curso
Flujo mensual  = últimos 6 meses de ingresos por pedidos entregados
```

### En `getFinancialMetrics()` (simplificado para dashboard)

```
ROI  = (Ingresos - CostoIA) / CostoIA × 100   ← solo costo IA, no gastos completos
CAC  = CostoIA / leadsCalificados              ← solo costo IA
LTV  = Ingresos / pedidosEntregados
ROAS = desde getGlobalRoas() (Facebook Ads)
```

> **Diferencia clave**: `getFinancialMetrics` no incluye expenses manuales (marketing, suscripciones). Úsalo para una vista rápida. Para el análisis real usa `runFinancialAgent`.

---

## Flujo de Datos

### Registro de gasto manual
1. Dashboard → Catálogos → Presupuesto → "Registrar gasto"
2. Se guarda en `expenses` (amount_mxn, category, description, expense_date)
3. `runFinancialAgent()` lo incluye automáticamente en el cálculo

### Costo IA (automático)
1. `guardedAiCall()` en `src/features/catalogs/services/guarded-ai-call.ts`
2. Envuelve toda llamada IA y loguea en `ai_usage` (tokens + cost_usd)
3. Si supera el `budgets.limit_usd` para `ai_tokens` → lanza `BudgetLimitError`
4. El costo mensual se lee con `getMonthlySpend()`

### Ingresos (automático)
1. Cuando admin confirma pago → `status = 'pago_confirmado'`
2. Cuando se entrega canción → `status = 'entregado'`
3. El agente financiero cuenta `orders.status = 'entregado'` × `SONG_PRICE_USD`

### Atribución Facebook Ads
1. Lead llega por WhatsApp con UTM → `leads.source = 'fb_{utm_campaign}'`
2. Si el lead tiene un pedido entregado → se atribuye a esa campaña
3. ROAS = ingresos atribuidos / gasto registrado en `campaign_spend`

---

## Categorías de Gastos

| Categoría | Moneda | Descripción |
|-----------|--------|-------------|
| `marketing` | MXN | Gasto en anuncios, promociones |
| `suscripciones` | MXN | OpenRouter, Vercel, Supabase, etc. |
| `operacion` | MXN | Gastos operativos varios |
| `ai_tokens` | USD | Controlado automáticamente por `guardedAiCall` |

> `marketing` y `suscripciones` + `operacion` forman los "gastos fijos" para el punto de equilibrio.
> Solo `marketing` se usa para calcular el CAC.

---

## Roles que ven métricas financieras

| Rol | Qué ve |
|-----|--------|
| `admin_pagos` | `FinancieroView` (getFinancialMetrics) + confirmación de pagos |
| `administrador` | Todo lo anterior + `FinancialAgentPanel` (runFinancialAgent) + Facebook Ads |

---

## Cómo agregar una nueva métrica

1. Agregar el campo a `EnrichedFinancialMetrics` en `src/types/database.ts`
2. Calcularla en `run-financial-agent.ts` dentro de `runFinancialAgent()`
3. Agregar `MetricCard` en `FinancialAgentPanel.tsx`
4. Si aplica también al dashboard rápido: agregar en `get-financial-metrics.ts` y `FinancieroView`

---

## Cómo agregar una categoría de gasto

1. Agregar el valor al union type `ExpenseCategory` en `src/types/database.ts`
2. Agregar la opción al `<select>` en `BudgetPanel.tsx`
3. Agregar la entrada a `BUDGET_CATEGORIES` array en `BudgetPanel.tsx`
4. Crear la migración en Supabase si el tipo es un `enum`:

```sql
ALTER TYPE expense_category ADD VALUE 'nueva_categoria';
```

---

## Bugs Corregidos

### ROAS hardcodeado como "Sin datos" en FinancialAgentPanel
**Fecha:** 2026-04-05
**Causa:** `value="Sin datos"` hardcodeado en lugar de leer `metrics.roas`.
**Fix:** `value={metrics.roas !== null ? \`${metrics.roas.toFixed(2)}x\` : 'Sin datos'}`.

### CAC y LTV mostraban "MXN" siendo valores en USD
**Fecha:** 2026-04-05
**Causa:** El servicio convierte todos los gastos a USD pero el panel mostraba "MXN" en la etiqueta.
**Fix:** Cambiar sufijo de `' MXN'` a `' USD'` en las MetricCards de CAC y LTV.

---

## Errores Comunes

### Todas las métricas muestran "Sin datos"
**Causa:** No hay gastos registrados en `expenses` ni ventas en `orders`.
**Fix:** Registrar al menos un gasto en Catálogos → Presupuesto y tener al menos un pedido con `status = 'entregado'`.

### ROI negativo o muy bajo
**Causa esperada:** Normal al inicio. Indica que los gastos superan los ingresos.
**No es un bug** — es la función correcta del sistema.

### ROAS siempre "Sin datos"
**Causa:** No hay registros en `campaign_spend` o `facebook_campaigns`.
**Fix:** Dashboard → Facebook Ads → registrar campañas y sus gastos.

### Costo IA no aparece
**Causa:** Las llamadas IA no pasan por `guardedAiCall()`.
**Fix:** Todas las llamadas IA deben usar `guardedAiCall(orderId, () => tuLlamadaIA())`.

### `USD_TO_MXN` desactualizado
**Causa:** La tasa de cambio cambió y la variable de entorno no se actualizó.
**Fix:** Actualizar `USD_TO_MXN` en Vercel → redeploy. El sistema convierte `amount_mxn` a USD con esta tasa en tiempo de ejecución.

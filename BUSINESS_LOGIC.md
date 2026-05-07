# BUSINESS_LOGIC.md — CancioBot: Asistente de Ventas de Canciones Personalizadas

> Generado por SaaS Factory V4 | Fecha: 2026-03-16

---

## 1. Problema de Negocio

**Dolor:**
La atención al cliente en WhatsApp para venta de canciones personalizadas es lenta, ineficiente y sin control. El proceso completo (desde el lead de Facebook hasta la entrega del producto) se ejecuta manualmente por 3 colaboradores a tiempo parcial, con tiempos de respuesta de 1 a 3 días. No hay control del ROI/ROAS, no hay investigación de competencia, no hay filtro de cliente por intención de pago, no hay proceso de recompra, y la generación de letra/canción/video es completamente manual.

**Costo actual:**
- Solo se atienden 3–5 clientes/día (capacidad máxima del equipo)
- Tiempo de respuesta: 1–3 días
- Se pierden clientes por: precios no competitivos ($75 USD vs. competencia en $10 USD), respuesta lenta, estilo musical incorrecto
- Recursos desperdiciados generando canciones para leads sin intención real de pago
- Colaboradores sin disponibilidad completa de horario

---

## 2. Solución

**Propuesta de valor:**
Un asistente automatizado de WhatsApp con personalidad cercana ("primo", "cuate") que califica leads por intención de pago antes de generar cualquier producto con IA, automatiza el flujo completo de producción (letra vía OpenRouter + canción vía MusicAPI/Suno + video vía ffmpeg), y provee un panel de control con métricas financieras, trazabilidad de pedidos y control de presupuesto de IA en tiempo real.

**Flujo principal (Happy Path):**
1. Cliente ve anuncio en Facebook → clic → trigger a WhatsApp Business API
2. Asistente saluda con personalidad amigable ("primo/cuate") y presenta el servicio
3. **[CALIFICACIÓN]** Agente calificador analiza sentimiento y disposición de pago
4. Si NO califica → cierre con gracia + lista de nutrición (acceso manual para el creativo)
5. Si SÍ califica → el asistente solicita historia (texto o audio, puede ser múltiple) y estilo musical
6. El asistente identifica ocasión especial (catálogo de promociones) y ofrece promoción vigente
7. El sistema identifica origen/residencia del cliente → selecciona prompt del catálogo de preferencias
8. El sistema genera la letra con IA (historia + estilo + prompt personalizado)
9. El sistema genera el audio con MusicAPI (Suno AI) → preview enviado automáticamente al cliente
10. El asistente envía el preview al cliente junto con precio y datos de depósito
11. Cliente realiza pago y envía comprobante (imagen)
12. Colaborador (Admin de Pagos) verifica comprobante en panel del dashboard
13. Al confirmar pago → asistente entrega la canción al cliente (estado: entregado)
14. Asistente ofrece video personalizado (fotos del cliente + slideshow ffmpeg)
15. Si acepta → cliente sube fotos → sistema genera video con ffmpeg → espera pago → colaborador confirma → sube a YouTube → envía liga al cliente
18. Asistente envía mensaje de agradecimiento + campaña de recompra/promoción

---

## 3. Usuarios

**Usuarios internos (3 personas, cada una juega varios roles):**

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| **Creativo** | Letras y audios pendientes | No ve costos ni márgenes. Aprueba/ajusta producción |
| **Admin de Pagos** | Estado de pagos confirmados | Verifica comprobantes de depósito |
| **Administrador** | Visión total | Presupuesto, rentabilidad, ROI, ROAS, métricas completas |

**Agentes automáticos (sin intervención humana):**

| Agente | Función |
|--------|---------|
| **Agente Investigador** | Monitorea competencia periódicamente. Genera tabla ventaja/desventaja/solución. Determina CAC y LTV solo con datos reales del sistema (sin alucinaciones). Si datos insuficientes → informa explícitamente |
| **Agente Financiero-Contable** | Mantiene métricas: ROI, ROAS, LTV, CAC, flujo de caja, gastos fijos/variables, punto de equilibrio, costo de suscripciones y tokens |
| **Agente de Promociones** | Administra catálogo de promociones y envía campañas segmentadas a clientes |

---

## 4. Arquitectura de Datos

### Input (Datos de Entrada)

**Del cliente (vía WhatsApp):**
- Mensajes de texto y audio (historia, contexto)
- Origen y residencia del cliente
- Fotos del cliente (para video)
- Comprobantes de pago (imagen)

**Catálogos configurables:**
- Catálogo de promociones (ocasiones especiales, descuentos vigentes)
- Catálogo de preferencias (estilo musical + prompt + origen/residencia/evento)
- Catálogo de presupuesto (presupuestos por categoría: marketing, tokens, suscripciones, operación)
- Catálogo de dominio de negocio (skill reutilizable: lógica de negocio, fórmulas exactas, benchmarks)

**Datos financieros y operativos:**
- Datos de campañas de Facebook Ads (gasto diario, leads por campaña)
- Precios y propuestas de la competencia (vía Agente Investigador)
- Costo de suscripciones (servicios de IA, WhatsApp API, etc.)
- Costo de tokens consumidos por agentes
- Registro de ingresos recibidos (pagos confirmados)

**Sistema de Optimización de Presupuesto IA:**
- Routing de modelos: modelo económico para extracción básica → modelo avanzado para generación de letra final
- Lógica de bloqueo: antes de cada llamada a IA/Audio, verificar gasto acumulado vs. límite mensual
- Modo manual: si se supera límite → excepción + estado `requiere_procesamiento_manual` + notificación en dashboard
- Función de costo por pedido: calcula USD por modelo usado (OpenRouter pricing en tiempo real)

### Output (Datos de Salida)

**Entregables al cliente:**
- Letra generada con IA
- Audio de la canción — generado con MusicAPI (Suno AI), preview enviado automáticamente
- Video personalizado (slideshow ffmpeg con fotos del cliente) → subido a YouTube → liga enviada al cliente
- Mensajes de recompra y promociones segmentadas

**Panel de administración:**
- Dashboard ROI / ROAS / métricas financieras completas
- Tabla comparativa de competencia (Agente Investigador)
- Documento descargable con estrategia de implementación sugerida
- Barra de progreso: *"Presupuesto mensual: $X de $Y usados"*
- Etiqueta por pedido: *"Costo de IA para este pedido: $0.XX"*
- Tablero de trazabilidad con semáforo de estado:
  - 🟢 Verde — En tiempo (dentro del SLA)
  - 🟡 Amarillo — Retrasado (superó tiempo esperado)
  - 🔴 Rojo — Detenido (sin actividad / requiere intervención)
- Administración de presupuesto por categoría
- Control de tokens (habilitar/deshabilitar manualmente agentes de IA)

### Storage — Tablas Supabase sugeridas

| Tabla | Descripción |
|-------|-------------|
| `leads` | Registro de todos los contactos de WhatsApp con origen de campaña Facebook |
| `orders` | Pedidos calificados: estado, semáforo, costo IA, historial |
| `conversations` | Mensajes de WhatsApp (texto + audio) por lead/pedido |
| `payments` | Comprobantes, estado de verificación, monto confirmado |
| `songs` | Letra generada, audio preview, audio final, video, liga YouTube |
| `promotions_catalog` | Catálogo de promociones activas por ocasión/fecha |
| `preferences_catalog` | Estilo musical + prompt + origen/residencia/evento |
| `budgets` | Presupuestos por categoría y período |
| `expenses` | Gastos reales: tokens, suscripciones, Facebook Ads |
| `ai_usage` | Log de cada llamada IA: modelo, tokens, costo USD, pedido asociado |
| `competitors` | Tabla de seguimiento de competencia (precio, propuesta, ventaja/desventaja) |
| `nurturing_list` | Leads no calificados para seguimiento manual |
| `rebuys` | Historial de recompras y campañas enviadas |
| `business_domain` | Skill reutilizable: fórmulas, benchmarks, lógica de negocio |

---

## 5. Dominio de Negocio (Skill Reutilizable)

Fórmulas exactas — sin alucinaciones. Usables en otras aplicaciones.

### Rentabilidad & Supervivencia

| Métrica | Fórmula |
|---------|---------|
| Margen neto actual | `(Ingresos - Todos los gastos) / Ingresos × 100` |
| Punto de equilibrio | `Gastos fijos / Margen de contribución promedio` |
| Flujo de caja | `Efectivo disponible + Ingresos esperados - Gastos comprometidos` |
| Retención de clientes | `(Clientes que regresan / Total clientes únicos) × 100` |
| CAC | `Gasto total en adquisición / Nuevos clientes adquiridos` |
| LTV | `Ticket promedio × Frecuencia × Tiempo de retención × Margen` |
| Ratio LTV/CAC | `LTV / CAC` |
| ROAS | `Ingresos atribuidos a campaña / Gasto en campaña` |
| ROI | `(Ganancia neta / Inversión total) × 100` |

### Experiencia & Servicio

| Métrica | Fórmula |
|---------|---------|
| NPS | `% Promotores (score 9–10) - % Detractores (score 0–6)` |

**Regla de oro:** El Agente Financiero/Investigador usa **solo datos reales** del sistema para calcular estas métricas. Si los datos son insuficientes, reporta: *"Datos insuficientes para calcular [métrica]"*.

---

## 6. KPI de Éxito — Primera Versión

| Métrica | Estado Actual | Meta V1 |
|---------|--------------|---------|
| Tiempo de primera respuesta | 1–3 días | < 1 hora |
| Clientes atendidos/día | 3–5 | 30+ |
| Tasa de cierre (leads calificados) | Desconocida | 60% |
| % IA desperdiciada en leads fríos | Alto | < 5% |
| Precio ajustado a segmentación de pauta | No | Sí |

---

## 7. Stack Técnico Confirmado

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 + shadcn/ui |
| Backend | Supabase (Auth + Database + RLS + Storage) |
| WhatsApp | WhatsApp Business API (cuenta activa) |
| IA — Texto/Agentes | OpenRouter (routing: modelo económico / avanzado) |
| IA — Música | MusicAPI (Suno AI wrapper, `api.musicapi.ai`) |
| Video | ffmpeg-static (slideshow local, sin dependencias externas) |
| Validación | Zod |
| Estado | Zustand |
| Facebook Ads | Meta Marketing API (tracking campañas + leads) |
| Testing | Playwright CLI + MCP |
| Deploy | Vercel |

---

## 8. Arquitectura de Features

```
src/features/
├── auth/                    # Login Email/Password — 3 roles (Creativo, Admin Pagos, Admin)
├── whatsapp-bot/            # Asistente WhatsApp con personalidad "primo/cuate"
│   ├── qualifier/           # Agente calificador (sentimiento + intención de pago)
│   ├── conversation/        # Manejo de mensajes texto y audio
│   └── nurturing/           # Lista de leads no calificados
├── orders/                  # Gestión de pedidos con semáforo de estado
├── video-generation/        # Slideshow ffmpeg + YouTube upload + fotos del cliente
├── payments/                # Verificación de comprobantes + confirmación manual
├── catalogs/                # Promociones, preferencias, presupuesto, dominio
├── agents/                  # Agentes automáticos
│   ├── investigator/        # Monitoreo de competencia + CAC/LTV con datos reales
│   ├── financial/           # Métricas contables con fórmulas exactas
│   └── promotions/          # Campañas segmentadas de recompra
├── dashboard/               # Panel admin: métricas, semáforo, presupuesto, costos IA
│   ├── budget-control/      # Barra progreso presupuesto + control de tokens
│   └── ai-cost-tracker/     # Costo por pedido + routing de modelos
└── facebook-ads/            # Tracking de campañas, ROAS, atribución de leads
```

---

## 9. Sistema de Optimización de Presupuesto IA (Skill Reutilizable)

```typescript
// Routing de modelos
const MODEL_ROUTER = {
  basic: "openai/gpt-4o-mini",      // Calificación, extracción de datos
  advanced: "openai/gpt-4o",        // Generación de letra final
}

// Antes de cada llamada IA
async function guardedAICall(task: "basic" | "advanced", pedidoId: string) {
  const gastoMes = await getMonthlySpend()
  const limite = await getMonthlyBudget()
  if (gastoMes >= limite) {
    await updateOrderStatus(pedidoId, "requiere_procesamiento_manual")
    await notifyDashboard("Budget limit reached")
    throw new Error("BUDGET_LIMIT_REACHED")
  }
  const model = MODEL_ROUTER[task]
  const result = await callAI(model, ...)
  await logAIUsage({ model, cost: result.cost, pedidoId })
  return result
}
```

---

## 10. Próximos Pasos

1. [x] Configurar Supabase + tablas + RLS
2. [x] Implementar Auth (4 roles: Creativo, Admin Pagos, Administrador, Agente Investigador)
3. [x] Conectar WhatsApp Business API
4. [x] Feature: `whatsapp-bot` (calificador + flujo conversacional + story guide agent)
5. [x] Feature: `catalogs` (promociones, preferencias, presupuesto, dominio)
6. [x] Feature: `orders` + `music-generation` (letra OpenRouter + audio MusicAPI/Suno)
7. [x] Feature: `payments` (verificación de comprobantes)
8. [x] Feature: `video-generation` (slideshow ffmpeg + YouTube)
9. [x] Feature: `dashboard` (métricas + presupuesto + costos IA + vistas por rol)
10. [x] Feature: `agents` (Investigador + Financiero + Promociones con template Meta)
11. [x] Feature: `facebook-ads` (tracking ROAS + atribución de leads)
12. [x] Feature: `leads` (campañas manuales + importador + historial)
13. [x] Feature: `storage-management` (monitoreo buckets + limpieza cron)
14. [ ] Testing E2E con Playwright
15. [ ] Validar YouTube upload + WhatsApp delivery end-to-end en producción

---

*CancioBot — De 5 clientes/día a 30+. Automatización completa del flujo de canciones personalizadas.*

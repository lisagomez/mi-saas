# SaaS Factory V4 - Agent-First Software Factory

> Eres el **cerebro de una fabrica de software inteligente**.
> El humano dice QUE quiere. Tu decides COMO construirlo.
> El humano NO necesita saber nada tecnico. Tu sabes todo.

---

## Filosofia: Agent-First

El usuario habla en lenguaje natural. Tu traduces a codigo.

```
Usuario: "Quiero una app para pedir comida a domicilio"
Tu: Ejecutas new-app → generas BUSINESS_LOGIC.md → preguntas diseño → implementas
```

**NUNCA** le digas al usuario que ejecute un comando.
**NUNCA** le pidas que edite un archivo.
**NUNCA** le muestres paths internos.
Tu haces TODO. El solo aprueba.

---

## Decision Tree: Que Hacer con Cada Request

```
Usuario dice algo
    |
    ├── "Quiero crear una app / negocio / producto"
    |       → Ejecutar skill NEW-APP (entrevista de negocio → BUSINESS_LOGIC.md)
    |
    ├── "Necesito login / registro / autenticacion"
    |       → Ejecutar skill ADD-LOGIN (Supabase auth completo)
    |
    ├── "Necesito una landing page"
    |       → Ejecutar skill LANDING (entrevista + diseño + codigo)
    |
    ├── "Quiero agregar [feature compleja]" (multiples fases, DB + UI + API)
    |       → Ejecutar skill PRP → humano aprueba → ejecutar BUCLE-AGENTICO
    |
    ├── "Necesito [tarea rapida]" (un componente, un fix, algo simple)
    |       → Ejecutar skill SPRINT (ejecutar directo sin planificacion)
    |
    ├── "Quiero agregar IA / chat / vision / RAG"
    |       → Ejecutar skill AI con el template apropiado
    |
    ├── "Revisa que funcione / testea / hay un bug"
    |       → Ejecutar skill QA (Playwright CLI automatizado)
    |
    ├── "Genera copy / prompts de contenido / ad / reel / carousel del insight"
    |       → Ejecutar skill CONTENT-PROMPT-GEN
    |       → Carga insight de proactive_insights (o texto manual)
    |       → PAS para orgánico (Reel, carousel, post) + AIDA para inorgánico (FB Ad, broadcast)
    |       → Output copy-paste listo por formato
    |
    ├── "Investiga mi avatar / quien es mi cliente / buyer persona / habitos de consumo"
    |       → Ejecutar skill AVATAR-RESEARCH
    |       → Opcion A: perfil manual (origen, residencia, edad, ocasion, estilo)
    |       → Opcion B: extraer de leads reales en Supabase
    |       → Investiga web + cruza con preferences_catalog + persiste en agent_reports
    |
    ├── "Monitorea mis posts / engagement / metricas / resultados del copy / scrape publicaciones"
    |       → Ejecutar skill MONITOR
    |       → Playwright visita URLs de posts publicados y extrae likes/comentarios/shares
    |       → Actualiza content_outcomes en Supabase con métricas reales
    |       → Recalcula scores por variante y avatar → alimenta al Judge con datos reales
    |       → Fallback manual si la plataforma bloquea scraping (Instagram siempre manual)
    |
    ├── "Evento de intención / trackear click / dm / save / señal de comportamiento"
    |       → Ejecutar skill EVENT-TRACKER
    |       → POST /api/events/track con strategy_id + event_type + UTM params
    |       → Tabla events vincula señal a content_outcomes via strategy_id
    |       → trackEvent() (client) o trackEventServer() (server) — siempre fire-and-forget
    |       → v_strategy_scores muestra dm_count / save_count / click_count por variante
    |
    ├── "Quiero hacer deploy / publicar"
    |       → Activar agent VERCEL-DEPLOYER
    |
    ├── "Explica como funciona [parte del codigo]"
    |       → Activar agent CODEBASE-ANALYST
    |
    ├── "Quiero remover SaaS Factory"
    |       → Ejecutar skill EJECT-SF (DESTRUCTIVO, confirmar antes)
    |
    │── [CancioBot] "Agentes / investigacion / financiero / recompra"
    |       → Leer prp-agentes-automaticos.md → src/features/agents/
    |       → Agente Investigador: competidores + AI report
    |       → Agente Financiero: ROI/ROAS/CAC/LTV desde gastos reales
    |       → Agente Promociones: campana de recompra masiva por WhatsApp
    |
    ├── [CancioBot] "Catalogos / promociones / presupuesto / preferencias"
    |       → Leer prp-catalogs.md → src/features/catalogs/
    |       → Tablas: promotions_catalog, preferences_catalog, budgets,
    |                 expenses, business_domain
    |       → guardedAiCall() protege cada llamada IA contra exceso de budget
    |
    ├── [CancioBot] "Dashboard / roles / vistas por rol"
    |       → Leer prp-dashboard-roles.md → src/features/dashboard/
    |       → Roles: creativo | agente_investigador | admin_pagos | administrador
    |       → Cada rol ve una vista diferente en /dashboard
    |
    ├── [CancioBot] "Facebook Ads / campanas / ROAS / atribucion"
    |       → Leer prp-facebook-ads.md → src/features/facebook-ads/
    |       → Tablas: facebook_campaigns, campaign_spend
    |       → Atribucion: leads.source = 'fb_{campaign.source_key}'
    |
    ├── [CancioBot] "Generacion de musica / cancion / Suno / audio"
    |       → Leer prp-music-generation.md → src/features/orders/
    |       → Pipeline: historia → letra (IA) → audio Suno → Storage → WhatsApp
    |       → buildMusicPromptDb() cruza estilo + origin/residence del lead
    |       → extractAndSaveLocation() extrae ubicacion del texto de historia
    |
    ├── [CancioBot] "Flujo conversacional / pedido / orden / historia"
    |       → Leer prp-orders-conversational-flow.md → src/features/orders/
    |       → Estados: recopilando_historia → recopilando_estilo →
    |                  generando_letra → letra_generada → pago_pendiente
    |
    ├── [CancioBot] "Pagos / comprobante / confirmar pago / cancion entregada"
    |       → Leer prp-payment-flow.md → src/features/orders/
    |       → Flujo: comprobante imagen → Storage → admin confirma → bot entrega
    |       → Panel: PaymentConfirmationPanel en dashboard admin_pagos
    |
    ├── [CancioBot] "Recompra / campana WhatsApp / clientes anteriores"
    |       → Leer prp-rebuy-campaign.md → src/features/agents/promotions/
    |       → Candidatos: status IN (entregado, pago_confirmado)
    |       → Excluye leads con recompra en los ultimos 30 dias
    |       → Soporta templates Meta para clientes fuera de ventana 24h
    |
    ├── [CancioBot] "Storage / almacenamiento / limpieza / buckets"
    |       → Leer prp-storage-management.md → src/features/storage-management/
    |       → Tablas: storage_config, storage_cleanup_log
    |       → Cron: /api/storage/cleanup (CRON_SECRET)
    |       → Panel solo visible para rol 'administrador'
    |
    ├── [CancioBot] "Video / fotos / YouTube / video personalizado"
    |       → Leer prp-video-generation.md → src/features/video-generation/
    |       → Pipeline: fotos WhatsApp → ffmpeg slideshow → YouTube unlisted
    |       → Estados extra: recopilando_fotos → generando_video → video_listo →
    |                        video_pago_enviado → entregado (sin parada en video_pago_confirmado)
    |       → Fallback graceful si ffmpeg falla (entrega solo audio)
    |
    └── No encaja en nada
            → Usar tu juicio. Si es frontend → agent FRONTEND.
              Si es backend → agent BACKEND.
              Si es DB → agent SUPABASE-ADMIN.
              Si es docs → agent DOCUMENTACION.
```

---

## Skills: Tu Caja de Herramientas

### Que el usuario puede pedir (o tu sugieres)

| Skill | Cuando usarlo |
|-------|---------------|
| `new-app` | El usuario quiere empezar un proyecto desde cero. Entrevista de negocio que genera BUSINESS_LOGIC.md |
| `landing` | El usuario necesita una landing page. Entrevista de estilo + generacion completa |
| `primer` | Al inicio de cada conversacion para cargar contexto del proyecto |
| `add-login` | Agregar autenticacion completa (Email/Password + Google OAuth + profiles + RLS) |
| `eject-sf` | El usuario quiere remover SaaS Factory del proyecto. DESTRUCTIVO. Confirmar siempre |
| `update-sf` | Actualizar el template a la ultima version |
| `bucle-agentico` | Features complejas que requieren multiples fases coordinadas (DB + API + UI) |
| `sprint` | Tareas rapidas: un componente, un fix, algo que no necesita planificacion |
| `prp` | Generar el plan de una feature compleja antes de implementarla. Siempre antes de `bucle-agentico` |
| `ai` | Implementar capacidades de IA: chat, RAG, vision, tools, web search |
| `qa` | Testing automatizado con Playwright CLI. Verificar bugs, testear flujos completos |
| `skill-creator` | Crear nuevos skills para extender la fabrica |
| `avatar-research` | Investiga habitos de consumo de un perfil de cliente combinando web + Supabase |
| `content-prompt-gen` | Convierte insights proactivos en copy listo (AIDA/PAS) para redes y ads |
| `monitor` | Scrape de posts publicados con Playwright, actualiza metricas en content_outcomes, recalcula scores |

### Que tu activas automaticamente (el usuario no necesita saber)

| Skill | Se activa cuando... |
|-------|---------------------|
| `backend` | Trabajas en Server Actions, APIs, logica de negocio, validaciones Zod |
| `frontend` | Trabajas en UI/UX, componentes React, Tailwind, animaciones |
| `supabase-admin` | Necesitas migraciones, RLS, queries SQL, configurar auth |
| `codebase-analyst` | Necesitas entender patrones y arquitectura del proyecto |
| `vercel-deployer` | Deploy, env vars, dominios, rollbacks |
| `documentacion` | Actualizar docs despues de cambios en codigo |
| `calidad` | Testing, validacion, quality gates |

---

## Flujos Principales

### Flujo 1: Proyecto Nuevo (de cero)

```
1. NEW-APP → Entrevista de negocio → BUSINESS_LOGIC.md
2. Preguntar diseño visual (design system)
3. ADD-LOGIN → Auth completo
4. PRP → Plan de primera feature
5. BUCLE-AGENTICO → Implementar fase por fase
6. QA → Verificar que todo funciona
```

### Flujo 2: Feature Compleja

```
1. PRP → Generar plan (usuario aprueba)
2. BUCLE-AGENTICO → Ejecutar por fases:
   - Delimitar en FASES (sin subtareas)
   - MAPEAR contexto real de cada fase
   - EJECUTAR subtareas basadas en contexto REAL
   - AUTO-BLINDAJE si hay errores
   - TRANSICIONAR a siguiente fase
3. QA → Validar resultado final
```

### Flujo 3: Tarea Rapida

```
1. SPRINT → Ejecutar directo
2. MCPs on-demand si necesitas ver algo
3. Confirmar con usuario
```

### Flujo 4: Agregar IA

```
1. AI → Elegir template apropiado:
   - chat (conversacion streaming)
   - rag (busqueda semantica)
   - vision (analisis de imagenes)
   - tools (funciones/herramientas)
   - web-search (busqueda en internet)
   - single-call / structured-outputs / generative-ui
2. Implementar paso a paso
```

### Flujo 5: CancioBot - Pedido Completo (End-to-End)

```
WhatsApp entrada
    ↓
getOrCreateLead() → isNew → GREETING → fin
    ↓ (lead existente)
qualification_status = 'pending' → runQualifier()
    → no_calificado → nurturing_list → CLOSE_MESSAGE
    → calificado → detectOccasion() → promo si aplica → NEXT_STEP_MESSAGE
    ↓
handleQualifiedLead()
    ├── isNew order → ASK_STORY
    ├── recopilando_historia → appendStoryChunk()
    |       + extractAndSaveLocation() [fire-and-forget]
    |       + detectStoryDone() → recopilando_estilo
    ├── recopilando_estilo → buildMusicPromptDb(style, origin, residence)
    |       → generateLyrics() [guardedAiCall]
    |       → letra_generada + buildPaymentRequestMessage()
    |       → generateAndSendAudioPreview() [after() background]
    ├── pago_pendiente → imagen → storePaymentProof() → admin confirma
    ├── pago_confirmado → ofrecer video → recopilando_fotos | video_rechazado
    ├── recopilando_fotos → storePhoto() x N → 'listo' → generateAndDeliverVideo()
    └── video_listo → comprobante → admin confirma → URL YouTube enviada
```

### Flujo 6: CancioBot - Agentes Automaticos

```
Dashboard (rol: administrador o agente_investigador/admin_pagos)
    ↓
AgentesView → tab Investigador | Financiero | Promociones
    |
    ├── Investigador → runInvestigatorAgent()
    |       → scrapea competidores + genera analysis con IA
    |       → persiste en agent_reports
    |
    ├── Financiero → runFinancialAgent()
    |       → calcula desde: expenses, budgets, ai_usage,
    |                         orders, facebook_campaigns, campaign_spend
    |       → ROI, ROAS, CAC, LTV, flujo de caja
    |
    └── Promociones → getRebuyCandidates()
            → status IN [entregado, pago_confirmado]
            → excluye recompra < 30 dias
            → sendRebuyCampaign() → WhatsApp masivo
            → si promo.whatsapp_template_name → usa template Meta (sendWhatsAppTemplate)
            → sin template → texto libre (sendWhatsAppText)
```

---

## Auto-Blindaje

Cada error refuerza la fabrica. El mismo error NUNCA ocurre dos veces.

```
Error ocurre → Se arregla → Se DOCUMENTA → NUNCA ocurre de nuevo
```

| Donde documentar | Cuando |
|------------------|--------|
| PRP actual | Errores especificos de esta feature |
| Skill relevante | Errores que aplican a multiples features |
| Este archivo (CLAUDE.md) | Errores criticos que aplican a TODO |

---

## Golden Path (Un Solo Stack)

No das opciones tecnicas. Ejecutas el stack perfeccionado:

| Capa | Tecnologia |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Backend | Supabase (Auth + DB + RLS) |
| AI Engine | Vercel AI SDK v5 + OpenRouter |
| Validacion | Zod |
| Estado | Zustand |
| Testing | Playwright CLI + MCP |

---

## Arquitectura Feature-First

Todo el contexto de una feature en un solo lugar:

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Rutas de autenticacion
│   ├── (main)/              # Rutas principales
│   │   └── dashboard/       # Vista principal por rol
│   ├── api/
│   │   ├── webhooks/whatsapp/route.ts   # Entry point del bot (POST + GET)
│   │   └── storage/cleanup/route.ts     # Cron de limpieza (CRON_SECRET)
│   └── layout.tsx
│
├── features/
│   ├── agents/              # Agentes automaticos (PRP-008)
│   │   └── promotions/      # Agente de recompra masiva
│   ├── auth/                # Autenticacion y perfiles
│   ├── catalogs/            # Catalogos configurables (PRP-007)
│   ├── dashboard/           # Vistas por rol (PRP-004)
│   ├── facebook-ads/        # Campanas y ROAS (PRP-009)
│   ├── leads/               # Leads y campanas manuales
│   ├── notifications/       # Notificaciones push (PWA)
│   ├── orders/              # Pedidos + flujo conversacional (PRP-001, 002, 003)
│   ├── storage-management/  # Monitoreo de Storage (PRP-010b)
│   ├── video-generation/    # Pipeline de video (PRP-006)
│   └── whatsapp-bot/        # Bot, calificador, mensajes
│       ├── qualifier/       # runQualifier() — califica leads con IA
│       ├── conversation/    # store-message, detect-story-done, extract-location
│       ├── constants/copy/  # Todos los mensajes del bot
│       └── services/        # send-whatsapp-message, log-ai-usage
│
└── shared/                   # Codigo reutilizable
    ├── components/
    ├── hooks/
    ├── lib/
    └── types/
```

### Tablas clave de Supabase

| Tabla | Feature | PRP |
|-------|---------|-----|
| `leads` | whatsapp-bot | — |
| `orders` | orders | PRP-001 |
| `songs` | orders | PRP-003 |
| `videos` | video-generation | PRP-006 |
| `order_photos` | video-generation | PRP-006 |
| `conversations` | whatsapp-bot | — |
| `ai_usage` | catalogs | PRP-007 |
| `promotions_catalog` | catalogs | PRP-007 |
| `preferences_catalog` | catalogs | PRP-007 |
| `budgets` | catalogs | PRP-007 |
| `expenses` | catalogs | PRP-007 |
| `business_domain` | catalogs | PRP-007 |
| `competitors` | agents | PRP-008 |
| `agent_reports` | agents | PRP-008 |
| `rebuys` | agents/promotions | PRP-010 |
| `facebook_campaigns` | facebook-ads | PRP-009 |
| `campaign_spend` | facebook-ads | PRP-009 |
| `storage_config` | storage-management | PRP-010b |
| `storage_cleanup_log` | storage-management | PRP-010b |

---

## MCPs: Tus Sentidos y Manos

### Next.js DevTools MCP (Quality Control)
Conectado via `/_next/mcp`. Ve errores build/runtime en tiempo real.

### Playwright (Tus Ojos)

**CLI** (preferido, menos tokens):
```bash
npx playwright navigate http://localhost:3000
npx playwright screenshot http://localhost:3000 --output screenshot.png
npx playwright click "text=Sign In"
npx playwright fill "#email" "test@example.com"
npx playwright snapshot http://localhost:3000
```

**MCP** (cuando necesitas explorar UI desconocida):
```
playwright_navigate, playwright_screenshot, playwright_click/fill
```

### Supabase MCP (Tus Manos)
```
execute_sql, apply_migration, list_tables, get_advisors
```

---

## Reglas de Codigo

- **KISS**: Soluciones simples
- **YAGNI**: Solo lo necesario
- **DRY**: Sin duplicacion
- Archivos max 500 lineas, funciones max 50 lineas
- Variables/Functions: `camelCase`, Components: `PascalCase`, Files: `kebab-case`
- NUNCA usar `any` (usar `unknown`)
- SIEMPRE validar entradas de usuario con Zod
- SIEMPRE habilitar RLS en tablas Supabase
- NUNCA exponer secrets en codigo

---

## Comandos npm

```bash
npm run dev          # Servidor (auto-detecta puerto 3000-3006)
npm run build        # Build produccion
npm run typecheck    # Verificar tipos
npm run lint         # ESLint
```

---

## Estructura de la Fabrica

```
.claude/
├── skills/                    # Skills 2.0 (V4) - 19 skills
│   ├── new-app/              # Entrevista de negocio
│   ├── landing/              # Landing pages
│   ├── primer/               # Context initialization
│   ├── add-login/            # Auth completo
│   ├── eject-sf/             # Remover SF
│   ├── update-sf/            # Actualizar SF
│   ├── bucle-agentico/       # Bucle Agentico BLUEPRINT
│   ├── sprint/               # Bucle Agentico SPRINT
│   ├── prp/                  # Generar PRPs
│   ├── ai/                   # AI Templates hub
│   ├── qa/                   # Playwright CLI QA
│   ├── skill-creator/        # Crear nuevos skills
│   ├── avatar-research/      # Investigacion de avatar con web + Supabase
│   ├── content-prompt-gen/   # Generador de copy AIDA/PAS desde insights
│   ├── monitor/              # Scrape engagement + actualiza content_outcomes
│   ├── backend/              # Agent: backend
│   ├── frontend/             # Agent: frontend
│   ├── supabase-admin/       # Agent: Supabase
│   ├── codebase-analyst/     # Agent: analisis
│   ├── vercel-deployer/      # Agent: deploy
│   ├── documentacion/        # Agent: docs
│   └── calidad/              # Agent: testing
│
├── PRPs/                      # Product Requirements Proposals
│   ├── prp-base.md                          # Template base
│   ├── prp-001-whatsapp-leads-campaign.md   # Campana leads WhatsApp (ACTIVO)
│   ├── prp-agentes-automaticos.md           # Agentes: investigador, financiero, promociones
│   ├── prp-catalogs.md                      # Catalogos: promos, preferencias, presupuesto
│   ├── prp-dashboard-roles.md               # Dashboard multi-rol (4 roles)
│   ├── prp-facebook-ads.md                  # Campanas Facebook Ads + ROAS
│   ├── prp-music-generation.md              # Generacion de audio con Suno AI
│   ├── prp-orders-conversational-flow.md    # Flujo conversacional post-calificacion
│   ├── prp-payment-flow.md                  # Flujo de pagos y entrega de cancion
│   ├── prp-rebuy-campaign.md                # Campana de recompra por WhatsApp
│   ├── prp-storage-management.md            # Monitoreo y limpieza de Storage
│   └── prp-video-generation.md              # Video personalizado con fotos + YouTube
│
│   │   └── references/       # AI Templates (11 bloques)
│
└── design-systems/            # 5 sistemas de diseno
    ├── neobrutalism/
    ├── liquid-glass/
    ├── gradient-mesh/
    ├── bento-grid/
    └── neumorphism/
```

---

## Aprendizajes (Auto-Blindaje Activo)

### 2025-01-09: Usar npm run dev, no next dev
- **Error**: Puerto hardcodeado causa conflictos
- **Fix**: Siempre usar `npm run dev` (auto-detecta puerto)
- **Aplicar en**: Todos los proyectos

### 2026-04-02: Validacion de coherencia PRPs vs codigo — hallazgos clave
- **Aprendizaje**: Antes de reportar una discrepancia como "faltante", leer el archivo real.
  El agente de validacion reporto 3 "errores criticos" que ya estaban corregidos en el codigo.
- **Fix**: Siempre verificar el archivo actual antes de asumir que algo falta.
- **Aplicar en**: Todos los informes de coherencia / auditorias de codebase.

### 2026-04-02: whatsapp_template_name en promotions_catalog
- **Contexto**: Meta requiere templates aprobados para mensajes fuera de la ventana de 24h.
- **Fix**: Campo `whatsapp_template_name` agregado a `promotions_catalog`. Si la promo lo
  tiene configurado, la campana de recompra usa el template en lugar de texto libre.
- **Aplicar en**: Cualquier envio masivo de WhatsApp a clientes con > 24h de inactividad.

### 2026-04-05: Usar printf (no echo) al guardar secrets en Vercel via CLI
- **Error**: `echo "SECRET" | vercel env add` guarda el secret con `\n` al final. Esto rompe HMAC-SHA256 (el secret calculado no coincide con el real) causando 401 silenciosos en webhooks.
- **Fix**: SIEMPRE usar `printf 'SECRET' | npx vercel env add VAR production` (sin comillas dobles, sin newline).
- **Aplicar en**: Cualquier variable sensible guardada via Vercel CLI (tokens, secrets, API keys).

### 2026-04-05: Meta pausa entrega de webhooks tras 401 consecutivos
- **Error**: Después de varios 401, Meta deja de enviar POSTs al webhook. Los logs de Vercel no muestran ninguna nueva petición aunque el usuario mande mensajes.
- **Fix**: Meta for Developers → WhatsApp → Configuration → Webhook fields → fila `messages` → **Test**. Si responde OK, la entrega se reanuda.
- **Aplicar en**: Cualquier debugging de webhook WhatsApp que no muestre tráfico en logs.

### 2026-04-02: next build falla con useContext null cuando NODE_ENV=development
- **Error**: `TypeError: Cannot read properties of null (reading 'useContext')` en prerendering
  de `/_global-error` o `/_not-found`. El shell tenia `NODE_ENV=development`.
- **Fix**: Siempre correr `NODE_ENV=production npm run build`. Cuando NODE_ENV=development,
  react-redux carga su build de desarrollo que usa useContext diferente y crashea el SSR.
- **Aplicar en**: Todos los proyectos que usen recharts (depende de react-redux).

### 2026-05-07: colorFilter en ffmpeg ignorado silenciosamente
- **Error**: `generate-video.ts` recibia el parametro `colorFilter` de `buildVideoStylePrompt`
  pero no lo desestructuraba — el tinte de color nunca se aplicaba en el slideshow.
- **Fix**: Desestructurar `colorFilter`, agregar fuente `color` de ffmpeg con opacidad 0.22
  y filtro `overlay`, y usar `[tinted]` como label final si hay color.
- **Aplicar en**: Cualquier pipeline ffmpeg con parametros opcionales — verificar que todos los
  params se usen explicitamente, TypeScript no advierte sobre destructuring incompleto.

### 2026-05-07: payment_proof_url expira en 1 hora — dashboard rompe imagenes
- **Error**: `store-payment-proof.ts` generaba signed URL con TTL de 3600s (1h). El admin que
  revisara comprobantes mas tarde de 1h veia imagenes rotas en el dashboard.
- **Fix**: TTL aumentado a `60 * 60 * 24 * 7` (7 dias) — cubre cualquier revision razonable.
- **Aplicar en**: Cualquier signed URL que deba sobrevivir una sesion de trabajo del admin.

### 2026-05-07: video_pago_confirmado era un estado zombie en OrderStatus
- **Error**: El estado existia en el tipo `OrderStatus` y en 3 filtros `.in()`, pero
  `confirm-video-payment.ts` lo saltaba explicitamente (iba directo de `video_pago_enviado`
  a `entregado`). Ningun orden en DB tenia ese estado.
- **Fix**: Eliminado de `database.ts`, `get-rebuy-candidates.ts`, `get-converted-leads.ts`
  y `send-campaign-to-selected.ts`. Solo queda como comentario en `confirm-video-payment.ts`.
- **Aplicar en**: Al agregar nuevos estados a `OrderStatus`, verificar que algun codigo los setee.

---

*V4: Todo es un Skill. Agent-First. El usuario habla, tu construyes.*

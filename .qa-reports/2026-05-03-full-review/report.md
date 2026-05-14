# QA Report: Revisión Completa CancioBot

**Date**: 2026-05-03
**Status**: PARTIALLY_COMPLETE (pendiente: prueba visual del dashboard con login)

---

## Resumen Ejecutivo

| Área | Estado | Hallazgos |
|------|--------|-----------|
| TypeScript | ✅ PASS | 0 errores |
| ESLint | ✅ PASS | 0 warnings |
| Páginas públicas | ✅ PASS | Home, Login, Signup, ForgotPassword OK |
| Variables de entorno | ⚠️ WARN | `SONG_PRICE_USD` faltante (fallback $25) |
| Código webhook | ✅ PASS | Flujo de estados correcto |
| Pipeline de video | ✅ PASS | ffmpeg + YouTube resumable OK |
| Dashboard (código) | ✅ PASS | Fetches por rol correctos |
| Dashboard (visual) | ⏳ PENDIENTE | Requiere login manual |

---

## Páginas Públicas

### `/` — Landing Page
- ✅ Hero con CTA "Quiero mi corrido"
- ✅ Sección "Así de fácil" (3 pasos)
- ✅ Features: personalizado, con banda, con tus fotos
- ✅ Ocasiones: Día de la Madre, Cumpleaños, Boda, etc.
- ✅ Stats (muestran 0 en staging — correcto)
- ✅ Footer CTA
- Screenshot: `screenshots/01-home-full.png`

### `/login`
- ✅ Google OAuth + Email/Password
- ✅ Link "¿Olvidaste tu contraseña?"
- ✅ Link al signup
- Screenshot: `screenshots/02-login.png`

### `/signup`
- ✅ Google OAuth + Email/Password
- ⚠️ Muestra "1 Issue" en Next.js DevTools overlay (no crítico en dev)
- Screenshot: `screenshots/03-signup.png`

### `/forgot-password`
- ✅ Formulario limpio
- Screenshot: `screenshots/04-forgot-password.png`

---

## Revisión de Código

### Rutas implementadas (20 total)
```
/ | /login | /signup | /forgot-password | /update-password | /callback | /check-email
/dashboard | /dashboard/catalogs | /dashboard/catalogs/budget
/dashboard/catalogs/business-domain | /dashboard/catalogs/preferences
/dashboard/catalogs/promotions
/api/webhooks/whatsapp | /api/admin/confirm-payment | /api/music/poll
/api/notifications/send | /api/notifications/subscribe
/api/storage/cleanup | /api/debug/musicapi
```

### Base de Datos
- 27 tablas, todas con RLS habilitado ✅
- leads: 1, orders: 1, videos: 1 (datos de staging)

### Variables de Entorno

| Variable | Estado | Impacto |
|----------|--------|---------|
| `SONG_PRICE_USD` | ❌ FALTANTE | Métricas financieras usan fallback $25. El precio real es ~$75 USD (`PAYMENT_PRICE=$75 USD`). Esto causa que ROI, ingresos y ROAS en el dashboard sean incorrectos. |
| Resto (21 vars) | ✅ Presentes | OK |

### Webhook WhatsApp (`/api/webhooks/whatsapp/route.ts`)
- ✅ Verificación HMAC-SHA256 de firma Meta
- ✅ Flujo completo de estados: `recopilando_historia` → `recopilando_estilo` → `letra_generada` → `pago_pendiente` → `pago_confirmado` → `recopilando_fotos` → `video_listo` → `video_pago_enviado`
- ⚠️ Archivo tiene 711 líneas (límite recomendado: 500). Candidato a refactoring.

### Pipeline de Video (`generate-and-deliver-video.ts`)
- ✅ ffmpeg local (no Replicate)
- ✅ YouTube resumable upload para videos grandes
- ✅ Fallback: si falla → marca `status=fallido`, notifica al cliente
- ✅ Cleanup de workspace temporal en `finally`

### Dashboard (`/dashboard/page.tsx`)
- ✅ Fetch condicional por rol (no sobre-fetching)
- ✅ 4 roles: `creativo`, `agente_investigador`, `admin_pagos`, `administrador`
- ✅ `getFinancialMetrics()` siempre retorna objeto (nunca null)
- ✅ Redirect a `/login` si no hay sesión

---

## Hallazgos Prioritarios

### 🔴 Alta Prioridad
1. ~~**`SONG_PRICE_USD` faltante en `.env.local`**~~ → **CORREGIDO** — Agregado `SONG_PRICE_USD=75` (alineado con `PAYMENT_PRICE=$75 USD`).
2. **Credenciales YouTube sin configurar** — `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` están como `REEMPLAZAR_CON_*`. El pipeline de video fallará en producción al intentar subir a YouTube.

### 🟡 Media Prioridad
2. **Webhook de 711 líneas** — Supera el límite de 500. Dificulta mantenimiento.

### 🟢 Baja Prioridad
3. **"1 Issue" en Next.js DevTools en /signup** — Solo visible en modo dev. Investigar origen.
4. **`any` explícito en dashboard** — 2 instancias con `eslint-disable` para `pricingCampaigns` y `qualifiedLeads`. Candidato a tipar correctamente.

---

## Pendiente

- [ ] Prueba visual del dashboard (rol `creativo`, `admin_pagos`, `administrador`)
- [ ] Prueba del flujo de catálogos (`/dashboard/catalogs/*`)
- [ ] Verificar sidebar/navegación

**Requiere**: contraseña de `admin@test.com` (rol: creativo) o `atencion@digifixapp.com` (rol: administrador)

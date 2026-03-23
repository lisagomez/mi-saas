# QA Report: WhatsApp API Webhook

**Fecha**: 2026-03-22
**Status**: FAILED — 2 blockers críticos

---

## Resultados por Test

| # | Test | Status | HTTP |
|---|------|--------|------|
| 1 | GET verification — token correcto | ✅ PASS | 200 |
| 2 | GET verification — token incorrecto | ✅ PASS | 403 |
| 3 | POST JSON inválido | ✅ PASS | 400 |
| 4 | POST status update sin mensajes | ✅ PASS | 200 |
| 5 | POST nuevo lead (primer mensaje) | ⚠️ PARTIAL | 200 |
| 6 | Meta Graph API — token válido | ❌ FAIL | 401 |
| 7 | POST segundo mensaje (calificador IA) | ❌ FAIL | 500 |

---

## Blockers Críticos

### 🔴 Blocker 1: WHATSAPP_ACCESS_TOKEN expirado
- **Error**: `Session has expired on Sunday, 22-Mar-26 06:00:00 PDT`
- **Impacto**: El bot no puede enviar ningún mensaje a clientes. El greeting de nuevos leads no se guarda (storeMessage sólo corre si `sent.success === true`).
- **Fix**: Renovar el token en Meta Business > WhatsApp > API Setup > Generate token. Usar un **System User token** permanente en vez de un token temporal de 24h.

### 🔴 Blocker 2: OPENROUTER_API_KEY sin créditos
- **Error**: `Insufficient credits. This account never purchased credits`
- **Impacto**: El calificador de IA falla. El webhook retorna 500 y el lead nunca pasa de `pending` a `calificado` o `no_calificado`.
- **Fix**: Agregar créditos en https://openrouter.ai/settings/credits

---

## Lo que SÍ funciona

- Webhook verification (GET) — listo para configurar en Meta Dashboard
- Parsing de payload de Meta — correcto
- Creación de lead en BD — funciona (lead `521234567890` creado con `status: pending`)
- Guardado de mensaje del usuario — funciona
- Manejo de errores (JSON inválido, firma inválida) — correcto
- Ignorar status updates (no mensajes) — correcto

---

## Acciones Requeridas

1. **Renovar token de WhatsApp** en Meta Developer Console
2. **Agregar créditos a OpenRouter** (~$5 USD es suficiente para empezar)
3. Volver a correr Test 5 y Test 7 para confirmar flujo completo

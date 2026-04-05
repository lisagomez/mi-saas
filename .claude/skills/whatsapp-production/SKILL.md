---
name: whatsapp-production
description: "Poner un número real en producción con WhatsApp Business API. Activar cuando el usuario dice: quiero usar mi número real, poner whatsapp en producción, el número está en Pending, configurar webhook de whatsapp, o necesito token permanente."
allowed-tools: Read, Write, Edit, Bash
---

# WhatsApp Business API — Número Real en Producción

Configura un número real de WhatsApp con la Cloud API de Meta.
Cubre desde cero hasta webhook funcionando en Vercel.

**NO preguntes. Sigue el checklist en orden.**

---

## Prerequisitos

- Cuenta de Facebook personal
- Número de teléfono real (no puede estar registrado en WhatsApp Business App)
- Proyecto Next.js desplegado en Vercel

---

## Variables de Entorno Requeridas

```env
WHATSAPP_ACCESS_TOKEN=        # Token permanente del System User
WHATSAPP_PHONE_NUMBER_ID=     # ID del número de teléfono real
WHATSAPP_BUSINESS_ACCOUNT_ID= # ID de la cuenta WhatsApp Business
WHATSAPP_VERIFY_TOKEN=        # Token arbitrario para verificar webhook (ej: mi-app-2026-abc123)
WHATSAPP_APP_SECRET=          # App Secret de Meta for Developers > Información básica
```

---

## Paso 1 — Portfolio Empresarial (business.facebook.com)

1. Ir a **business.facebook.com**
2. Crear portfolio empresarial → nombre + correo
3. Anotar el **Business Portfolio ID** (aparece en Settings > Business info)

---

## Paso 2 — Crear App (developers.facebook.com)

1. Ir a **developers.facebook.com** → My Apps → Crear aplicación
2. Nombre de la app → Caso de uso: **Otros** → Empresa: seleccionar el portfolio
3. Una vez creada → Añadir productos → **WhatsApp → Configurar**
4. En panel izquierdo aparece WhatsApp

---

## Paso 3 — Pasar App a Modo Producción (Live)

1. En Meta for Developers, activar toggle **Desarrollo → Live**
2. Si pide URL de política de privacidad:
   - Ir a Configuración → Información básica → campo "URL de política de privacidad"
   - Puede ser una página propia o un Google Drive con el documento

---

## Paso 4 — Crear Cuenta WhatsApp Business (business.facebook.com)

1. Meta Business Suite → Settings → WhatsApp accounts → **+ Add**
2. Nombre de la empresa → categoría → número de teléfono
3. El estado inicial será **Pending** — se resuelve en el Paso 7

---

## Paso 5 — Configurar Método de Pago

1. Meta Business Suite → WhatsApp accounts → tu cuenta → Summary
2. Payment method → **Add payment method** → ingresar tarjeta
3. Sin esto no se pueden enviar mensajes outbound (campañas, entregas)

---

## Paso 6 — Crear System User y Token Permanente (business.facebook.com)

### 6a. Crear System User
1. Meta Business Suite → Settings → Users → **System users** → **+ Add**
2. Nombre: `admin` → Rol: **Admin** → Crear

### 6b. Asignar activos
1. Clic en los 3 puntos del usuario → **Assign assets**
2. Sección **Apps** → seleccionar la app → activar **Manage app**
3. Sección **WhatsApp accounts** → seleccionar la cuenta → activar **Full control**
4. Clic en **Assign**

### 6c. Generar token permanente
1. Clic en **Generate token** → seleccionar la app
2. Expiración: **Never**
3. Permisos a activar:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
4. Clic en **Generate token**
5. **Copiar y guardar inmediatamente** — Meta solo lo muestra una vez

> Este token va a `WHATSAPP_ACCESS_TOKEN` en `.env` y Vercel.

---

## Paso 7 — Registrar el Número (crítico — resuelve estado Pending)

El número queda en "Pending" hasta que se ejecute esta llamada.

### 7a. Obtener el Phone Number ID

En **Graph API Explorer** (developers.facebook.com → Tools → Graph API Explorer):

```
GET /v21.0/{WHATSAPP_BUSINESS_ACCOUNT_ID}/phone_numbers
Authorization: Bearer {token_permanente}
```

Copiar el `id` del número real.

### 7b. Ejecutar el registro

```
POST /v21.0/{PHONE_NUMBER_ID}/register
Authorization: Bearer {token_permanente}
Body: {
  "messaging_product": "whatsapp",
  "pin": "123456"
}
```

Respuesta esperada: `{ "success": true }`

Después de esto el número cambia de **Pending → Connected**.

---

## Paso 8 — Suscribir Webhook a la Cuenta

```
POST /v21.0/{WHATSAPP_BUSINESS_ACCOUNT_ID}/subscribed_apps
Authorization: Bearer {token_permanente}
```

Respuesta esperada: `{ "success": true }`

---

## Paso 9 — Configurar Webhook en Meta for Developers

1. Meta for Developers → tu app → WhatsApp → **Configuration**
2. Callback URL: `https://tu-dominio.vercel.app/api/webhooks/whatsapp`
3. Verify token: el valor de `WHATSAPP_VERIFY_TOKEN` en tu `.env`
4. Clic en **Verify and save**
5. En Webhook fields → activar toggle de **`messages`** → Subscribed

---

## Paso 10 — Actualizar Variables en Vercel

En Vercel → proyecto → Settings → Environment Variables, verificar/actualizar:

| Variable | Fuente |
|----------|--------|
| `WHATSAPP_ACCESS_TOKEN` | Token del System User (Paso 6c) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID obtenido en Paso 7a |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID de la cuenta WhatsApp Business |
| `WHATSAPP_APP_SECRET` | Meta for Developers → Configuración → Información básica → App secret |
| `WHATSAPP_VERIFY_TOKEN` | El mismo valor que pusiste en el webhook |

Después de actualizar cualquier variable: **redeploy obligatorio**.

```bash
npx vercel --prod
```

---

## Errores Comunes

### 401 en todos los POST del webhook — App Secret incorrecto
**Causa:** `WHATSAPP_APP_SECRET` en Vercel no coincide con el App Secret real de la app.
**Fix:** Ir a Meta for Developers → Configuración → Información básica → mostrar App secret → actualizar en Vercel → redeploy.

### 401 persiste después de actualizar el App Secret
**Causa:** Al guardar con `echo "SECRET" | vercel env add`, el comando `echo` agrega un `\n` invisible al final. El HMAC se calcula con ese newline y nunca coincide con la firma de Meta.
**Fix SIEMPRE usar `printf` en lugar de `echo`:**
```bash
# MAL — agrega \n al final
echo "el-secret" | npx vercel env add WHATSAPP_APP_SECRET production

# BIEN — sin newline
printf 'el-secret' | npx vercel env add WHATSAPP_APP_SECRET production
```
Si ya está guardado mal: `vercel env rm WHATSAPP_APP_SECRET production --yes` y volver a agregar con `printf`.

### Meta deja de enviar webhooks después de varios 401
**Causa:** Meta pausa la entrega del webhook automáticamente tras muchos errores consecutivos.
**Síntoma:** Los logs de Vercel no muestran ningún POST nuevo al webhook aunque el usuario mande mensajes.
**Fix:** Ir a Meta for Developers → WhatsApp → Configuration → Webhook fields → fila **messages** → clic en **Test**. Si responde "Successfully tested", Meta reanuda la entrega normal.

### Número sigue en "Pending"
**Causa:** No se ejecutó el `POST /register`.
**Fix:** Ejecutar Paso 7b con el token permanente.

### "No permissions available" al generar token del System User
**Causa:** El System User no tiene activos asignados.
**Fix:** Ejecutar Paso 6b (Assign assets) antes de generar el token.

### Webhook GET devuelve 403
**Causa:** El `WHATSAPP_VERIFY_TOKEN` en Meta no coincide con el de la app.
**Fix:** Usar exactamente el mismo string en ambos lados.

### Token caduca cada 60 minutos
**Causa:** Se está usando el token temporal de "Generate access token" en API Setup.
**Fix:** Usar el token permanente del System User (Paso 6c).

---

## Checklist Final

```
[ ] Portfolio empresarial creado
[ ] App creada en Meta for Developers en modo Live
[ ] Cuenta WhatsApp Business creada (Account status: Approved)
[ ] Método de pago configurado
[ ] System User creado con activos asignados
[ ] Token permanente generado y guardado
[ ] POST /register ejecutado → success: true
[ ] POST /subscribed_apps ejecutado → success: true
[ ] Webhook configurado y verificado (GET 200)
[ ] Campo "messages" suscrito en webhook fields
[ ] Variables en Vercel actualizadas (incluido APP_SECRET)
[ ] Redeploy ejecutado
[ ] Número en estado Connected
[ ] Prueba de mensaje enviado y respondido
```

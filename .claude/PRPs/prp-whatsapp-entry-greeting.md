# PRP-001: Entrada desde Facebook + Saludo del asistente WhatsApp

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-16
> **Proyecto**: CancioBot (mi-saas)

---

## Objetivo

Que cuando un cliente haga clic en un anuncio de Facebook y abra WhatsApp, el sistema reciba ese primer contacto por WhatsApp Business API y el asistente responda de inmediato con un saludo en tono amigable ("primo"/"compa") y una presentación clara del servicio de canciones personalizadas.

## Por Qué

| Problema | Solución |
|----------|----------|
| Respuesta lenta (1–3 días) pierde leads y ventas | Primera respuesta automática en segundos |
| El lead no sabe qué ofrece el negocio al entrar | Mensaje de presentación claro y con personalidad |
| Sin trazabilidad de origen (Facebook) | Registro del lead con origen para ROAS/atribución |

**Valor de negocio**: Reducir tiempo de primera respuesta de días a segundos, mejorar conversión de clic→contacto y sentar la base para métricas de atribución (Facebook Ads → WhatsApp).

## Qué

### Criterios de Éxito
- [ ] El usuario que hace clic en el anuncio de Facebook llega a WhatsApp y recibe una respuesta automática en menos de 1 minuto.
- [ ] La respuesta incluye saludo con personalidad ("primo"/"compa") y presentación del servicio (canciones personalizadas).
- [ ] Cada contacto nuevo queda registrado en BD (teléfono, origen = Facebook) para uso posterior.
- [ ] El webhook de WhatsApp verifica firma/validación de Meta y responde correctamente al challenge de verificación.

### Comportamiento Esperado

1. Cliente ve anuncio en Facebook y hace clic en "Enviar mensaje" / Click to WhatsApp.
2. Se abre WhatsApp con el número de negocio (o mensaje prellenado).
3. El cliente envía cualquier primer mensaje (ej. "Hola", "Info", o el prellenado por el anuncio).
4. El sistema recibe el evento en el webhook de WhatsApp Business API.
5. El sistema registra el lead (teléfono, origen = facebook, timestamp).
6. El asistente envía un único mensaje de texto: saludo en tono "primo"/"compa" + qué es el servicio (canciones personalizadas) + un CTA breve (ej. "cuéntame para quién es" o "¿qué ocasión es?").
7. La conversación queda abierta para el siguiente paso (calificación de lead, en un PRP posterior).

---

## Contexto

### Referencias
- `BUSINESS_LOGIC.md` — Flujo principal pasos 1–2, arquitectura `whatsapp-bot`, tabla `leads`
- `src/features/auth/` — Patrón feature-first existente
- Meta WhatsApp Cloud API: webhook (verificación GET + eventos POST), mensajes entrantes, envío de mensajes de texto dentro de ventana 24h
- Anuncios: "Click to WhatsApp" usa URL que abre WhatsApp; el "origen" puede guardarse si el enlace incluye parámetro (ej. `?ref=facebook_ad`).

### Arquitectura Propuesta (Feature-First)

```
src/features/whatsapp-bot/
├── components/          # (vacío en esta feature; solo backend)
├── hooks/               # (futuro)
├── services/           # whatsapp-api.ts (enviar mensaje), parse-incoming.ts
├── store/              # (futuro)
└── types/              # webhook payloads, lead minimal
```

- **Webhook**: `src/app/api/webhooks/whatsapp/route.ts` — GET (verificación Meta), POST (eventos: messages).
- **Lógica de saludo**: en `whatsapp-bot/services/greeting.ts` o dentro del handler del webhook; texto de saludo/presentación parametrizable (constantes o luego catálogo).

### Modelo de Datos

```sql
-- Tabla leads (registro de contacto desde WhatsApp)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'facebook',
  first_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone)
);

-- RLS: solo usuarios autenticados con rol admin/creativo pueden leer
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'creativo', 'admin_pagos')
    )
  );

-- Inserción desde backend (service_role o service key) para webhook
CREATE POLICY "Service insert leads"
  ON leads FOR INSERT
  TO service_role
  WITH CHECK (true);
```

*(Ajustar políticas según RLS existente en `profiles`; si el webhook usa API key de Supabase, usar `service_role` para INSERT.)*

---

## Blueprint (Assembly Line)

> Solo fases. Subtareas se generan al entrar a cada fase (bucle agéntico).

### Fase 1: Webhook WhatsApp Business API
**Objetivo**: Endpoint que reciba eventos de Meta (verificación GET + mensajes POST), verifique firma y extraiga teléfono y texto del mensaje entrante.
**Validación**: Verificación GET devuelve el challenge de Meta; POST con payload de prueba (o desde Meta) no rompe y loguea mensaje recibido.

### Fase 2: Persistencia de leads
**Objetivo**: Por cada primer mensaje de un número nuevo, insertar o actualizar registro en `leads` (phone, source, first_message_at) usando Supabase con permisos adecuados (ej. service_role).
**Validación**: Mensaje entrante desde un número nuevo crea fila en `leads`; mismo número no duplica (UNIQUE).

### Fase 3: Saludo y presentación del servicio
**Objetivo**: Tras recibir el primer mensaje, enviar una respuesta por WhatsApp (Cloud API) con texto de saludo "primo"/"compa" y presentación del servicio de canciones personalizadas + CTA breve.
**Validación**: Usuario de prueba envía mensaje a WhatsApp Business y recibe en su chat la respuesta con el saludo y la presentación.

### Fase 4: Validación final
**Objetivo**: Flujo E2E estable y criterios de éxito cumplidos.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Webhook verificado en Meta; mensaje de prueba recibido y contestado con saludo
- [ ] Lead registrado en Supabase con origen facebook
- [ ] Criterios de éxito del PRP revisados y cumplidos

---

## Aprendizajes (Self-Annealing)

*(Se rellenan durante la implementación.)*

---

## Gotchas

- [ ] Meta exige verificación GET del webhook (query `hub.mode`, `hub.verify_token`, `hub.challenge`); devolver `hub.challenge` si el token coincide.
- [ ] Mensajes entrantes vienen en `entry[].changes[].value.messages`; el número del usuario está en `from`; tipo `text` en `messages[].text.body`.
- [ ] Respuesta dentro de la ventana de 24h se hace con API de envío de mensajes (Cloud API); no hace falta template para primera respuesta iniciada por el usuario.
- [ ] No exponer tokens de WhatsApp/Meta en el cliente; webhook debe validar firma con `X-Hub-Signature-256` usando app secret.
- [ ] Supabase: el webhook debe usar `service_role` o una key de backend para insertar en `leads` sin depender de auth de usuario.

## Anti-Patrones

- NO responder sin verificar la firma del webhook (riesgo de spoofing).
- NO guardar contenido sensible del mensaje sin necesidad en esta fase (solo phone, source, timestamp).
- NO hardcodear el texto de saludo en el código; usar constantes o archivo de copy para poder cambiar "primo"/"compa" y el cuerpo del mensaje.

---

*PRP pendiente de aprobación. No se ha modificado código.*

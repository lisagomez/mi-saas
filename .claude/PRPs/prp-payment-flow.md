# PRP-002: Flujo de Pagos — Comprobante y Entrega de Cancion

> **Estado**: PENDIENTE
> **Fecha**: 2026-03-17
> **Proyecto**: CancioBot

---

## Objetivo

Implementar el flujo completo de pago posterior a `letra_generada`: el bot envia precio y datos de deposito al cliente, el cliente responde con una imagen del comprobante, el Admin de Pagos confirma el pago desde el dashboard, y el bot entrega la cancion al cliente.

## Por Que

| Problema | Solucion |
|----------|----------|
| Tras `letra_generada` el flujo se detiene — el bot responde con un mensaje generico ("ya esta en proceso") y no hay mecanismo para cobrar ni entregar la cancion | Flujo estructurado que lleva al cliente desde ver la letra hasta pagar y recibir el producto final |
| El Admin de Pagos no tiene visibilidad de que pedidos esperan confirmacion de pago | Panel en dashboard filtrado por `pago_pendiente` con imagen del comprobante y boton de confirmacion |
| La entrega de la cancion depende de intervencion manual | El bot entrega automaticamente el archivo o link de la cancion al confirmar el pago |

**Valor de negocio**: Cierra el ciclo de venta dentro de WhatsApp sin friccion adicional. Elimina coordinacion manual de cobros entre el equipo. Habilita escalar a 30+ pedidos/dia con el mismo equipo administrativo.

## Que

### Criterios de Exito

- [ ] Tras `letra_generada`, el bot envia automaticamente precio y datos de deposito/transferencia
- [ ] El bot acepta una imagen como comprobante de pago y actualiza el order a `pago_pendiente`
- [ ] El Admin de Pagos ve en el dashboard todos los orders en `pago_pendiente` con preview del comprobante
- [ ] El Admin de Pagos puede confirmar el pago desde el dashboard (boton de un clic)
- [ ] Al confirmar, el bot envia automaticamente la cancion al cliente y actualiza el order a `entregado`
- [ ] El cliente recibe notificacion/mensaje de entrega con el archivo o link de la cancion
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso

### Comportamiento Esperado (Happy Path)

1. El order llega a estado `letra_generada` (ya implementado en PRP-001)
2. Bot envia automaticamente: precio, metodo de pago y datos de deposito o transferencia
3. Order se actualiza a `pago_pendiente`
4. Cliente toma foto del comprobante y la envia por WhatsApp
5. Webhook recibe mensaje de tipo `image` (no `text`), descarga la imagen y la guarda en Supabase Storage
6. Order se actualiza a `pago_pendiente` con la URL del comprobante almacenada
7. Bot confirma al cliente: *"Recibimos tu comprobante, en breve lo verificamos"*
8. Admin de Pagos abre el dashboard, ve el panel de pagos pendientes
9. Admin ve la imagen del comprobante, confirma el pago con un boton
10. Server Action actualiza order a `pago_confirmado`
11. Bot envia la cancion al cliente (link de descarga o documento)
12. Order se actualiza a `entregado`
13. Bot envia mensaje de cierre: *"¡Listo, compa! Tu cancion ya está lista. Gracias por tu confianza."*

---

## Contexto

### Referencias

- `src/app/api/webhooks/whatsapp/route.ts` — Webhook principal; rama `handleQualifiedLead` maneja los estados del order. Requiere soporte para mensajes tipo `image`
- `src/features/orders/services/update-order-status.ts` — Patron para actualizar estado del order
- `src/features/whatsapp-bot/services/send-whatsapp-message.ts` — Envia texto; necesita nueva funcion para enviar documento/media
- `src/features/whatsapp-bot/constants/copy.ts` — Strings del asistente; agregar mensajes de pago y entrega
- `src/features/dashboard/` — Estructura existente feature-first para el dashboard
- `supabase/migrations/20260316000003_orders_and_songs.sql` — Tabla `orders` con estados `pago_pendiente`, `pago_confirmado`, `entregado` ya definidos
- `supabase/migrations/20260317070145_add_push_notifications.sql` — Sistema de push notifications existente para notificar al Admin de Pagos
- `src/types/database.ts` — `OrderStatus` ya incluye todos los estados del flujo de pago
- `PRP-001` — Contexto completo del flujo previo (recopilacion + generacion de letra)

### Arquitectura Propuesta (Feature-First)

```
src/features/orders/
├── components/
│   └── payment-confirmation-panel.tsx   # Panel del Admin: lista orders pago_pendiente + boton confirmar
├── hooks/
│   └── use-pending-payments.ts          # Hook que suscribe a orders en pago_pendiente (Supabase realtime)
├── services/
│   ├── store-payment-proof.ts           # Descarga imagen de Meta y la sube a Supabase Storage
│   ├── confirm-payment.ts               # Server Action: pago_pendiente → pago_confirmado → entregado
│   └── deliver-song.ts                  # Envia la cancion al cliente por WhatsApp
└── types/
    └── payment.ts                       # PaymentProof type + Zod schema

src/features/whatsapp-bot/
└── services/
    └── send-whatsapp-document.ts        # Envia documento/media por WhatsApp Cloud API

src/app/api/webhooks/whatsapp/route.ts   # Modificado: soporte imagen + estados pago
src/app/(main)/dashboard/page.tsx        # Modificado: incluir PaymentConfirmationPanel
```

### Modelo de Datos

```sql
-- Agregar columnas a orders para almacenar el comprobante
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS song_delivered_at TIMESTAMPTZ;

-- RLS: admin_pagos puede actualizar el campo de confirmacion en orders
CREATE POLICY "Admin pagos update payment confirmation"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'admin_pagos')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'admin_pagos')
    )
  );
```

**Nota**: Supabase Storage usa el bucket `payment-proofs` con politica de lectura solo para roles `admin_pagos` y `administrador`.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agentico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migracion de Base de Datos y Storage

**Objetivo**: Agregar columnas de pago a `orders` (payment_proof_url, payment_confirmed_at, payment_confirmed_by, song_delivered_at), politica RLS para `admin_pagos`, y bucket de Storage `payment-proofs`
**Validacion**: `list_tables` muestra las nuevas columnas; `get_advisors` sin alertas de RLS; bucket creado en Storage

### Fase 2: Webhook — Soporte de Imagenes y Flujo de Pago

**Objetivo**: Modificar `route.ts` para: (a) extraer mensajes tipo `image` del payload de WhatsApp, (b) manejar el estado `letra_generada` enviando precio + datos de pago, (c) manejar recepcion de imagen como comprobante, (d) actualizar order a `pago_pendiente` con URL del comprobante
**Validacion**: `npm run typecheck` pasa; webhook maneja `msg.type === 'image'` sin errores de tipos

### Fase 3: Servicio de Almacenamiento de Comprobante

**Objetivo**: Crear `store-payment-proof.ts` que descarga la imagen de la URL temporal de Meta (requiere token de acceso) y la sube a Supabase Storage bucket `payment-proofs`, retornando la URL publica o firmada
**Validacion**: `npm run typecheck` pasa; funcion exportable con tipos correctos

### Fase 4: Panel de Admin de Pagos en Dashboard

**Objetivo**: Crear el componente `PaymentConfirmationPanel` que lista orders en `pago_pendiente` con imagen del comprobante, datos del lead (telefono), letra de la cancion, y boton para confirmar pago. Integrarlo en `dashboard/page.tsx` visible solo para roles `admin_pagos` y `administrador`
**Validacion**: `npm run build` exitoso; componente renderiza con datos mock; boton de confirmacion llama Server Action

### Fase 5: Confirmacion de Pago y Entrega de Cancion

**Objetivo**: Crear Server Action `confirm-payment.ts` que: (a) actualiza order a `pago_confirmado`, (b) llama `deliver-song.ts` para enviar la cancion al cliente por WhatsApp, (c) actualiza order a `entregado` con `song_delivered_at`
**Validacion**: `npm run typecheck` pasa; Server Action con validacion Zod del input; funcion de entrega envia mensaje al cliente

### Fase 6: Copy Conversacional de Pagos

**Objetivo**: Agregar a `copy.ts` todos los mensajes nuevos del asistente: solicitud de pago con precio y datos bancarios, confirmacion de recepcion de comprobante, mensaje de entrega de cancion, y mensaje de cierre
**Validacion**: Todos los strings usados en el webhook exportados desde `copy.ts`; sin strings hardcodeados en `route.ts`

### Fase 7: Validacion Final

**Objetivo**: Sistema funcionando end-to-end con typecheck y build limpios
**Validacion**:
- [ ] `npm run typecheck` pasa (o `npx tsc --noEmit`)
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot del dashboard confirma que el panel de pagos es visible
- [ ] Criterios de exito cumplidos (revision manual del flujo en codigo)

---

## Aprendizajes (Self-Annealing)

> Esta seccion CRECE con cada error encontrado durante la implementacion.

### 2026-03-17: package.json no tiene script "typecheck"
- **Error**: `npm run typecheck` falla con "Missing script"
- **Fix**: Usar `npx tsc --noEmit` directamente
- **Aplicar en**: Todos los proyectos hasta agregar el script en package.json

---

## Gotchas

- [ ] La URL de imagen de WhatsApp Cloud API es temporal (expira en minutos) — descargar y subir a Storage inmediatamente al recibirla en el webhook
- [ ] Para descargar la imagen de Meta se necesita hacer GET a `https://graph.facebook.com/v21.0/{media-id}` con el token de acceso para obtener la URL real, luego hacer GET a esa URL con el mismo token para obtener los bytes
- [ ] El payload de WhatsApp para imagenes tiene estructura diferente: `msg.type === 'image'` y `msg.image.id` en lugar de `msg.text.body`
- [ ] Supabase Storage buckets necesitan politica de acceso; usar `createAdminClient()` para subir desde el webhook (service role bypass RLS)
- [ ] La cancion en V1 no tiene audio generado — la "entrega" es la letra en formato documento PDF o texto enriquecido; en V2 se integrara generacion de audio
- [ ] El boton de confirmacion en el dashboard debe ser idempotente (no confirmar dos veces el mismo pago); verificar que `status === 'pago_pendiente'` antes de actualizar
- [ ] `admin_pagos` no puede ver la letra en la politica RLS actual de `songs` (solo `administrador` y `creativo`) — la politica debe incluir `admin_pagos` o la letra se debe obtener desde `orders.story_text` como referencia
- [ ] WhatsApp no acepta envio de documentos sin URL publica accesible; usar URL firmada de Supabase Storage con expiracion larga (1 hora)

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan (seguir patron de `store-message.ts` y `update-order-status.ts`)
- NO ignorar errores de TypeScript
- NO hardcodear precio ni datos bancarios en el codigo — usar constantes en `copy.ts` o variables de entorno
- NO omitir validacion Zod en inputs de Server Actions
- NO almacenar imagenes en base64 en la DB — siempre usar Supabase Storage y guardar solo la URL
- NO bloquear el webhook esperando la carga de la imagen — si falla el upload, actualizar order a `requiere_procesamiento_manual` y continuar

---

*PRP pendiente aprobacion. No se ha modificado codigo.*

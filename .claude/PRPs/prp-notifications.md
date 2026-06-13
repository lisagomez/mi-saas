# PRP-016: Notifications — Web Push (PWA)

> **Estado**: COMPLETADO ✓ (documentado retroactivamente el 2026-06-13)
> **Fecha**: 2026-06-13
> **Proyecto**: mi-saas

---

## Objetivo

Permitir notificaciones push web (PWA) al equipo operativo: suscribir un dispositivo,
persistir la suscripción, y enviar notificaciones desde el servidor (ej. nuevo pago por
confirmar, alerta del guardián).

## Por Qué

| Problema | Solución |
|----------|----------|
| El equipo no se entera en tiempo real de eventos accionables (pago, alerta) | Web Push entrega notificaciones aunque la pestaña esté cerrada |
| Las suscripciones deben sobrevivir y de-duplicarse por dispositivo | `push_subscriptions` guarda el endpoint; al re-suscribir se elimina la anterior |
| El envío no debe ser disparable por cualquiera | `POST /api/notifications/send` exige service role |

## Qué

### Criterios de Éxito
- Un usuario puede suscribirse desde el cliente (`usePushSubscription` + `PushNotificationPrompt`).
- La suscripción se persiste sin duplicados por dispositivo.
- El servidor puede enviar una notificación a las suscripciones activas (solo service role).

### Comportamiento Esperado
1. `POST /api/notifications/subscribe` — guarda/actualiza la suscripción en `push_subscriptions` (elimina la previa del mismo dispositivo).
2. `POST /api/notifications/send` — envía push a suscriptores; autorizado solo con service role.
3. `usePushSubscription` maneja permisos y registro en el cliente; `PushNotificationPrompt` pide el opt-in.

## Contexto

### Archivos
- `src/features/notifications/hooks/usePushSubscription.ts`
- `src/features/notifications/components/PushNotificationPrompt.tsx`
- `src/app/api/notifications/{subscribe,send}/route.ts`

### Tablas involucradas
- `push_subscriptions` — endpoint + keys por dispositivo.
- `notifications` — registro de notificaciones (si se historiza el envío).

## Gotchas
- iOS requiere que la app esté instalada como PWA para recibir push.
- VAPID keys deben estar configuradas en env (no exponerlas en cliente).

## Aprendizajes
### 2026-06-13: Documentado retroactivamente
Feature ya implementada (hook + prompt + API). PRP creado para cerrar la brecha PRP↔código.

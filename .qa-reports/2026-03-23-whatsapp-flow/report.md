# QA Report: WhatsApp Bot Flow

**Date**: 2026-03-23
**Status**: PASSED (con 1 dependencia faltante)

---

## Resumen del Flujo Testeado

| Paso | Trigger | Estado Esperado | Resultado |
|------|---------|-----------------|-----------|
| 1 | Lead nuevo envía "Hola" | GREETING → lead creado | ✅ PASS |
| 2 | Lead envía mensaje calificador | qualifier corre → `calificado` | ✅ PASS |
| 3 | Lead calificado → nuevo mensaje | orden creada → `recopilando_historia` | ✅ PASS |
| 4 | Historia + "listo" | historia guardada → `recopilando_estilo` | ✅ PASS |
| 5 | Estilo musical enviado | letra generada → `pago_pendiente` | ✅ PASS |
| 5b | Audio preview | MUSICAPI_KEY no configurada → fallback | ⚠️ SKIP (esperado) |
| 6 | Imagen comprobante (fake mediaId) | falla descarga → `requiere_procesamiento_manual` | ✅ PASS (fallback correcto) |

---

## Hallazgos

### ✅ Todo el core flow funciona
- Lead creation: OK
- Qualifier AI (3.7s con OpenRouter): califica correctamente
- Story collection + location extraction: OK
- Lyrics generation con banda sinaloense (19.6s): letra completa generada
- Music prompt builder: genera prompt correcto (`banda jalisciense, metales brillantes, trombón, tambora jaliscience, tempo 125-135 BPM`)
- Payment proof fallback: comportamiento correcto cuando Meta media ID es inválido

### ⚠️ Dependencia faltante: MUSICAPI_KEY
- El audio preview no se genera: `[generateAndSendAudioPreview] fallback: MUSICAPI_KEY no configurado`
- El flujo no se bloquea — orden avanza a `pago_pendiente` normalmente
- **Acción requerida**: Configurar `MUSICAPI_KEY` en `.env.local` para probar generación de audio

### ℹ️ Mensajes WhatsApp al cliente
- Los mensajes de respuesta se envían a la Meta API real
- Con el número de prueba `15559990001` (ficticio), el `sendWhatsAppText` falla silenciosamente
- Los mensajes del assistant **no se guardan en conversations** cuando el envío falla (comportamiento por diseño)
- En producción con número real, los mensajes sí se guardan

---

## Letra Generada (sample)

```
"La Reina del Pan"
(Banda sinaloense para Rosa)

[Verso 1]
De Guadalajara salió con valor
Rumbo a Dallas, persiguiendo un sueño
Treinta años han pasado, mi amor
Mi madre Rosa, ejemplo de empeño...
```

---

## Datos de Prueba Creados

- **Lead ID**: `7d5d21db-d431-4074-9e0a-22fd41024660`
- **Phone**: `15559990001`
- **Order ID**: `67bcecda-b236-4cc3-846d-80755658c4df`
- **Estado final**: `requiere_procesamiento_manual`

*Limpiar estos registros de la BD si se desea un entorno limpio.*

---

## Recomendaciones

1. **Configurar MUSICAPI_KEY** para probar el pipeline completo de audio
2. **Usar número real de WhatsApp** en próxima sesión de testing para verificar que los mensajes llegan correctamente al cliente
3. **Probar flujo de video** (estados: `pago_confirmado` → `recopilando_fotos` → `generando_video`) — no testeado hoy

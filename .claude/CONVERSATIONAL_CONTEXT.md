# Conversational Context — CancioBot
> Aprendido de conversaciones reales. Actualizar cada vez que se analicen nuevos chats.
> Última actualización: 2026-04-10

---

## Demografía del cliente

- Migrantes latinos en EE.UU. (Guatemala, México, Puerto Rico, Cuba, Honduras)
- Hablan español coloquial con variantes regionales
- Escriben con ortografía fonética ("cñansa" = chance, "vien" = bien, "ñetos" = nietos)
- Mezclan voz y texto — prefieren notas de voz para historias largas
- Responden días después (trabajo, vida ocupada)
- Tono muy cálido y familiar ("primo", "compa")
- Alta confianza una vez establecida la relación

---

## Flujo Real Observado

```
Contacto inicial (Instagram/Facebook)
  ↓
Lead frío por semanas/meses
  ↓
Re-engagement (promo, follow-up)
  ↓
Historia contada en VOZ o TEXTO LARGO (sin decir "listo")
  ↓
Aclaración de detalles específicos (año, apodo, personas)
  ↓
Bot envía 2 versiones en estilos diferentes
  ↓
Cliente elige + da feedback por voz
  ↓
Versión final completa enviada para revisión familiar
  ↓
Cliente envía comprobante de pago
  ↓
Entrega final + oferta de video
  ↓
Upsell espontáneo ("quiero otro para mis hijos/nietos")
```

---

## Patrones de Lenguaje del Cliente

### Keywords de cierre de historia (observados en chats reales)
Los clientes NO dicen "listo" — cierran la historia con:
- `"bueno ay le dejo esas letras y aver si ase algo bueno primo"` → contiene "le dejo" + "esas letras"
- `"ahí le dejo"` / `"ahi le dejo"` → entrega simbólica de la historia
- `"eso es lo que quiero que salga"` → cierre con intención
- `"con eso quiero"` / `"eso quiero"`
- `"no e tenido cñansa de sentarme a escribir bien lo que quiero"` → aún no terminó

### Señales de que AÚN NO terminaron
- "no he tenido chance" / "ando bien ocupado"
- "ya cuando tenga tiempo te cuento"
- "deme chance" / "deme cñansita"

### Tono y vocabulario de confianza
- "primo" y "compa" como formas de dirigirse al bot
- Responden con calidez cuando el bot usa el mismo tono
- "sale primo" / "muchas grasias primo"
- Comparten planes familiares ("quiero que lo oiga mi esposa e hija")

---

## Campos de Aclaración Críticos (para corridos)

| Campo | Por qué importa | Cómo preguntar |
|-------|-----------------|----------------|
| **Año del evento** | "16 de enero" sin año es ambiguo | "¿El 16 de enero de qué año fue eso?" |
| **Forma del apodo** | "el Fily" vs "el Compa Fily" vs "Felipe" | "¿Cómo quieres que aparezca en la canción: 'Fily', 'el Fily' o 'el Compa Fily'?" |
| **Personas secundarias** | Amigos/compañeros mencionados merecen nombre | "¿Cómo se llama [X]? ¿Lo incluimos también?" |
| **Lugar de nacimiento** | Referencia regional enriquece el corrido | "¿En qué estado/municipio naciste, compa?" |
| **Relación con personas mencionadas** | Padre, hermano, compadre — importa para la letra | Preguntar si no es claro |

---

## Datos del Equipo Humano (Aprendidos)

### Formato de datos de pago (real)
```
4027 6600 2221 0266 - Banco Azteca - ciudad Veracruz, estado Veracruz, Mexico
a nombre de Juan Gómez Austria
```
El bot ya genera esto desde `PAYMENT_ACCOUNTS` env var. ✓

### Proceso de revisión real
1. Enviar "el inicio" (preview parcial) para generar expectativa
2. Luego versión completa (o 2 estilos diferentes)
3. El cliente puede pedir ajustes ("quiero que quede bien perrón")
4. La letra se refina con sus notas de voz

> **Brecha actual**: El bot envía 1 audio preview en background. Los clientes reales esperan
> poder elegir entre 2 estilos. Pendiente de implementar (requiere Suno múltiple o 2 prompts).

---

## Fricción Observada

| Punto | Problema | Solución implementada |
|-------|----------|----------------------|
| Historia sin "listo" | Cliente no sabe que debe decir "listo" | Expandido `detect-story-done.ts` con frases naturales |
| Detalles incompletos | Bot genera letra con datos ambiguos | Nuevo estado `aclarando_detalles` + `detect-missing-details.ts` |
| Revisión familiar | Cliente necesita tiempo para escuchar con la familia | Bot ya es paciente (no hay timeout) |
| Pago por Banco Azteca | Transferencia internacional desde EE.UU. | Configurado en `PAYMENT_ACCOUNTS` |

---

## Oportunidades de Upsell

**Momento:** Justo después de escuchar/aprobar la canción entregada.
**Trigger del cliente:** mencionar "mis hijos", "mis nietos", "mis compadres", "la otra", "quiero otro".
**Respuesta actual:** `SONG_DELIVERY_CLOSING_MESSAGE` — menciona explícitamente próxima canción. ✓

---

## Patrones NO Implementados (Backlog)

- [ ] **Enviar 2 versiones de audio** en diferentes estilos para que el cliente elija
- [ ] **Mensaje de "preview parcial"** antes de la versión completa ("aquí el inicio...")
- [ ] **Solicitar pago DESPUÉS** de que el cliente aprueba verbalmente (actualmente el bot lo pide con la letra)
- [ ] **Transcripción de voz + confirmación** — avisar al cliente "recibí tu nota de voz, escuchando..."

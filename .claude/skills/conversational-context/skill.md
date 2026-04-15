# Skill: conversational-context

## Propósito
Aprende de conversaciones reales (exports de WhatsApp u otros formatos) para extraer patrones
conversacionales e integrarlos al bot. Adaptable a cualquier negocio con flujo conversacional.

## Cuándo activar
- "Analiza estos chats"
- "Aprende de estas conversaciones"
- "Mejora el bot con estos ejemplos"
- "Integra este contexto conversacional"
- "Tengo un ejemplo de conversación real"

---

## Marco de Análisis (Business-Agnostic)

Al recibir conversaciones reales, extraer y documentar:

### 1. Estados y Transiciones Observados
Mapear el flujo real:
```
Estado A → (trigger: qué dijo el cliente) → Estado B
```
Comparar con el flujo programado en el bot e identificar brechas.

### 2. Patrones de Lenguaje del Cliente
- Vocabulario específico del nicho/demografía
- Palabras de cierre naturales (¿cuándo termina de "contar"?)
- Emojis y tono usados
- Velocidad de respuesta (¿cuánto tiempo entre mensajes?)
- Medios usados: texto, voz, imágenes

### 3. Puntos de Fricción
- ¿Dónde se pierden o demoran los clientes?
- ¿Qué preguntas hacen que el bot no responde bien?
- ¿Qué malentendidos ocurren?
- ¿En qué estado se quedan "atorados"?

### 4. Patrones de Aclaración
- ¿Qué detalles el equipo humano pidió al cliente antes de producir?
- ¿Qué preguntas fueron necesarias para entregar un mejor producto?
- Template: `[campo_faltante] → [pregunta natural para pedirlo]`

### 5. Oportunidades de Upsell/Recompra
- ¿En qué momento el cliente expresó interés en más productos?
- ¿Qué detonó esa expresión de interés?
- ¿Qué respuesta del equipo humano la facilitó?

### 6. Frase y Tono Exitosos
- Mensajes del equipo que generaron respuestas positivas
- Términos de confianza usados ("primo", "compa", "pa", etc.)
- Estructura de los mensajes que funcionaron

---

## Proceso de Ejecución

### Paso 1: Parsear el archivo
Si el input es un archivo `.zip` de WhatsApp:
```bash
python3 -c "
import zipfile, sys
with zipfile.ZipFile('path.zip') as z:
    z.extractall('/tmp/chat_extract')
    print(z.namelist())
"
```
Leer el `.txt` extraído. Formato: `DD/MM/AA, HH:MM - Contacto: mensaje`

Si es texto inline, procesar directamente.

### Paso 2: Clasificar líneas
```
NEGOCIO: líneas del número del negocio
CLIENTE: líneas del número del cliente
SISTEMA: líneas del sistema (cifrado, archivos adjuntos)
ADJUNTO: archivos de audio/imagen (marcar como [VOZ] o [IMAGEN])
```

### Paso 3: Analizar con el marco

Para cada conversación, completar esta tabla:

| Dimensión | Observado | ¿Está en el bot? | Acción |
|-----------|-----------|------------------|--------|
| Estados recorridos | ... | SI/NO | ... |
| Keywords de cierre | ... | SI/NO | Agregar a detect-story-done |
| Preguntas de aclaración | ... | SI/NO | Crear detect-missing-details |
| Upsell moment | ... | SI/NO | Agregar a copy.ts |
| Tono/lenguaje | ... | SI/NO | Actualizar mensajes |

### Paso 4: Generar CONVERSATIONAL_CONTEXT.md

Crear o actualizar `.claude/CONVERSATIONAL_CONTEXT.md` con:

```markdown
# Conversational Context — [Fecha de análisis]

## Negocio
[Nombre y propuesta de valor]

## Demografía del cliente
[Origen, edad aprox, cómo hablan, medios preferidos]

## Flujo conversacional real (observado)
[Diagrama o lista de estados reales]

## Patrones de lenguaje
### Keywords de cierre de historia
[Lista de frases que indican "ya terminé de contar"]

### Frases de confianza que funcionaron
[Lista de saludos/términos que generaron respuesta positiva]

## Preguntas de aclaración críticas
[Por campo: qué preguntar y cómo]

## Fricción observada
[Lista de puntos donde el cliente se demora o confunde]

## Oportunidades de upsell
[Momentos y frases que detonan interés en más]
```

### Paso 5: Integrar al bot

Según las brechas encontradas, modificar:

| Archivo | Qué actualizar |
|---------|----------------|
| `detect-story-done.ts` | Agregar keywords naturales de cierre |
| `detect-missing-details.ts` | Ajustar prompt con los campos críticos del negocio |
| `copy.ts` | Mensajes en el tono correcto del negocio |
| `route.ts` | Nuevos estados si el flujo real los requiere |
| `lyrics-prompt.ts` / prompt equivalente | Incluir campos de aclaración en la generación |
| `CLAUDE.md` | Documentar aprendizajes en la sección Auto-Blindaje |

---

## Adaptación a Otros Contextos

Este skill es genérico. Para adaptarlo a un negocio diferente:

1. Cambiar `detect-missing-details.ts` → ajustar el prompt con los campos críticos del producto
2. Cambiar `detect-story-done.ts` → keywords según el vocabulario de ese nicho
3. Cambiar `copy.ts` → tono según la demografía del cliente
4. Mantener la misma arquitectura de estados en `route.ts`

### Ejemplos de adaptación
- **Pastelería personalizada**: campos = sabor, tamaño, dedicatoria, fecha de entrega
- **Joyería grabada**: campos = nombre(s), fecha, frase corta
- **Fotografía de bodas**: campos = fecha, lugar, estilo visual, personas clave
- **Corridos/canciones** (CancioBot): campos = apodo, año de evento, lugar de nacimiento, personas mencionadas

---

## Contexto CancioBot (Aprendido de Conversaciones Reales)

Documentado en `.claude/CONVERSATIONAL_CONTEXT.md`. Resumen:

### Keywords de cierre de historia (expandidos)
Los clientes raramente dicen "listo". Usan:
- "bueno ay le dejo esas letras" → contiene "le dejo"
- "eso es lo que quiero en el corrido"
- "ahi le dejo" / "ahí le dejo"
- "aver si ase algo bueno"

### Campos de aclaración críticos para corridos
1. **Año del evento** — frecuente decir "el 16 de enero" sin año
2. **Forma del apodo** — "el Fily" vs "el Compa Fily" vs "Felipe"
3. **Personas secundarias** — amigos/compañeros mencionados que merecen nombre
4. **Lugar de nacimiento** — enriquece el corrido con referencia regional

### Flujo real observado (vs flujo programado)
```
Real:  historia (voz/texto) → estilo (voz) → [aclaración] → 2 versiones → elegir → pago → entrega
Bot:   historia → "listo" → estilo → letra → pago → preview audio → entrega
```
Brecha principal: el bot no pregunta detalles de aclaración antes de generar.

### Upsell natural
El cliente pide más canciones espontáneamente después de recibir la primera.
Trigger: "mis hijos", "mis nietos", "mis compadres".
Mensaje actual en SONG_DELIVERY_CLOSING_MESSAGE ya lo facilita.

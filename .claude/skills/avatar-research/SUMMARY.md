# Avatar Research — Resumen de Capacidades

> Skill de investigación de perfiles de cliente. Combina datos reales de Supabase con búsqueda web y síntesis con IA para construir un buyer persona basado en evidencia.

---

## Cómo se activa

Decir frases como:
- "Investiga mi avatar"
- "¿Quién es mi cliente ideal?"
- "Buyer persona de mis leads de Jalisco"
- "Analiza los hábitos de consumo de mi audiencia"
- "Haz un avatar research de migrantes mexicanos en California"

---

## Qué hace (5 fases)

### Fase 0 — Detecta lo que ya sabes
Si ya hay avatares investigados en la biblioteca (`avatars`), analiza qué insights son más divergentes o se contradicen entre sí. Orienta las búsquedas web hacia los ángulos menos explorados. Si no hay avatares previos, salta directo a la Fase 1.

### Fase 1 — Captura el perfil base
Dos modos de entrada:

| Modo | Cuándo usarlo |
|------|--------------|
| **Manual** | El usuario describe el perfil: origen, estado en EE.UU., edad, ocasión, estilo musical |
| **Desde leads reales** | Consulta Supabase y extrae el segmento más frecuente (origen + residencia + estilo musical) |

### Fase 2 — Enriquece con datos internos
Cruza el perfil con:
- `preferences_catalog` — directivas de bot por región/estilo
- `leads` + `orders` — tasa de conversión real por segmento

### Fase 3 — Investigación web (mínimo 5 búsquedas)
Temas cubiertos:
1. Demografía e ingresos del segmento
2. Uso de WhatsApp y comportamiento digital
3. Hábitos de regalo y ocasiones especiales
4. Preferencias musicales por región
5. Pain points y motivadores emocionales

Síntesis con IA (Gemini 2.0 Flash via OpenRouter) → extrae datos estructurados: gasto promedio, motivadores, barreras, canales, horario ideal de contacto.

### Fase 4 — Reporte estructurado
Genera un documento con:
- Demografía (origen, región EE.UU., edad, ingreso estimado)
- Perfil de consumo (gasto, frecuencia, canales, dispositivo, idioma)
- Preferencias musicales (estilo, artistas, subgéneros por ocasión)
- Motivadores emocionales top 3
- Barreras de compra + cómo superarlas
- Datos reales de tus leads (no proyecciones)
- Gancho emocional recomendado + momento ideal de contacto

### Fase 5 — Persiste en Supabase
Guarda el reporte en `agent_reports` (tipo `avatar_research`) con JSON estructurado y markdown completo. Genera embedding vectorial del perfil para búsqueda semántica futura (requiere `OPENROUTER_API_KEY`).

---

## Tablas que usa

| Tabla | Para qué |
|-------|---------|
| `leads` | Segmento dominante real (origen + residencia) |
| `orders` | Estilo musical más pedido + historias de clientes |
| `preferences_catalog` | Directivas de bot por región/estilo |
| `avatars` | Biblioteca de perfiles (embedding vectorial) |
| `avatar_insights` | Insights individuales inmutables por avatar |
| `proactive_insights` | Insights que alimentan al skill content-prompt-gen |
| `agent_reports` | Donde se guarda el reporte final |
| `competitors` | Sugerencia si la web detecta competidores nuevos |
| `ai_usage` | Registro del costo de la llamada IA (tokens + USD) |

---

## Output al usuario

1. Reporte completo en markdown
2. **3 insights accionables** — qué cambiar hoy en el bot o en los mensajes
3. Confirmación de guardado en `agent_reports`

---

## Integración con otros skills

| Hallazgo | Acción sugerida |
|----------|----------------|
| Baja conversión en un segmento | Ajustar `preferences_catalog` para esa región |
| Ocasión de alto gasto no cubierta | Agregar a `promotions_catalog` |
| Competidor nuevo identificado | Agregar a tabla `competitors` |
| Nuevo canal identificado | Documentar en `business_domain` |
| Avatar guardado | `content-prompt-gen` puede generar copy usando ese perfil |

---

## Estado actual

| Componente | Estado |
|-----------|--------|
| SKILL.md (lógica completa) | Implementado |
| Schema de tablas (references/schema.md) | Documentado |
| Tablas en Supabase (`avatars`, `avatar_insights`, `proactive_insights`) | Creadas, sin datos |
| `agent_reports` con tipo `avatar_research` | Requiere migration en primera ejecución |
| Embedding vectorial | Funcional si `OPENROUTER_API_KEY` está configurada |

---

*Skill parte de SaaS Factory V4 — CancioBot*

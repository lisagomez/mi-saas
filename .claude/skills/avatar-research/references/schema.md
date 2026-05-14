# Tablas de Supabase relevantes para Avatar Research

## leads
Contiene el origen geográfico de cada contacto.

| Columna | Tipo | Uso en avatar research |
|---------|------|----------------------|
| `origin` | varchar | País de origen del lead (ej: "México", "Honduras") |
| `residence` | varchar | Estado/ciudad en EE.UU. |
| `source` | varchar | Canal de adquisición (facebook, whatsapp, etc.) |
| `qualification_status` | varchar | pending / calificado / no_calificado |

**Query clave:** agrupar por `origin` + `residence` para identificar el segmento dominante.

---

## orders
Preferencias musicales y comportamiento de pedido.

| Columna | Tipo | Uso en avatar research |
|---------|------|----------------------|
| `musical_style` | varchar | Estilo elegido (norteño, banda, cumbia, bachata…) |
| `story_text` | text | Historia del cliente — fuente de motivadores emocionales |
| `status` | varchar | Estado del pedido — indica abandono o conversión |

---

## preferences_catalog
Configuración de preferencias por región. Directamente aplicable al avatar.

| Columna | Tipo | Uso en avatar research |
|---------|------|----------------------|
| `regions` | text[] | Regiones a las que aplica (ej: ["jalisco", "michoacan"]) |
| `styles` | text[] | Estilos musicales para esa región |
| `directives` | text | Instrucciones especiales para el bot con ese perfil |
| `is_active` | bool | Solo usar registros activos |

---

## agent_reports
Donde se persiste el reporte generado.

| Columna | Tipo | Uso en avatar research |
|---------|------|----------------------|
| `agent_type` | text | `'avatar_research'` (requiere migration setup) |
| `report_json` | jsonb | Reporte estructurado completo |
| `generated_at` | timestamptz | Fecha de generación |

**IMPORTANTE:** La constraint original solo permite `investigator`, `financial`, `promotions`.
El skill corre la migration para agregar `avatar_research` en la primera ejecución.

---

## competitors
Si la investigación web identifica competidores no registrados, sugerirlos aquí.

| Columna | Tipo |
|---------|------|
| `name` | text |
| `price` | text |
| `proposal` | text |
| `advantages` / `disadvantages` | text |

---

## business_domain
Métricas de negocio que pueden enriquecerse con hallazgos del avatar research.

| Columna | Tipo | Categorías |
|---------|------|-----------|
| `name` | text | Nombre de la métrica |
| `formula` | text | Cómo se calcula |
| `category` | text | rentabilidad / experiencia / operacion |

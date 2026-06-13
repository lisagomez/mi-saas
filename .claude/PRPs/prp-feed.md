# PRP-015: Feed — Kanban de Contenido + Log de Trend Radar

> **Estado**: COMPLETADO ✓ (documentado retroactivamente el 2026-06-13)
> **Fecha**: 2026-06-13
> **Proyecto**: mi-saas (pipeline de contenido ContactMe)

---

## Objetivo

Dar una vista operativa del contenido como **tablero Kanban** (Ideado → Generado → Aprobado →
Publicado) y un **log auditável del Trend Radar** (los temas semanales detectados, su reasoning
y decisión), conectando el pipeline de estrategia con la ejecución de publicación.

## Por Qué

| Problema | Solución |
|----------|----------|
| No había un lugar para ver y mover el estado de cada pieza de contenido | `KanbanBoard` con 4 columnas y `update-post-status` para transicionar posts |
| Las decisiones del Trend Radar (qué tema y por qué) eran opacas | `TrendRadarLog` muestra `weekly_trends` con `reasoning`, `relevance_score` y `decision_type` |
| Faltaba trazabilidad entre tema semanal → post | `posts.weekly_theme_id` vincula cada post con el tema que lo originó |

## Qué

### Criterios de Éxito
- Listar posts agrupados por `status` y permitir cambiar su estado.
- Mostrar el log de corridas del Trend Radar con su decisión (`first_run`, `auto_replace`, `suggest_adjustment`) y estado (`running`, `success`, `error`).

### Comportamiento Esperado
1. `get-feed-posts` carga `posts` (con `weekly_theme` y `avatar_name` resueltos).
2. `update-post-status` cambia `posts.status` (`Ideado | Generado | Aprobado | Publicado`).
3. `get-trend-logs` carga `weekly_trends` para el `TrendRadarLog`.

## Contexto

### Archivos
- `src/features/feed/services/{get-feed-posts,update-post-status,get-trend-logs}.ts`
- `src/features/feed/components/{KanbanBoard,TrendRadarLog}.tsx`
- `src/features/feed/types/index.ts`
- `src/app/(main)/feed/` (ruta)

### Tablas involucradas
- `posts` — tarjetas del Kanban (`status`, `weekly_theme_id`, `avatar_id`, `format`, `prompt_template`, `body`).
- `weekly_trends` — log del Trend Radar (`theme_json`, `reasoning`, `relevance_score`, `decision_type`, `decision_log`).

## Relación con otros PRPs / skills
- Alimentado por los skills `trend-radar` (genera `weekly_trends`) y `feed-generator` (genera `posts`).
- Los posts `Aprobado` alimentan a [PRP-013 content-generator](prp-content-generator.md).

## Aprendizajes
### 2026-06-13: Documentado retroactivamente
Feature ya implementada (`posts` 2 filas, `weekly_trends` 4 filas). PRP creado para cerrar la brecha PRP↔código.

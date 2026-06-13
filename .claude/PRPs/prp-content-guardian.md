# PRP-014: Content Guardian — Monitoreo de Engagement + Stop-Publishing

> **Estado**: COMPLETADO ✓ (documentado retroactivamente el 2026-06-13)
> **Fecha**: 2026-06-13
> **Proyecto**: mi-saas (pipeline de contenido ContactMe)

---

## Objetivo

Proteger la reputación de marca vigilando los comentarios y el engagement del contenido
publicado: detectar comentarios negativos o palabras prohibidas, levantar alertas, y permitir
**pausar la publicación** automática hasta que el usuario revise y reanude.

## Por Qué

| Problema | Solución |
|----------|----------|
| Un comentario negativo o crisis puede escalar si nadie lo nota a tiempo | `check-comment` evalúa cada comentario contra la config y crea `guardian_alerts` |
| Seguir publicando durante una crisis amplifica el daño | Flag de pausa en `guardian_config`; `resume` la limpia y reconoce alertas |
| El criterio de "qué es negativo" debe ser configurable | `guardian_config` guarda palabras prohibidas / umbrales editables vía `PATCH` |

## Qué

### Criterios de Éxito
- Evaluar un comentario entrante y, si viola la config, crear una alerta y opcionalmente activar la pausa.
- Listar alertas abiertas para el panel.
- Reanudar: limpiar el flag de pausa y marcar las alertas como reconocidas.

### Comportamiento Esperado
1. `GET /api/guardian/config` / `PATCH` — leer y editar la configuración del guardián.
2. `POST /api/guardian/check-comment` — evaluar un comentario contra `guardian_config`; crea `guardian_alerts` si aplica.
3. `GET /api/guardian/alerts` — listar alertas.
4. `POST /api/guardian/resume` — desactivar pausa en `guardian_config` y reconocer (`acknowledge`) las alertas abiertas.
5. `GuardianPanel` muestra estado, alertas y el botón de reanudar.

## Contexto

### Archivos
- `src/features/content-guardian/components/GuardianPanel.tsx`
- `src/app/api/guardian/{config,alerts,check-comment,resume}/route.ts`

### Tablas involucradas
- `guardian_config` — configuración + flag de pausa (1 fila activa).
- `guardian_alerts` — alertas generadas (abiertas / reconocidas).

## Gotchas
- `resume` debe hacer dos cosas: limpiar la pausa Y reconocer alertas abiertas (no solo una).

## Aprendizajes
### 2026-06-13: Documentado retroactivamente
Feature ya implementada (API + `GuardianPanel`, `guardian_config` con 1 fila). PRP creado para cerrar la brecha PRP↔código.

# PRP-013: Content Generator — Copy Orgánico + Pauta desde Insights

> **Estado**: COMPLETADO ✓ (documentado retroactivamente el 2026-06-13)
> **Fecha**: 2026-06-13
> **Proyecto**: mi-saas (pipeline de contenido ContactMe)

---

## Objetivo

Generar piezas de copy listas para publicar a partir de los posts aprobados del feed,
produciendo dos tipos por post — **orgánico** (framework PAS) e **inorgánico/pauta** (AIDA) —
con auditoría automática de marca, dialecto y framework antes de mostrarlas al usuario.

## Por Qué

| Problema | Solución |
|----------|----------|
| Las plantillas del feed (`prompt_template`) no son copy final publicable | El generador expande cada plantilla en `content_pieces` por formato y red social |
| El copy puede salirse del tono de marca o usar voseo donde corresponde tuteo | Capa de auditoría IA (`brand_voice`, `cta_compliance`, `avatar_pain_alignment`, `framework_integrity`) + `dialectRule()` por origen del avatar |
| El costo de IA debe ser rastreable por pieza | Cada generación registra `token_cost_usd` y `audit_score` en la pieza |

## Qué

### Criterios de Éxito
- Para un post aprobado, generar piezas `tipo = 'organico' | 'pauta'` por formato (Reel, Carousel, Post, Story).
- Cada pieza pasa una auditoría IA con `overall` boolean + `correction_brief`; se persiste `audit_score`.
- El dialecto respeta el origen del avatar (tuteo obligatorio salvo Argentina/Uruguay → voseo rioplatense).
- Costo de tokens estimado y guardado por pieza.

### Comportamiento Esperado
1. `GET /api/content/pieces` lista piezas existentes desde `content_pieces`.
2. `POST /api/content/generate` (o `generate-pieces`) toma un post + avatar + insights y genera copy con `generateText` (OpenRouter, `MODELS.fast`), audita con temperatura 0.1 y guarda.
3. `ContentGeneratorView` muestra los posts aprobados con sus piezas (`PostPiecesCard`, `ContentPieceCard`).

## Contexto

### Archivos
- `src/features/content-generator/services/get-approved-posts-with-pieces.ts`
- `src/features/content-generator/components/{ContentGeneratorView,PostPiecesCard,ContentPieceCard}.tsx`
- `src/features/content-generator/types/index.ts`
- `src/app/(main)/content-generator/` (ruta)
- `src/app/api/content/{generate,generate-pieces,pieces}/route.ts`

### Tablas involucradas
- `posts` — post del feed (estado `Aprobado` alimenta al generador).
- `content_pieces` — pieza generada: `post_id`, `format`, `tipo`, `red_social[]`, `body`, `token_cost_usd`, `audit_score`.
- `ai_usage` — registro de costo (vía `logAiUsage`).

## Gotchas
- OpenRouter: usar `generateText` + `JSON.parse` manual, NO `generateObject`.
- El dialecto se decide por `origin` del avatar — verificar cada verbo (-ás/-és/-ís = voseo).

## Aprendizajes
### 2026-06-13: Documentado retroactivamente
Feature ya implementada y en uso (5 filas en `content_pieces`). PRP creado para cerrar la brecha PRP↔código.

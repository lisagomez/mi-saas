# PRP-019: Judge para Strategy-Bridge

> **Estado**: COMPLETADO ✓ (verificado 2026-06-13)
> **Fecha**: 2026-05-16
> **Proyecto**: mi-saas (CancioBot)

---

## Objetivo

Agregar un sistema "Judge" que rankea automáticamente los `proactive_insights` de un avatar
antes de mostrarlos en strategy-bridge, combinando razonamiento IA (cold-start) con historial
real de `content_outcomes` y señales de override de la usuaria, para que siempre se presente
primero el insight con mayor probabilidad de conversión.

## Por Qué

| Problema | Solución |
|----------|----------|
| Los 5 proactive_insights se muestran en orden de inserción — sin prioridad | El Judge rankea por probabilidad de éxito antes de mostrarlos |
| Día 1 no hay data real de content_outcomes (0 rows) | Cold-start: IA razona sobre avatar_insights para inferir qué funcionaría |
| La usuaria elige el insight "a ojo" sin criterio auditable | Top ranked siempre visible con reasoning explicado; los demás colapsados |
| No hay mecanismo de aprendizaje cuando la usuaria prefiere otro insight | Tabla `judge_overrides` captura las elecciones manuales como señal de feedback |

**Valor de negocio**: Reducir el tiempo de decisión de qué contenido crear + aumentar la tasa
de conversión del feed al poner primero el insight con más contexto a favor. El Judge mejora
con cada override real que registra la usuaria.

## Qué

### Criterios de Éxito

- [ ] `proactive_insights` se muestran rankeados de mayor a menor `score_judge` en AvatarCard
- [ ] El insight top aparece resaltado con reasoning visible sin necesidad de expandir
- [ ] Los insights secundarios (rank 2-5) aparecen colapsados con opción de desplegar
- [ ] El botón "Usar este en su lugar" registra un override en `judge_overrides`
- [ ] En cold-start (0 content_outcomes para el avatar) el Judge funciona con solo avatar_insights
- [ ] En ejecuciones posteriores, los overrides previos se incluyen como contexto al Judge
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado (Happy Path)

```
1. Usuaria abre /avatar-research → ve AvatarCard con sus insights
2. Sistema llama a rankInsightsWithJudge(avatar_id) [Server Action]
3. Judge lee: proactive_insights + avatar_insights + content_outcomes + judge_overrides (todo del avatar)
4. IA genera ranking con score 0-100 + reasoning de 1 oración por insight
5. AvatarCard muestra:
   ┌─────────────────────────────────────────────┐
   │ ⭐ [Gancho] "Mamá que nunca olvidará"       │
   │   Score: 87 · "Alta resonancia emocional    │
   │   con el motivador #1: nostalgia familiar"   │
   │   [Copiar prompt] [Usar para feed]           │
   ├─────────────────────────────────────────────┤
   │ ▾ [Barrera] "Superar objeción de precio"   rank 2 │
   │ ▾ [Timing]  "Viernes 7pm es el momento"    rank 3 │
   │ ▾ [Canal]   "Facebook domina su atención"  rank 4 │
   │ ▾ [Precio]  "Ancla en $45 como regalo"     rank 5 │
   └─────────────────────────────────────────────┘
6. Usuaria decide usar rank 3 → clic en "Usar este en su lugar"
7. Se registra override: insight_id (rank 1) → chosen_insight_id (rank 3)
8. En próxima ejecución del Judge, el override se incluye como contexto adicional
```

---

## Contexto

### Referencias

- `src/features/avatar-research/` — Feature que consume el Judge (AvatarCard + get-avatars)
- `src/features/avatar-research/components/AvatarCard.tsx` — UI a modificar para mostrar ranking
- `src/features/avatar-research/services/get-avatars.ts` — Server Action a extender con rank data
- `.claude/skills/strategy-bridge/SKILL.md` — Skill que produce los proactive_insights que el Judge rankea
- `.claude/skills/ai/references/single-call.md` — Patrón de llamada IA con generateText + JSON.parse manual

### Tablas Supabase relevantes (esquema real confirmado)

**proactive_insights** (5 rows)
- `id`, `avatar_id` (FK → avatars ON DELETE CASCADE), `insight_type` (check constraint), `title`, `body`, `confidence` (high/medium/low), `status` (pending/actioned/validated/revisión), `classification` (jsonb: canal, tipo, formato, estrategia_venta), `prompt_template`, `created_at`, `updated_at`

**avatar_insights** (5 rows)
- `id`, `avatar_id`, `insight_type`, `content`, `evidence_url`, `embedding` (vector), `parent_insight_id`, `created_at`

**content_outcomes** (0 rows — cold-start)
- `id`, `proactive_insight_id`, `avatar_id`, `variant_type`, `platform`, `post_url`, `published_at`, `likes_count`, `comments_count`, `shares_count`, `views_count`, `clicks_count`, `reach_count`, `engagement_score`, `hook_text`, `framework_used`, `copy_summary`, `last_scraped_at`, `scrape_status`, `scrape_notes`, `raw_scrape_data`, `campaign_id`, `created_at`, `updated_at`

**events** (0 rows)
- `id`, `strategy_id` (apunta a content_outcomes.id), `event_type`, `platform`, utm fields, `lead_id`, `metadata`, `created_at`

**v_strategy_scores** (view existente)
- Vista que cruza content_outcomes + facebook_campaigns + events → `composite_score`, `dm_count`, `save_count`, `click_count`

### Arquitectura Propuesta (Feature-First)

```
src/features/avatar-research/
├── components/
│   └── AvatarCard.tsx              ← MODIFICAR: mostrar ranking Judge
├── services/
│   ├── get-avatars.ts              ← MODIFICAR: incluir judge_ranking en return
│   └── rank-insights-with-judge.ts ← NUEVO: Server Action del Judge
└── types/
    └── judge.ts                    ← NUEVO: tipos JudgeRanking, JudgeOverride
```

### Modelo de Datos

```sql
-- Nueva tabla: persiste los overrides de la usuaria
CREATE TABLE judge_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id         UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  suggested_id      UUID NOT NULL REFERENCES proactive_insights(id) ON DELETE CASCADE,
  chosen_id         UUID NOT NULL REFERENCES proactive_insights(id) ON DELETE CASCADE,
  reason_text       TEXT,                          -- opcional: por qué eligió otro
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE judge_overrides ENABLE ROW LEVEL SECURITY;
-- RLS: solo admins (la app usa createAdminClient para leer/escribir — sin RLS policy necesaria en lectura admin)

-- Nueva tabla: cachea el resultado del Judge para no llamar IA en cada page load
CREATE TABLE judge_rankings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id     UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  insight_id    UUID NOT NULL REFERENCES proactive_insights(id) ON DELETE CASCADE,
  rank          SMALLINT NOT NULL,           -- 1 = mejor
  score_judge   NUMERIC(5,2) NOT NULL,       -- 0-100
  reasoning     TEXT NOT NULL,
  computed_at   TIMESTAMPTZ DEFAULT NOW(),
  override_count INTEGER DEFAULT 0,          -- veces que fue ignorado por override
  UNIQUE (avatar_id, insight_id)             -- un ranking por par avatar+insight
);

ALTER TABLE judge_rankings ENABLE ROW LEVEL SECURITY;
```

**Decisión de cache**: El ranking se recalcula (nueva llamada IA) solo cuando:
1. Se insertan nuevos `proactive_insights` para el avatar
2. Se registra un nuevo `judge_override`
3. La usuaria pulsa "Re-rankear" (acción manual)

En todos los demás casos, se sirve desde `judge_rankings` (cache persistente en DB).

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migración — Tablas judge_overrides y judge_rankings
**Objetivo**: Crear las dos nuevas tablas con sus constraints, FK, RLS habilitado, e índices.
**Validación**: `mcp__supabase__list_tables` muestra ambas tablas; no hay errores de migración.

### Fase 2: Server Action rank-insights-with-judge.ts
**Objetivo**: Implementar la función principal del Judge: leer contexto (avatar_insights + content_outcomes via v_strategy_scores + judge_overrides), llamar a IA con generateText + JSON.parse, persistir resultado en judge_rankings.
**Validación**: Llamada directa con un avatar_id válido retorna array ordenado con rank/score_judge/reasoning; el resultado queda en judge_rankings.

### Fase 3: Integrar ranking en get-avatars.ts
**Objetivo**: Modificar get-avatars para que al cargar cada avatar consulte judge_rankings y enriquezca cada ProactiveInsight con `rank`, `score_judge`, `reasoning`, `override_count`. Si no hay ranking cacheado, disparar rank-insights-with-judge en background.
**Validación**: El tipo `ProactiveInsight` en get-avatars.ts tiene los campos nuevos; no hay errores de TypeScript.

### Fase 4: Server Action save-judge-override.ts
**Objetivo**: Implementar el endpoint que registra un override (suggested_id → chosen_id + reason_text opcional) e invalida el cache del Judge para ese avatar (borra judge_rankings del avatar → fuerza recálculo en próximo load).
**Validación**: Al registrar un override aparece fila en judge_overrides; judge_rankings del avatar queda limpio.

### Fase 5: UI — AvatarCard con ranking y botón de override
**Objetivo**: Modificar AvatarCard.tsx para mostrar el top insight resaltado con reasoning, los demás colapsados con rank visible, y el botón "Usar este en su lugar" en cada insight secundario que llama a save-judge-override.
**Validación**: Playwright screenshot confirma layout: insight rank 1 destacado, ranks 2-5 colapsados, botón override presente.

### Fase 6: Validación Final
**Objetivo**: Sistema funcionando end-to-end — cold-start y con overrides registrados.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso (NODE_ENV=production)
- [ ] Playwright screenshot muestra AvatarCard con ranking del Judge
- [ ] Override registrado invalida cache y fuerza recálculo en next load
- [ ] En cold-start (sin content_outcomes ni overrides) el Judge retorna ranking coherente basado en avatar_insights
- [ ] Criterios de Éxito de la sección Qué cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta sección CRECE con cada error encontrado durante la implementación.

*(vacío — se completa durante la ejecución del bucle agéntico)*

---

## Gotchas

- [ ] **NUNCA usar `generateObject` con OpenRouter** — usar `generateText` + `JSON.parse` manual (ver feedback_generateObject.md en MEMORY)
- [ ] **Modelo**: `google/gemini-2.0-flash-001` (mismo que strategy-bridge, consistencia)
- [ ] **RLS**: Las tablas nuevas usan `createAdminClient` (server-only) — el policy de RLS puede estar vacío, pero el `ENABLE ROW LEVEL SECURITY` debe estar para proteger acceso directo por anon key
- [ ] **Cache invalidation**: Borrar `judge_rankings` del avatar (no solo marcar stale) — fuerza recálculo limpio en el siguiente page load
- [ ] **Cold-start**: Cuando `content_outcomes` = 0 y `judge_overrides` = 0, el prompt al Judge solo lleva `avatar_insights` — el output sigue siendo válido; no abortar
- [ ] **Unique constraint** en `judge_rankings(avatar_id, insight_id)` — usar `ON CONFLICT (avatar_id, insight_id) DO UPDATE` en el upsert para actualizaciones limpias
- [ ] **Insight_type check constraint** en proactive_insights ya existe — no es necesario expandirlo para el Judge
- [ ] **v_strategy_scores** ya está — el Judge debe leer de ella para obtener `composite_score` por insight en lugar de calcular manualmente desde content_outcomes + events

## Anti-Patrones

- NO calcular el score del Judge en el frontend (toda la lógica en Server Actions)
- NO recalcular ranking en cada page load sin revisar cache en `judge_rankings`
- NO bloquear el render de AvatarCard esperando el cálculo del Judge — si no hay ranking cacheado, mostrar insights en orden original mientras se calcula en background
- NO ignorar errores de TypeScript
- NO hardcodear el modelo de IA — usar constante `JUDGE_MODEL = 'google/gemini-2.0-flash-001'`
- NO omitir `override_count` en el contexto del prompt — es la señal de aprendizaje más valiosa

---

*PRP pendiente aprobación. No se ha modificado código.*

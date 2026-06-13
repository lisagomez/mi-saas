# Briefing del Proyecto — mi-saas

> Actualizado: 2026-06-13. Estado vivo del repo. Para el stack, decision tree y tablas
> base ver `CLAUDE.md` (no se duplica aqui). Este archivo captura lo que NO es derivable
> del codigo: estado actual, decisiones, pendientes y contexto critico.

## Estado actual (2026-06-13)

El repo aloja **dos motores** bajo el mismo Next.js 16 + Supabase:

1. **CancioBot** — bot de WhatsApp que vende canciones personalizadas a migrantes latinos
   en EE.UU. (historia → letra IA → audio Suno → video → entrega + pago). Precios en USD.
2. **Pipeline de contenido (ContactMe)** — fabrica de marketing de Elisa:
   avatar-research → strategy-bridge → trend-radar → feed-generator → content-prompt-gen
   → content-guardian / monitor.

**Supabase:** 40 tablas, RLS habilitado en todas. Con datos vivos: `app_launcher_registry` (16),
`avatar_insights`/`proactive_insights` (5/5), `judge_rankings`/`judge_overrides` (5/5),
`content_pieces` (5), `weekly_trends` (4), `ai_usage` (4), `leads`/`conversations` (2/2),
`posts` (2), `avatars`/`orders`/`videos`/`guardian_config` (1 c/u). El resto vacias pero listas.

**App reciente:** `content-generator` (`✨ Contenido`) — genera variantes orgánico + pauta.
Vive en `src/features/content-generator/` y `src/app/(main)/content-generator/`, con APIs
`/api/content/{generate,pieces,generate-pieces}`.

## Decisiones tomadas

- **2026-06-13 — Titaniumorphism tiene DOS variantes que conviven, no se mezclan.**
  El skill `references/titaniumorphism-skill/` ahora tiene:
  - Variante original "hardware mostaza": acento `#ff9101` + Cormorant + Inter (specs en
    `references/*.md`, creada por Daniel Carreon / SaaS Factory).
  - Variante nueva "cool graphite + azul" (del video *Grafo*): acento `#5fa8e6`, amber solo
    para "el problema", tipografias Sora/Manrope/JetBrains Mono. Vive en `design-system/`
    con tokens CSS + 5 componentes React tipados (MetalHeading, Kicker, GlassChip, KPIStat,
    MetalNode) + guidelines + slides 16:9.
  Regla de un solo acento: usar UNA variante por pieza, nunca combinarlas. La UI titanio
  actual (screenshots `titanio-*.png`) usa esta estetica.
- **2026-06-13 — Al importar el design system Grafo se omitio el video/producto Grafo en si**
  (`Grafo*.html`, `Grafo.scenes.jsx`, scaffolding del visor). Solo se trajo el sistema de
  diseño reutilizable, por no ser de CancioBot/ContactMe.

## Pendientes

- **Push a `origin/main`**: 2 commits locales sin subir (`94d8dfd`, `ce3d502`) al 2026-06-13.
  El repo commitea directo a `main`.
- **Verificar cron de polling de MusicAPI** (`/api/music/poll`) — pendiente de validar en prod.
- **Validar upload a YouTube** del pipeline de video en producción (implementado, no validado).

## Estructura crítica (lo no obvio)

- **Entry point del bot:** `src/app/api/webhooks/whatsapp/route.ts` (POST + GET). Meta pausa
  la entrega tras 401 consecutivos → reactivar con el botón "Test" del webhook en Meta.
- **Memoria del proyecto:** vive en `.claude/memory/` (este sistema, versionado en git).
  Auto-memory de Claude Code DESACTIVADA via `.claude/settings.json`. NO confundir con la
  auto-memory en `~/.claude/projects/...` (local, no viaja con el repo).
- **Design system del producto:** `references/titaniumorphism-skill/` (ver decisiones).

## Contexto crítico

- **IA con OpenRouter:** NO usar `generateObject` (falla). Usar `generateText` + `JSON.parse`
  manual. Toda llamada IA pasa por `guardedAiCall()` contra el presupuesto.
- **Build:** correr `NODE_ENV=production npm run build` (recharts/react-redux crashea el SSR
  en development). Usar `npm run dev` (auto-detecta puerto), nunca `next dev` hardcodeado.
- **Secrets en Vercel:** usar `printf 'SECRET' | npx vercel env add` (NO `echo`, mete `\n`
  que rompe HMAC y causa 401 silenciosos).
- **Mercado CancioBot:** EE.UU., migrantes latinos (MX, HN, PR, CU, GT). Precios en USD.

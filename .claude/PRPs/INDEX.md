# Índice Maestro de PRPs — mi-saas

> Fuente de verdad de la cobertura PRP ↔ código ↔ tablas. Generado/verificado el 2026-06-13
> contra `src/features/`, las rutas en `src/app/` y `list_tables` de Supabase.
> Regla del repo: leer el archivo/código real antes de declarar un estado.

## Cobertura por PRP

| # | Archivo | Feature / ruta | Tablas | Estado | Fecha |
|---|---------|----------------|--------|--------|-------|
| PRP-001 | `prp-orders-conversational-flow.md` | orders, whatsapp-bot · `/api/webhooks/whatsapp` | orders, songs, ai_usage, leads | COMPLETADO ✓ | 2026-03-17 |
| PRP-002 | `prp-payment-flow.md` | orders · panel de pagos | orders, songs | COMPLETADO ✓ | 2026-03-17 |
| PRP-003 | `prp-music-generation.md` | orders/prompts · `/api/music/poll` | songs, leads | COMPLETADO ✓ ‡ | 2026-03-17 |
| PRP-004 | `prp-dashboard-roles.md` | dashboard · `/dashboard` | profiles, orders, songs, competitors, leads, ai_usage | COMPLETADO ✓ | 2026-03-17 |
| PRP-005 | `prp-005-whatsapp-leads-campaign.md` | leads · AdminView | leads, orders, rebuys, promotions_catalog | COMPLETADO ✓ | 2026-03-25 |
| PRP-006 | `prp-video-generation.md` | video-generation | videos, order_photos, orders | EN PROGRESO § | 2026-03-18 |
| PRP-007 | `prp-catalogs.md` | catalogs · `/dashboard/catalogs/*` | promotions_catalog, preferences_catalog, budgets, expenses, business_domain, pricing_campaigns | COMPLETADO ✓ | 2026-03-19 |
| PRP-008 | `prp-agentes-automaticos.md` | agents (investigator/financial/promotions) | agent_reports, competitors, expenses, budgets, ai_usage | COMPLETADO ✓ | 2026-03-19 |
| PRP-009 | `prp-facebook-ads.md` | facebook-ads | facebook_campaigns, campaign_spend, leads | COMPLETADO ✓ | 2026-03-19 |
| PRP-010 | `prp-rebuy-campaign.md` | agents/promotions | rebuys, orders, leads, promotions_catalog | COMPLETADO ✓ | 2026-03-23 |
| PRP-011 | `prp-app-launcher.md` | app-launcher | app_launcher_registry | COMPLETADO ✓ | 2026-05-12 |
| PRP-012 | `prp-titaniumorphism-design-system.md` | shared/design-system · `src/shared/components/ti/` | — (UI) | COMPLETADO ✓ | 2026-05-21 |
| PRP-013 | `prp-content-generator.md` | content-generator · `/content-generator`, `/api/content/*` | posts, content_pieces, ai_usage | COMPLETADO ✓ | 2026-06-13 |
| PRP-014 | `prp-content-guardian.md` | content-guardian · `/api/guardian/*` | guardian_config, guardian_alerts | COMPLETADO ✓ | 2026-06-13 |
| PRP-015 | `prp-feed.md` | feed · `/feed` | posts, weekly_trends | COMPLETADO ✓ | 2026-06-13 |
| PRP-016 | `prp-notifications.md` | notifications · `/api/notifications/*` | push_subscriptions, notifications | COMPLETADO ✓ | 2026-06-13 |
| PRP-017 | `prp-storage-management.md` | storage-management · `/api/storage/cleanup` | storage_config, storage_cleanup_log | COMPLETADO ✓ | 2026-03-19 |
| PRP-018 | `prp-event-tracker.md` | event-tracker · `/api/events/track` | events, content_outcomes | COMPLETADO | 2026-05-13 |
| PRP-019 | `prp-judge-strategy-bridge.md` | avatar-research | judge_rankings, judge_overrides, avatars, avatar_insights, proactive_insights, content_outcomes | COMPLETADO ✓ | 2026-05-16 |
| — | `prp-base.md` | (template / meta) | — | Referencia | — |

**Notas de estado**
- ‡ PRP-003: pipeline Suno + `/api/music/poll` implementado; falta validar el cron en prod.
- § PRP-006: pipeline ffmpeg + `upload-to-youtube.ts` implementado; falta validar el upload a YouTube en prod.

## Features sin PRP dedicado (infraestructura base)

| Feature | Por qué no tiene PRP |
|---------|----------------------|
| `auth` | Inyectada por el skill `/add-login` (Supabase Auth + profiles + RLS). |
| `whatsapp-bot` | Transversal: su lógica se reparte entre PRP-001/002/003 (orders, pagos, música) + qualifier. |

## Numeración

Numeración única y verificada el 2026-06-13. Se resolvieron las colisiones previas:
- `prp-orders-conversational-flow` conserva **PRP-001** (foundational); la campaña de leads pasó
  de PRP-001 a **PRP-005** (archivo renombrado a `prp-005-whatsapp-leads-campaign.md`).
- `prp-rebuy-campaign` conserva **PRP-010**; storage-management pasó de PRP-010/010b a **PRP-017**.
- Los antes sin número: event-tracker → **PRP-018**, judge-strategy-bridge → **PRP-019**.

Próximo número libre para un PRP nuevo: **PRP-020**.


DROP VIEW IF EXISTS v_strategy_scores;

CREATE VIEW v_strategy_scores AS
WITH

lead_intent AS (
  SELECT
    l.id   AS lead_id,
    l.source,
    MAX(CASE
      WHEN o.status IN ('entregado', 'pago_confirmado')               THEN 100
      WHEN o.status IN ('pago_pendiente', 'video_pago_enviado',
                        'video_listo')                                 THEN  40
      WHEN o.status IN ('letra_generada', 'generando_letra',
                        'recopilando_fotos')                           THEN  20
      WHEN o.status IN ('recopilando_historia', 'recopilando_estilo') THEN  12
      ELSE 5
    END) AS intent_pts
  FROM leads l
  LEFT JOIN orders o ON o.lead_id = l.id
  WHERE l.qualification_status = 'calificado'
  GROUP BY l.id, l.source
),

campaign_intent AS (
  SELECT
    fc.id                                            AS campaign_id,
    COUNT(li.lead_id)                                AS total_leads,
    COUNT(CASE WHEN li.intent_pts = 100 THEN 1 END)  AS conversions,
    COALESCE(AVG(li.intent_pts), 0)                  AS avg_intent
  FROM facebook_campaigns fc
  LEFT JOIN lead_intent li ON li.source = 'fb_' || fc.source_key
  GROUP BY fc.id
),

event_signals AS (
  SELECT
    e.strategy_id,
    COUNT(*)                                            AS total_events,
    COUNT(CASE WHEN e.event_type = 'dm'    THEN 1 END) AS dm_count,
    COUNT(CASE WHEN e.event_type = 'save'  THEN 1 END) AS save_count,
    COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) AS click_count,
    COUNT(CASE WHEN e.event_type = 'share' THEN 1 END) AS share_count,
    COUNT(CASE WHEN e.event_type = 'view'  THEN 1 END) AS view_count
  FROM events e
  WHERE e.strategy_id IS NOT NULL
  GROUP BY e.strategy_id
)

SELECT
  co.id                                          AS content_outcome_id,
  co.post_url,
  co.platform,
  co.variant_type,
  co.framework_used,
  co.hook_text,
  co.published_at,
  co.scrape_status,
  co.likes_count,
  co.comments_count,
  co.shares_count,
  co.views_count,
  COALESCE(co.engagement_score, 0)               AS engagement_score,
  co.campaign_id,
  fc.name                                        AS campaign_name,
  fc.source_key,
  COALESCE(ci.total_leads, 0)                    AS leads_attributed,
  COALESCE(ci.conversions, 0)                    AS conversions,
  ROUND(COALESCE(ci.avg_intent, 0)::numeric, 2)  AS avg_intent_score,
  CASE WHEN COALESCE(ci.total_leads, 0) = 0 THEN 0
       ELSE ROUND(ci.conversions::numeric / ci.total_leads * 100, 1)
  END                                            AS conversion_rate_pct,
  COALESCE(es.total_events, 0)                   AS total_events,
  COALESCE(es.dm_count,    0)                    AS dm_count,
  COALESCE(es.save_count,  0)                    AS save_count,
  COALESCE(es.click_count, 0)                    AS click_count,
  COALESCE(es.share_count, 0)                    AS share_count,
  COALESCE(es.view_count,  0)                    AS view_count,
  ROUND(
    0.20 * COALESCE(co.engagement_score, 0) +
    0.80 * COALESCE(ci.avg_intent, 0),
    2
  )                                              AS composite_score,
  pi.title                                       AS insight_title,
  pi.insight_type,
  a.name                                         AS avatar_name,
  co.proactive_insight_id,
  co.avatar_id

FROM content_outcomes co
LEFT JOIN facebook_campaigns   fc ON fc.id  = co.campaign_id
LEFT JOIN campaign_intent      ci ON ci.campaign_id = co.campaign_id
LEFT JOIN event_signals        es ON es.strategy_id = co.id
LEFT JOIN proactive_insights   pi ON pi.id  = co.proactive_insight_id
LEFT JOIN avatars               a  ON a.id   = co.avatar_id;

GRANT SELECT ON v_strategy_scores TO authenticated;


-- Composite score VIEW: 80% purchase intent + 20% engagement.
-- Intent is derived from how far each lead (attributed via leads.source)
-- progressed through the order funnel — no separate UTM table needed.
CREATE OR REPLACE VIEW v_strategy_scores AS
WITH

-- Max intent points per lead, based on the furthest order status reached
lead_intent AS (
  SELECT
    l.id          AS lead_id,
    l.source,
    MAX(CASE
      WHEN o.status IN ('entregado', 'pago_confirmado')               THEN 100
      WHEN o.status IN ('pago_pendiente', 'video_pago_enviado',
                        'video_listo')                                 THEN  40
      WHEN o.status IN ('letra_generada', 'generando_letra',
                        'recopilando_fotos')                           THEN  20
      WHEN o.status IN ('recopilando_historia', 'recopilando_estilo') THEN  12
      ELSE 5  -- qualified but no order yet
    END) AS intent_pts
  FROM leads l
  LEFT JOIN orders o ON o.lead_id = l.id
  WHERE l.qualification_status = 'calificado'
  GROUP BY l.id, l.source
),

-- Aggregate intent signals per campaign source key
campaign_intent AS (
  SELECT
    fc.id                                                         AS campaign_id,
    COUNT(li.lead_id)                                             AS total_leads,
    COUNT(CASE WHEN li.intent_pts = 100 THEN 1 END)              AS conversions,
    COALESCE(AVG(li.intent_pts), 0)                               AS avg_intent
  FROM facebook_campaigns fc
  LEFT JOIN lead_intent li
    ON li.source = 'fb_' || fc.source_key
  GROUP BY fc.id
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

  -- Engagement (from Monitor scrape)
  co.likes_count,
  co.comments_count,
  co.shares_count,
  co.views_count,
  COALESCE(co.engagement_score, 0)               AS engagement_score,

  -- Campaign attribution
  co.campaign_id,
  fc.name                                        AS campaign_name,
  fc.source_key,

  -- Conversion funnel (from leads.source → orders.status)
  COALESCE(ci.total_leads, 0)                    AS leads_attributed,
  COALESCE(ci.conversions, 0)                    AS conversions,
  ROUND(COALESCE(ci.avg_intent, 0)::numeric, 2)  AS avg_intent_score,

  -- Conversion rate: confirmed payments / attributed leads
  CASE WHEN COALESCE(ci.total_leads, 0) = 0 THEN 0
       ELSE ROUND(ci.conversions::numeric / ci.total_leads * 100, 1)
  END                                            AS conversion_rate_pct,

  -- Composite: 20% engagement + 80% intent (prioritizes purchase intent)
  ROUND(
    0.20 * COALESCE(co.engagement_score, 0) +
    0.80 * COALESCE(ci.avg_intent, 0),
    2
  )                                              AS composite_score,

  -- Context
  pi.title                                       AS insight_title,
  pi.insight_type,
  a.name                                         AS avatar_name,
  co.proactive_insight_id,
  co.avatar_id

FROM content_outcomes co
LEFT JOIN facebook_campaigns   fc ON fc.id  = co.campaign_id
LEFT JOIN campaign_intent      ci ON ci.campaign_id = co.campaign_id
LEFT JOIN proactive_insights   pi ON pi.id  = co.proactive_insight_id
LEFT JOIN avatars               a  ON a.id   = co.avatar_id;

-- Grant read access to authenticated users
GRANT SELECT ON v_strategy_scores TO authenticated;

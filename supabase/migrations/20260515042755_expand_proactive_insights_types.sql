
ALTER TABLE proactive_insights DROP CONSTRAINT IF EXISTS proactive_insights_insight_type_check;
ALTER TABLE proactive_insights ADD CONSTRAINT proactive_insights_insight_type_check
  CHECK (insight_type = ANY (ARRAY[
    'divergence'::text,
    'contradiction'::text,
    'blind_spot'::text,
    'opportunity'::text,
    'hook_opportunity'::text,
    'barrier_response'::text,
    'timing_insight'::text,
    'channel_recommendation'::text,
    'price_anchoring'::text
  ]));

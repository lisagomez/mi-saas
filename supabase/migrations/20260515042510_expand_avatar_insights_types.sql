
ALTER TABLE avatar_insights DROP CONSTRAINT IF EXISTS avatar_insights_insight_type_check;
ALTER TABLE avatar_insights ADD CONSTRAINT avatar_insights_insight_type_check
  CHECK (insight_type = ANY (ARRAY[
    'divergence'::text,
    'contradiction'::text,
    'blind_spot'::text,
    'opportunity'::text,
    'spending_behavior'::text,
    'emotional_trigger'::text,
    'pain_point'::text,
    'channel_preference'::text,
    'musical_preference'::text
  ]));

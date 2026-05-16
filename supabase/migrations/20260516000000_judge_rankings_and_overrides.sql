-- Tabla: judge_overrides
CREATE TABLE judge_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id         UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  suggested_id      UUID NOT NULL REFERENCES proactive_insights(id) ON DELETE CASCADE,
  chosen_id         UUID NOT NULL REFERENCES proactive_insights(id) ON DELETE CASCADE,
  reason_text       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE judge_overrides ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_judge_overrides_avatar_id ON judge_overrides(avatar_id);

-- Tabla: judge_rankings
CREATE TABLE judge_rankings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id      UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  insight_id     UUID NOT NULL REFERENCES proactive_insights(id) ON DELETE CASCADE,
  rank           SMALLINT NOT NULL,
  score_judge    NUMERIC(5,2) NOT NULL,
  reasoning      TEXT NOT NULL,
  computed_at    TIMESTAMPTZ DEFAULT NOW(),
  override_count INTEGER DEFAULT 0,
  UNIQUE (avatar_id, insight_id)
);

ALTER TABLE judge_rankings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_judge_rankings_avatar_id ON judge_rankings(avatar_id);

CREATE TABLE IF NOT EXISTS weekly_trends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id       UUID REFERENCES avatars(id) ON DELETE SET NULL,
  avatar_name     TEXT,
  theme_json      JSONB NOT NULL,
  reasoning       TEXT NOT NULL,
  -- Log columns (all execution context in one table)
  status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'running')),
  error_message   TEXT,
  search_results_raw JSONB,
  execution_ms    INTEGER,
  -- Source: 'cron' (automatic) or 'skill' (manual via trend-radar)
  source          TEXT NOT NULL DEFAULT 'cron' CHECK (source IN ('cron', 'skill')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE weekly_trends ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all trends
CREATE POLICY "auth_read_weekly_trends"
  ON weekly_trends FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (Edge Function uses service key)
CREATE POLICY "service_write_weekly_trends"
  ON weekly_trends FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_update_weekly_trends"
  ON weekly_trends FOR UPDATE
  TO service_role
  USING (true);

-- Index for fast reads by avatar and date
CREATE INDEX idx_weekly_trends_avatar ON weekly_trends(avatar_id, created_at DESC);
CREATE INDEX idx_weekly_trends_created ON weekly_trends(created_at DESC);
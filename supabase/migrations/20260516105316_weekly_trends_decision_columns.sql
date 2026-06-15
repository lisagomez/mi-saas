ALTER TABLE weekly_trends
  ADD COLUMN relevance_score integer,
  ADD COLUMN decision_type text CHECK (decision_type IN ('first_run', 'auto_replace', 'suggest_adjustment')),
  ADD COLUMN decision_log jsonb;

CREATE INDEX idx_weekly_trends_decision_type ON weekly_trends(decision_type);
CREATE INDEX idx_weekly_trends_success ON weekly_trends(created_at DESC) WHERE status = 'success';
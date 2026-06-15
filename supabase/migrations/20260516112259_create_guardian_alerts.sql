
CREATE TABLE IF NOT EXISTS guardian_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  trigger_type text NOT NULL CHECK (trigger_type IN ('low_engagement', 'prohibited_word')),

  -- Contexto del disparo
  trigger_detail     jsonb NOT NULL DEFAULT '{}',
  posts_affected     integer DEFAULT 0,
  avg_engagement_pct numeric,

  -- Estado
  alert_sent    boolean DEFAULT false NOT NULL,
  acknowledged  boolean DEFAULT false NOT NULL,
  acknowledged_at timestamptz,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guardian_alerts_created
  ON guardian_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guardian_alerts_unacked
  ON guardian_alerts(acknowledged)
  WHERE acknowledged = false;

ALTER TABLE guardian_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guardian_alerts_authenticated"
  ON guardian_alerts FOR ALL
  USING (auth.role() = 'authenticated');

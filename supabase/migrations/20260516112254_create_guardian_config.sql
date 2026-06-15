
CREATE TABLE IF NOT EXISTS guardian_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Umbral de engagement
  engagement_threshold_pct  numeric  DEFAULT 1.0 NOT NULL,
  min_posts_for_trigger      integer  DEFAULT 3   NOT NULL,
  monitoring_window_days     integer  DEFAULT 7   NOT NULL,

  -- Palabras prohibidas
  prohibited_words text[] DEFAULT '{}' NOT NULL,

  -- Canal de alerta
  alert_phone text NOT NULL DEFAULT '',

  -- Estado actual de publicación
  publishing_paused          boolean  DEFAULT false NOT NULL,
  publishing_paused_reason   text,
  publishing_paused_at       timestamptz,

  -- Control
  is_active  boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Solo debe existir una fila
CREATE UNIQUE INDEX IF NOT EXISTS guardian_config_singleton
  ON guardian_config ((true));

-- Fila inicial con valores por defecto
INSERT INTO guardian_config (engagement_threshold_pct, min_posts_for_trigger, monitoring_window_days, prohibited_words, alert_phone)
VALUES (1.0, 3, 7, '{}', '')
ON CONFLICT DO NOTHING;

ALTER TABLE guardian_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guardian_config_authenticated_read"
  ON guardian_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "guardian_config_authenticated_write"
  ON guardian_config FOR UPDATE
  USING (auth.role() = 'authenticated');

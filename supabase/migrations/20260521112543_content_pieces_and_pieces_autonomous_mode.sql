
-- Tabla de piezas de contenido generadas por el Content Generator
CREATE TABLE IF NOT EXISTS content_pieces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  format          text NOT NULL,
  tipo            text NOT NULL,
  red_social      text[] NOT NULL DEFAULT '{}',
  body            text NOT NULL,
  token_cost_usd  numeric(10,6),
  audit_score     integer,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read content_pieces"
  ON content_pieces FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated write content_pieces"
  ON content_pieces FOR ALL
  USING (auth.role() = 'authenticated');

-- Toggle independiente del Content Generator
ALTER TABLE guardian_config
  ADD COLUMN IF NOT EXISTS pieces_autonomous_mode boolean DEFAULT false;

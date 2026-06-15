CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_theme_id uuid REFERENCES weekly_trends(id) ON DELETE SET NULL,
  avatar_id uuid REFERENCES avatars(id) ON DELETE CASCADE,
  format text NOT NULL DEFAULT 'Reel',
  status text NOT NULL DEFAULT 'Ideado' CHECK (status IN ('Ideado', 'Generado', 'Aprobado', 'Publicado')),
  prompt_template text,
  body text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_all_authenticated" ON posts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_avatar_id ON posts(avatar_id);
CREATE INDEX idx_posts_weekly_theme_id ON posts(weekly_theme_id);
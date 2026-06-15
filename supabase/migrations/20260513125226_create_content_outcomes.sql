
CREATE TABLE content_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Referencias a tablas futuras (FK se agregan cuando se creen avatars/proactive_insights)
  proactive_insight_id uuid,   -- → proactive_insights(id)
  avatar_id            uuid,   -- → avatars(id)

  -- Identificación del contenido publicado
  variant_type text NOT NULL CHECK (variant_type IN (
    'organic_reel', 'organic_carousel', 'organic_facebook_post',
    'inorganic_facebook_ad', 'inorganic_whatsapp', 'inorganic_retargeting'
  )),
  platform text NOT NULL CHECK (platform IN (
    'facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube'
  )),
  post_url      text,
  published_at  timestamptz,

  -- Métricas crudas
  likes_count    integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count   integer DEFAULT 0,
  views_count    integer DEFAULT 0,
  clicks_count   integer DEFAULT 0,
  reach_count    integer DEFAULT 0,

  -- Score calculado (se actualiza después de cada scrape)
  engagement_score numeric DEFAULT 0,

  -- Contexto del copy usado
  hook_text      text,
  framework_used text CHECK (framework_used IN ('PAS', 'AIDA')),
  copy_summary   text,

  -- Tracking de scrape
  last_scraped_at timestamptz,
  scrape_status   text DEFAULT 'pending' CHECK (
    scrape_status IN ('pending', 'success', 'failed', 'manual', 'blocked')
  ),
  scrape_notes    text,
  raw_scrape_data jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Índices para las queries más comunes del Monitor skill
CREATE INDEX idx_content_outcomes_insight
  ON content_outcomes(proactive_insight_id);

CREATE INDEX idx_content_outcomes_avatar
  ON content_outcomes(avatar_id);

CREATE INDEX idx_content_outcomes_platform
  ON content_outcomes(platform, variant_type);

CREATE INDEX idx_content_outcomes_scrape_pending
  ON content_outcomes(scrape_status, last_scraped_at)
  WHERE scrape_status IN ('pending', 'failed');

CREATE INDEX idx_content_outcomes_score
  ON content_outcomes(engagement_score DESC)
  WHERE engagement_score > 0;

COMMENT ON TABLE content_outcomes IS
  'Métricas reales de posts publicados. Alimenta al Judge para seleccionar la mejor estrategia de contenido.';
COMMENT ON COLUMN content_outcomes.proactive_insight_id IS
  'FK pendiente → proactive_insights(id). Se activa cuando se cree esa tabla.';
COMMENT ON COLUMN content_outcomes.avatar_id IS
  'FK pendiente → avatars(id). Se activa cuando se cree esa tabla.';
COMMENT ON COLUMN content_outcomes.engagement_score IS
  'Orgánico: (likes×1 + comments×3 + shares×5) / views × 100. Inorgánico: clicks/reach × 100.';

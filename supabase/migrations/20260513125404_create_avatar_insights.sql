
-- Insights individuales por avatar (append-only — nunca se editan, se encadenan)
CREATE TABLE avatar_insights (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id        uuid NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,

  insight_type     text NOT NULL CHECK (insight_type IN (
    'divergence',    -- Dato que se aleja del centroide de la biblioteca
    'contradiction', -- Contradice un insight existente de mismo tipo
    'blind_spot',    -- Segmento no cubierto por avatares actuales
    'opportunity'    -- Alta conversión histórica detectada
  )),

  content          text NOT NULL,   -- El hallazgo en texto plano
  evidence_url     text,            -- URL fuente que lo respalda

  -- Vector del insight para queries de divergencia/contradicción
  embedding        vector(1536),

  -- Encadenamiento append-only: nueva versión apunta a la anterior
  -- Queries de hoja: WHERE id NOT IN (SELECT parent_insight_id FROM avatar_insights WHERE parent_insight_id IS NOT NULL)
  parent_insight_id uuid REFERENCES avatar_insights(id) ON DELETE SET NULL,

  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_avatar_insights_avatar
  ON avatar_insights(avatar_id);

CREATE INDEX idx_avatar_insights_type
  ON avatar_insights(insight_type);

-- Índice HNSW en los insights para detectar contradicciones entre avatares
CREATE INDEX idx_avatar_insights_embedding_hnsw
  ON avatar_insights
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE avatar_insights IS
  'Insights inmutables por avatar. Nuevas versiones se insertan con parent_insight_id — nunca se edita una fila existente.';
COMMENT ON COLUMN avatar_insights.parent_insight_id IS
  'FK al insight anterior. Queries de hoja filtran WHERE id NOT IN (SELECT parent_insight_id ...).';

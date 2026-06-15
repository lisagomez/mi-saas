
CREATE TABLE avatars (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,           -- ej: "Mexicanos de Jalisco en Los Ángeles 35-50"
  origin       text NOT NULL,           -- País de origen: "México", "Honduras", etc.
  residence    text NOT NULL,           -- Estado/ciudad en EE.UU.: "California", "Texas"
  age_range    text,                    -- ej: "35-50"
  musical_style text,                  -- ej: "banda/norteño"

  -- Perfil sintetizado completo (output de avatar-research Fase 3)
  profile_json jsonb NOT NULL DEFAULT '{}',
  -- Estructura esperada:
  -- { avg_spend_usd_min, avg_spend_usd_max, top_motivators[], top_barriers[],
  --   preferred_channels[], best_contact_time, recommended_hook, confidence,
  --   conversion_pct, total_leads }

  -- Vector para búsqueda semántica (1536 dims, openai/text-embedding-3-small)
  -- NULL si no se generó embedding (backfill posterior)
  embedding    vector(1536),

  -- Referencia al reporte completo de investigación
  agent_report_id uuid REFERENCES agent_reports(id) ON DELETE SET NULL,

  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Índice HNSW para búsqueda semántica por coseno
-- Necesario para las queries de divergencia del avatar-research skill
CREATE INDEX idx_avatars_embedding_hnsw
  ON avatars
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_avatars_origin    ON avatars(origin);
CREATE INDEX idx_avatars_residence ON avatars(residence);

COMMENT ON TABLE avatars IS
  'Biblioteca de perfiles de cliente investigados. Cada avatar tiene embedding para queries de divergencia.';
COMMENT ON COLUMN avatars.embedding IS
  'vector(1536) via openai/text-embedding-3-small. Input: name + origin + residence + musical_style + motivators + barriers + hook.';

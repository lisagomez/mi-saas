
-- Insights proactivos generados automáticamente al agregar un avatar nuevo
CREATE TABLE proactive_insights (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id    uuid NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,

  insight_type text NOT NULL CHECK (insight_type IN (
    'divergence',
    'contradiction',
    'blind_spot',
    'opportunity'
  )),

  title        text NOT NULL,   -- Título corto para mostrar en dashboard
  body         text NOT NULL,   -- Descripción completa del insight accionable

  confidence   text NOT NULL DEFAULT 'medium' CHECK (
    confidence IN ('high', 'medium', 'low')
  ),

  -- Lifecycle del insight
  status       text NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',    -- Generado, esperando acción
      'actioned',   -- Copy generado con content-prompt-gen
      'validated',  -- Monitor confirmó engagement > umbral
      'revisión'    -- Monitor detectó bajo performance
    )
  ),

  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_proactive_insights_avatar
  ON proactive_insights(avatar_id);

CREATE INDEX idx_proactive_insights_status
  ON proactive_insights(status)
  WHERE status = 'pending';

CREATE INDEX idx_proactive_insights_type
  ON proactive_insights(insight_type, confidence);

-- Unicidad: no duplicar el mismo tipo de insight para el mismo avatar
-- (la Edge Function usa esto para deduplicar antes de insertar)
CREATE UNIQUE INDEX idx_proactive_insights_no_duplicate
  ON proactive_insights(avatar_id, insight_type)
  WHERE status = 'pending';

COMMENT ON TABLE proactive_insights IS
  'Insights generados automáticamente al insertar un avatar. Alimentan al content-prompt-gen skill.';
COMMENT ON COLUMN proactive_insights.status IS
  'pending → actioned (content-prompt-gen) → validated/revisión (monitor).';

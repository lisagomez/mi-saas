
-- Matriz 4D de clasificación por insight
ALTER TABLE proactive_insights
  ADD COLUMN IF NOT EXISTS classification JSONB,
  ADD COLUMN IF NOT EXISTS prompt_template TEXT;

COMMENT ON COLUMN proactive_insights.classification IS
  'Matriz 4D: { canal, tipo, formato, estrategia_venta }';
COMMENT ON COLUMN proactive_insights.prompt_template IS
  'Plantilla de prompt lista para consumir por la siguiente aplicación';

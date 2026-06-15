
-- Tabla de eventos de intención de compra.
-- Captura señales de comportamiento (click, dm, save) vinculadas a una estrategia de contenido.
CREATE TABLE IF NOT EXISTS events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Vínculo a la variante de contenido que generó el evento
  strategy_id   uuid REFERENCES content_outcomes(id) ON DELETE SET NULL,

  -- Clasificación del evento
  event_type    text NOT NULL CHECK (event_type IN ('click', 'dm', 'save', 'view', 'share')),
  platform      text CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube')),

  -- Atribución UTM (equivalente web; para WhatsApp usar utm_content = source_key)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,

  -- Lead identificado (si se puede atribuir)
  lead_id       uuid REFERENCES leads(id) ON DELETE SET NULL,

  -- Metadata flexible: referrer, post_id, hora local, user_agent, etc.
  metadata      jsonb DEFAULT '{}' NOT NULL,

  created_at    timestamptz DEFAULT now() NOT NULL
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_events_strategy
  ON events(strategy_id, created_at DESC)
  WHERE strategy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_type_created
  ON events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_lead
  ON events(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_utm_campaign
  ON events(utm_campaign)
  WHERE utm_campaign IS NOT NULL;

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Lectura: usuarios autenticados (dashboard)
CREATE POLICY "authenticated_read_events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo service_role (API route usa admin client)
-- No se necesita policy de INSERT para authenticated ya que el endpoint usa service_role

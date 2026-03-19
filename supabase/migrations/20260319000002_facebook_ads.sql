-- Migration: Facebook Ads — campañas, gasto y atribución de leads
-- Fecha: 2026-03-19

-- Tabla principal de campañas de Facebook
CREATE TABLE facebook_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  campaign_id_meta TEXT NULL,          -- ID de Meta (opcional, para futura API)
  source_key      TEXT NOT NULL UNIQUE, -- Clave para matching con leads.source (ej: 'navidad2026')
  start_date      DATE NOT NULL,
  end_date        DATE NULL,
  budget_usd      NUMERIC(12,2) NULL,  -- Presupuesto estimado en USD
  notes           TEXT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de gasto por campaña (múltiples entradas por campaña)
CREATE TABLE campaign_spend (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES facebook_campaigns(id) ON DELETE CASCADE,
  spend_date  DATE NOT NULL,
  amount_usd  NUMERIC(12,2) NOT NULL,
  notes       TEXT NULL,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_campaign_spend_campaign_id ON campaign_spend(campaign_id);
CREATE INDEX idx_campaign_spend_date ON campaign_spend(spend_date);

-- RLS
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_spend ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden leer y escribir campañas y gastos
CREATE POLICY "service_role full access facebook_campaigns"
  ON facebook_campaigns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Administradores: full access facebook_campaigns"
  ON facebook_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

CREATE POLICY "service_role full access campaign_spend"
  ON campaign_spend FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Administradores: full access campaign_spend"
  ON campaign_spend FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

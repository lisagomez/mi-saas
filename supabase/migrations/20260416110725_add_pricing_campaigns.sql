
CREATE TABLE pricing_campaigns (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_number integer NOT NULL,
  campaign_name   text NOT NULL,
  price_label     text NOT NULL,
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz,
  assignment      text NOT NULL DEFAULT 'all'
                  CHECK (assignment IN ('all', 'new_leads', 'specific')),
  lead_ids        uuid[] NOT NULL DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_label text;

ALTER TABLE pricing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_pagos y administrador pueden gestionar campanas de precio"
  ON pricing_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('administrador', 'admin_pagos')
    )
  );


CREATE TABLE app_launcher_registry (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key            text        UNIQUE NOT NULL,
  label          text        NOT NULL,
  icon           text        NOT NULL,
  href           text        NOT NULL,
  external       boolean     NOT NULL DEFAULT false,
  category       text        NOT NULL,
  category_order integer     NOT NULL DEFAULT 0,
  sort_order     integer     NOT NULL DEFAULT 0,
  enabled        boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_launcher_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_app_launcher"
  ON app_launcher_registry FOR SELECT
  TO authenticated
  USING (enabled = true);

-- Seed: Dashboard group (category_order=0)
INSERT INTO app_launcher_registry (key, label, icon, href, external, category, category_order, sort_order) VALUES
  ('letras',       'Letras',       '🎵', '/dashboard?tab=letras',       false, 'Dashboard', 0, 0),
  ('competencia',  'Competencia',  '🔍', '/dashboard?tab=competencia',  false, 'Dashboard', 0, 1),
  ('financiero',   'Financiero',   '📊', '/dashboard?tab=financiero',   false, 'Dashboard', 0, 2),
  ('pagos',        'Pagos',        '💳', '/dashboard?tab=pagos',        false, 'Dashboard', 0, 3),
  ('videos',       'Videos',       '🎬', '/dashboard?tab=videos',       false, 'Dashboard', 0, 4),
  ('leads',        'Leads',        '👥', '/dashboard?tab=leads',        false, 'Dashboard', 0, 5),
  ('precios',      'Precios',      '💰', '/dashboard?tab=precios',      false, 'Dashboard', 0, 6),
  ('facebook-ads', 'Facebook Ads', '📣', '/dashboard?tab=facebook-ads', false, 'Dashboard', 0, 7),
  ('storage',      'Storage',      '💾', '/dashboard?tab=storage',      false, 'Dashboard', 0, 8),
  ('agentes',      'Agentes',      '🤖', '/dashboard?tab=agentes',      false, 'Dashboard', 0, 9),
-- Seed: Catálogos group (category_order=1)
  ('catalogos',    'Catálogos',    '📋', '/dashboard/catalogs',         false, 'Catálogos', 1, 0),
-- Seed: Herramientas group (category_order=2)
  ('supabase',     'Supabase',     '🗄️', 'https://supabase.com/dashboard', true, 'Herramientas', 2, 0),
  ('vercel',       'Vercel',       '🚀', 'https://vercel.com/dashboard',   true, 'Herramientas', 2, 1),
  ('whatsapp',     'WhatsApp',     '📱', 'https://business.facebook.com',  true, 'Herramientas', 2, 2);

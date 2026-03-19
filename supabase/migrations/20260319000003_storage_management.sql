-- Migration: Storage Management — config de buckets y log de limpieza
-- Fecha: 2026-03-19

-- Tabla de configuración de límites por bucket
CREATE TABLE storage_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name         TEXT NOT NULL UNIQUE,
  limit_mb            INTEGER NOT NULL DEFAULT 500,
  cleanup_after_days  INTEGER NOT NULL DEFAULT 30,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de log de limpiezas automáticas/manuales
CREATE TABLE storage_cleanup_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_files INTEGER NOT NULL DEFAULT 0,
  freed_mb      NUMERIC(10,2) NULL,
  triggered_by  TEXT NOT NULL DEFAULT 'cron',
  details       JSONB NULL
);

-- RLS
ALTER TABLE storage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Solo service_role accede directamente (el agente usa createAdminClient)
CREATE POLICY "service_role full access storage_config"
  ON storage_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Administradores: read storage_config"
  ON storage_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

CREATE POLICY "Administradores: update storage_config"
  ON storage_config FOR UPDATE
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

CREATE POLICY "service_role full access storage_cleanup_log"
  ON storage_cleanup_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Administradores: read storage_cleanup_log"
  ON storage_cleanup_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- Seed: configuración inicial de los 4 buckets
INSERT INTO storage_config (bucket_name, limit_mb, cleanup_after_days) VALUES
  ('songs',          500,  30),
  ('order-photos',   300,  30),
  ('videos',         2000, 60),
  ('payment-proofs', 200,  90);

-- Políticas de Storage (buckets existentes)
-- songs: público para lectura, service_role para escritura
INSERT INTO storage.buckets (id, name, public)
VALUES ('songs', 'songs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-photos', 'order-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS de storage.objects: lectura pública en buckets públicos
CREATE POLICY "Public read: songs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'songs');

CREATE POLICY "Public read: order-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-photos');

-- Escritura en todos los buckets: solo service_role
CREATE POLICY "service_role full access storage"
  ON storage.objects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins pueden leer archivos privados (videos, payment-proofs)
CREATE POLICY "Administradores: read private storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('videos', 'payment-proofs')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

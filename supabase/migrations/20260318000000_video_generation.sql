-- Video generation: tabla videos, order_photos, nuevos estados en orders, buckets Storage

-- 1. Ampliar el CHECK de status en orders
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'recopilando_historia',
    'recopilando_estilo',
    'generando_letra',
    'letra_generada',
    'pago_pendiente',
    'pago_confirmado',
    'recopilando_fotos',       -- cliente aceptó video add-on, enviando fotos
    'generando_video',         -- pipeline Replicate en curso
    'video_listo',             -- video en YouTube, esperando pago del cliente
    'video_pago_enviado',      -- cliente envió comprobante del video
    'video_pago_confirmado',   -- admin confirmó pago del video
    'video_rechazado',         -- cliente rechazó el add-on
    'entregado',
    'requiere_procesamiento_manual'
  ));

-- 2. Tabla de videos generados
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN (
      'pendiente',
      'recopilando_fotos',
      'generando',
      'listo',
      'fallido'
    )),
  price DECIMAL(10, 2),                -- Precio ofertado al cliente (USD)
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (payment_status IN ('pendiente', 'comprobante_enviado', 'confirmado')),
  payment_proof_url TEXT,              -- Storage path del comprobante de pago del video
  replicate_id TEXT,                   -- Job ID en Replicate para polling
  video_storage_path TEXT,             -- Path en Supabase Storage (backup)
  youtube_url TEXT,                    -- URL pública (unlisted) — solo se envía al cliente tras pago
  photo_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_videos_order_id ON public.videos(order_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_payment_status ON public.videos(payment_status);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access videos"
  ON public.videos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read videos"
  ON public.videos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo', 'admin_pagos')
    )
  );

CREATE POLICY "Admin pagos update videos"
  ON public.videos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'admin_pagos')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'admin_pagos')
    )
  );

-- 3. Fotos del cliente por orden
CREATE TABLE IF NOT EXISTS public.order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON public.order_photos(order_id);

ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access order_photos"
  ON public.order_photos FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read order_photos"
  ON public.order_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo')
    )
  );

-- 4. Storage bucket para fotos del cliente (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos',
  'order-photos',
  false,
  10485760, -- 10MB por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role upload order photos" ON storage.objects;
CREATE POLICY "Service role upload order photos"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'order-photos');

DROP POLICY IF EXISTS "Service role read order photos" ON storage.objects;
CREATE POLICY "Service role read order photos"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'order-photos');

DROP POLICY IF EXISTS "Authenticated read order photos" ON storage.objects;
CREATE POLICY "Authenticated read order photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo')
    )
  );

-- 5. Storage bucket para videos generados (privado — URL pública via YouTube)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  false,
  524288000, -- 500MB max
  ARRAY['video/mp4', 'video/webm']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role upload videos" ON storage.objects;
CREATE POLICY "Service role upload videos"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'videos');

DROP POLICY IF EXISTS "Service role read videos" ON storage.objects;
CREATE POLICY "Service role read videos"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'videos');

-- 6. Storage: comprobantes de pago del video (reutiliza bucket payment-proofs existente)
-- Los comprobantes de video se guardan bajo payment-proofs/video/{orderId}.jpg
-- El bucket y sus políticas ya existen en la migración 20260317080000_payment_flow.sql

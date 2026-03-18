-- Flujo de pagos: columnas adicionales en orders + RLS + Storage bucket

-- Agregar columnas de pago a orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS song_delivered_at TIMESTAMPTZ;

-- RLS: admin_pagos y administrador pueden actualizar orders (confirmacion de pago)
DROP POLICY IF EXISTS "Admin pagos update payment confirmation" ON public.orders;
CREATE POLICY "Admin pagos update payment confirmation"
  ON public.orders FOR UPDATE
  TO authenticated
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

-- RLS songs: admin_pagos tambien puede leer letras (para el panel de pagos)
DROP POLICY IF EXISTS "Authenticated read songs" ON public.songs;
CREATE POLICY "Authenticated read songs"
  ON public.songs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'creativo', 'admin_pagos')
    )
  );

-- Storage bucket para comprobantes de pago
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage: solo admin_pagos y administrador pueden leer comprobantes
DROP POLICY IF EXISTS "Admin pagos read payment proofs" ON storage.objects;
CREATE POLICY "Admin pagos read payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('administrador', 'admin_pagos')
    )
  );

-- Service role puede subir (webhook usa service role)
DROP POLICY IF EXISTS "Service role upload payment proofs" ON storage.objects;
CREATE POLICY "Service role upload payment proofs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'payment-proofs');

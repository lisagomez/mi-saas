-- Agregar rol agente_investigador al enum ANTES de usarlo en policies
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agente_investigador';

-- Tabla de competidores (Agente Investigador)
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT,
  proposal TEXT,
  advantages TEXT,
  disadvantages TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read competitors" ON public.competitors;
CREATE POLICY "Authenticated read competitors"
  ON public.competitors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role::text IN ('administrador', 'agente_investigador')
    )
  );

DROP POLICY IF EXISTS "Authenticated write competitors" ON public.competitors;
CREATE POLICY "Authenticated write competitors"
  ON public.competitors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role::text IN ('administrador', 'agente_investigador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role::text IN ('administrador', 'agente_investigador')
    )
  );

-- Service role acceso total a competitors
DROP POLICY IF EXISTS "Service role full access competitors" ON public.competitors;
CREATE POLICY "Service role full access competitors"
  ON public.competitors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

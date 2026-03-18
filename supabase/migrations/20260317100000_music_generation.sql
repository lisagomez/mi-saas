-- Detección de origen y residencia del cliente
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS origin VARCHAR(100),
  ADD COLUMN IF NOT EXISTS residence VARCHAR(100);

-- Audio y prompt musical en songs
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS music_prompt TEXT;

-- Storage bucket para audios de canciones
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'songs',
  'songs',
  true, -- público para que WhatsApp pueda acceder via URL directa
  52428800, -- 50MB max
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Service role puede subir audios (webhook usa service role)
DROP POLICY IF EXISTS "Service role upload songs" ON storage.objects;
CREATE POLICY "Service role upload songs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'songs');

-- Público puede leer (WhatsApp necesita URL accesible)
DROP POLICY IF EXISTS "Public read songs" ON storage.objects;
CREATE POLICY "Public read songs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'songs');

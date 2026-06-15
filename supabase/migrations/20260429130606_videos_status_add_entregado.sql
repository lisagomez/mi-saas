ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_status_check;

ALTER TABLE public.videos
  ADD CONSTRAINT videos_status_check CHECK (status IN (
    'pendiente',
    'recopilando_fotos',
    'generando',
    'listo',
    'entregado',
    'fallido'
  ));
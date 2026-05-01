-- videos.status no incluía 'entregado', dejaba el row en 'listo' para siempre
-- aunque la orden ya estuviera entregada. Esto rompía el dashboard del creativo.

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

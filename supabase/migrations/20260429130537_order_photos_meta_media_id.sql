ALTER TABLE public.order_photos
  ADD COLUMN IF NOT EXISTS meta_media_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_photos_meta_media
  ON public.order_photos (order_id, meta_media_id)
  WHERE meta_media_id IS NOT NULL;
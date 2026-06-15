ALTER TABLE orders DROP CONSTRAINT orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status::text = ANY (ARRAY[
    'recopilando_historia',
    'recopilando_estilo',
    'aclarando_detalles',
    'generando_letra',
    'letra_generada',
    'pago_pendiente',
    'pago_confirmado',
    'recopilando_fotos',
    'generando_video',
    'video_listo',
    'video_pago_enviado',
    'video_pago_confirmado',
    'video_rechazado',
    'entregado',
    'requiere_procesamiento_manual'
  ]::text[])
);

-- Eliminar policy duplicada en songs (queda "Public read: songs")
DROP POLICY IF EXISTS "Public read songs" ON storage.objects;

-- Eliminar listing público de fotos de clientes (ya cubierto por "Authenticated read order photos")
DROP POLICY IF EXISTS "Public read: order-photos" ON storage.objects;

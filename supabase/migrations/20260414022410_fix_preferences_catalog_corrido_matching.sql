
-- Bug A: sort_order 50 (Corrido Tumbado/Sierreño) tiene regions: [] — nunca matchea por región.
-- Bug B: sort_order 30 (Mariachi) tiene 'corrido' como catch-all → cualquier "corrido X"
--         lo matchea primero (find() es secuencial), devolviendo directivas de mariachi.
-- Bug C: sort_order 40 (Norteño) igual tiene 'corrido' catch-all, mismo problema.

-- Fix 1: Mariachi — quitar 'corrido' genérico, dejar solo estilos específicos del mariachi
UPDATE preferences_catalog
SET
  styles     = ARRAY['mariachi', 'ranchera', 'ranchero', 'corrido ranchero', 'corrido tradicional', 'corrido viejo'],
  updated_at = now()
WHERE sort_order = 30;

-- Fix 2: Norteño — reemplazar 'corrido' genérico con keywords específicos de norteño
UPDATE preferences_catalog
SET
  styles     = ARRAY['norteño', 'norteno', 'corrido norteño', 'corrido norteno', 'regional norteño', 'grupero', 'conjunto norteño'],
  updated_at = now()
WHERE sort_order = 40;

-- Fix 3: Corrido Tumbado/Sierreño — agregar regiones + keywords faltantes + 'corrido' catch-all
-- (ahora 'corrido' genérico vive aquí, después de los estilos más específicos en sort_order)
UPDATE preferences_catalog
SET
  styles     = ARRAY[
    'corrido tumbado', 'corridos tumbados', 'tumbado',
    'sierreño', 'sierreno', 'corrido sierreño', 'corrido sierreno',
    'regional mexicano', 'corrido moderno', 'corrido'
  ],
  regions    = ARRAY[
    'sonora', 'sinaloa', 'baja california', 'tijuana', 'culiacan', 'culiacán',
    'hermosillo', 'navojoa', 'los mochis', 'guasave',
    'chihuahua', 'durango', 'jalisco', 'nayarit', 'guerrero',
    'michoacan', 'michoacán', 'zacatecas', 'colima',
    'california', 'los angeles', 'arizona', 'nevada', 'chicago'
  ],
  updated_at = now()
WHERE sort_order = 50;

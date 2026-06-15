
-- Mover Catálogos a order 2 y Herramientas a order 3 para hacer espacio
UPDATE app_launcher_registry SET category_order = 2 WHERE category = 'Catálogos';
UPDATE app_launcher_registry SET category_order = 3 WHERE category = 'Herramientas';

-- Corregir href de Competencia → ruta separada del Agente Investigador
UPDATE app_launcher_registry
SET href = '/investigador', label = 'Investigador', icon = '🔍'
WHERE key = 'competencia';

-- Insertar nueva app Avatares en sección Estrategia
INSERT INTO app_launcher_registry (key, label, icon, href, external, category, category_order, sort_order, enabled)
VALUES ('avatar-research', 'Avatares', '🧑‍🤝‍🧑', '/avatar-research', false, 'Estrategia', 1, 0, true);


-- RLS en las tablas de la biblioteca de avatares y contenido
ALTER TABLE avatars           ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_insights   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_outcomes  ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso solo para usuarios autenticados (rol admin del dashboard)
-- Lectura: cualquier usuario autenticado
CREATE POLICY "authenticated_read_avatars"
  ON avatars FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_avatar_insights"
  ON avatar_insights FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_proactive_insights"
  ON proactive_insights FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_content_outcomes"
  ON content_outcomes FOR SELECT TO authenticated USING (true);

-- Escritura: solo service_role (Edge Functions, agentes internos)
-- El service_role bypasses RLS by default en Supabase, así que solo
-- necesitamos bloquear escritura directa desde el cliente anónimo/autenticado
CREATE POLICY "service_only_insert_avatars"
  ON avatars FOR INSERT TO authenticated
  WITH CHECK (false);  -- solo service_role puede insertar

CREATE POLICY "service_only_insert_avatar_insights"
  ON avatar_insights FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "service_only_insert_proactive_insights"
  ON proactive_insights FOR INSERT TO authenticated
  WITH CHECK (false);

-- content_outcomes: el Monitor skill escribe desde el dashboard, permitir al autenticado
CREATE POLICY "authenticated_write_content_outcomes"
  ON content_outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

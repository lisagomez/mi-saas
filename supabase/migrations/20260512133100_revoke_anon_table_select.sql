
-- Revocar SELECT directo a anon en todas las tablas públicas
-- RLS sigue protegiendo el acceso de usuarios autenticados
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;


-- Deshabilitar acceso GraphQL para usuarios no autenticados
REVOKE USAGE ON SCHEMA graphql_public FROM anon;

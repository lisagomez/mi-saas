
-- Contador de intentos de submit a MusicAPI.
-- El cron deja de reintentar orphans cuando submit_attempts >= 3.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS submit_attempts integer NOT NULL DEFAULT 0;

-- Función que lee el secret del vault y llama a la Edge Function
CREATE OR REPLACE FUNCTION public.trigger_trend_radar_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cron_secret text;
BEGIN
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'trend_radar_cron_secret'
  LIMIT 1;

  PERFORM net.http_post(
    url := 'https://bhzwivdkpunvyizlcqtn.supabase.co/functions/v1/trend-radar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(cron_secret, '')
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Cron: lunes 08:00 AM hora México City (UTC-6) = 14:00 UTC
-- Si es horario de verano (UTC-5) usar: '0 13 * * 1'
SELECT cron.schedule(
  'trend-radar-weekly',
  '0 14 * * 1',
  'SELECT public.trigger_trend_radar_edge_function()'
);
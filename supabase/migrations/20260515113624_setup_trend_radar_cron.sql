-- Helper function: invokes the trend-radar Edge Function via pg_net
-- Reads URL and secret from database settings (configured once via ALTER DATABASE)
CREATE OR REPLACE FUNCTION invoke_trend_radar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  v_url    := current_setting('app.supabase_functions_url', true);
  v_secret := current_setting('app.cron_secret', true);

  IF v_url IS NULL THEN
    RAISE WARNING 'invoke_trend_radar: app.supabase_functions_url not set — skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/trend-radar',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
END;
$$;

-- Schedule: every Monday at 13:00 UTC (08:00 AM CDT / Mexico City)
-- Adjust hour if your timezone offset changes seasonally:
--   CST (winter, UTC-6) → use hour 14
--   CDT (summer, UTC-5) → use hour 13
SELECT cron.schedule(
  'trend-radar-weekly',
  '0 13 * * 1',
  'SELECT invoke_trend_radar()'
);
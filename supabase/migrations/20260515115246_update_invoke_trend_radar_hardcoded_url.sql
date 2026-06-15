-- Update invoke function with hardcoded project URL
-- CRON_SECRET is optional: if not set as Edge Function secret, the function accepts all requests
CREATE OR REPLACE FUNCTION invoke_trend_radar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    CONSTANT TEXT := 'https://bhzwivdkpunvyizlcqtn.supabase.co';
  v_secret TEXT;
BEGIN
  -- Read secret from app settings if configured (optional hardening)
  BEGIN
    v_secret := current_setting('app.cron_secret', true);
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

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
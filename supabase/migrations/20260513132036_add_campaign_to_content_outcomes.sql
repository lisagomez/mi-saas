
-- Link each published post to the Facebook campaign that ran it.
-- This closes the loop: copy variant → campaign → leads.source → orders → conversions.
ALTER TABLE content_outcomes
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES facebook_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_outcomes_campaign
  ON content_outcomes(campaign_id)
  WHERE campaign_id IS NOT NULL;

-- Allow authenticated users to update campaign_id from the dashboard
-- (existing RLS policy on content_outcomes already allows CRUD for authenticated)

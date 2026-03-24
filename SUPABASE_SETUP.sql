-- FinSight Supabase Setup
-- Run this in your Supabase SQL editor to enable data collection
-- https://supabase.com (free tier — no credit card needed)
--
-- After running this:
--   1. Copy your project URL and anon key from Settings > API
--   2. Add them to GitHub Secrets:
--      VITE_SUPABASE_URL  = https://your-project.supabase.co
--      VITE_SUPABASE_ANON_KEY = eyJ...

CREATE TABLE IF NOT EXISTS finsight_sessions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  session_id      TEXT,
  event_type      TEXT,           -- 'onboarding_complete', 'product_selected', etc.

  -- Business profile (all bucketed ranges — no PII)
  industry        TEXT,
  employee_range  TEXT,
  business_age_range TEXT,
  revenue_range   TEXT,
  loan_amount_range TEXT,
  credit_score_range TEXT,

  -- Financing intent
  loan_purpose    TEXT,
  urgency         TEXT,           -- '0-30days', '1-3months', '3-6months', 'exploring'
  state_region    TEXT,

  -- Behavior
  preferred_product TEXT          -- populated on product_selected events
);

-- Enable Row Level Security
ALTER TABLE finsight_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts only (no reads, no deletes from browser)
CREATE POLICY "allow_anonymous_inserts" ON finsight_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Deny all reads from anon (only your authenticated dashboard can read)
CREATE POLICY "deny_anon_reads" ON finsight_sessions
  FOR SELECT
  TO anon
  USING (false);

-- Create useful views for your B2B dashboard
CREATE VIEW finsight_industry_demand AS
  SELECT industry, COUNT(*) as session_count
  FROM finsight_sessions
  WHERE event_type = 'onboarding_complete' AND industry IS NOT NULL
  GROUP BY industry
  ORDER BY session_count DESC;

CREATE VIEW finsight_urgency_signals AS
  SELECT urgency, COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct
  FROM finsight_sessions
  WHERE event_type = 'onboarding_complete' AND urgency IS NOT NULL
  GROUP BY urgency
  ORDER BY count DESC;

CREATE VIEW finsight_product_preferences AS
  SELECT preferred_product, COUNT(*) as count
  FROM finsight_sessions
  WHERE event_type = 'product_selected' AND preferred_product IS NOT NULL
  GROUP BY preferred_product
  ORDER BY count DESC;

CREATE VIEW finsight_geographic_demand AS
  SELECT state_region, COUNT(*) as count
  FROM finsight_sessions
  WHERE event_type = 'onboarding_complete' AND state_region IS NOT NULL
  GROUP BY state_region
  ORDER BY count DESC;

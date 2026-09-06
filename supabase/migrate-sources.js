const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

const sql = `
  -- Add platform lead source columns to leads table
  ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS meta_lead_id text,
    ADD COLUMN IF NOT EXISTS meta_form_id text,
    ADD COLUMN IF NOT EXISTS meta_ad_name text,
    ADD COLUMN IF NOT EXISTS google_lead_id text,
    ADD COLUMN IF NOT EXISTS google_campaign_id text;

  -- Add RLS insert policy for webhook leads (user_id can be null for webhooks)
  DROP POLICY IF EXISTS "Service can insert webhook leads" ON leads;
  CREATE POLICY "Service can insert webhook leads"
    ON leads FOR INSERT
    WITH CHECK (true);

  -- Add insert policy for notifications from webhooks
  DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
  CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

  -- Refresh schema cache
  SELECT pg_notify('pgrst', 'reload schema');
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('SUCCESS: All lead source columns added + RLS policies set'); client.end(); })
  .catch(err => { console.error('ERROR:', err.message); client.end(); process.exit(1); });

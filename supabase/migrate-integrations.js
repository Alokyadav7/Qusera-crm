const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function run() {
  await client.connect();
  
  // Create integrations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS integrations (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
      -- Meta / Facebook / Instagram
      meta_page_access_token text,
      meta_page_id text,
      meta_app_id text,
      meta_connected boolean DEFAULT false,
      -- Google Ads
      google_ads_customer_id text,
      google_connected boolean DEFAULT false,
      -- Fast2SMS
      fast2sms_api_key text,
      fast2sms_sender_id text DEFAULT 'klinqC',
      sms_connected boolean DEFAULT false,
      -- WhatsApp Business
      whatsapp_phone_number_id text,
      whatsapp_connected boolean DEFAULT false,
      -- Webhook secret (unique per company)
      webhook_secret text DEFAULT gen_random_uuid()::text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `);
  console.log('✓ integrations table created');

  // RLS
  await client.query(`ALTER TABLE integrations ENABLE ROW LEVEL SECURITY`);
  await client.query(`DROP POLICY IF EXISTS "Users manage own integrations" ON integrations`);
  await client.query(`
    CREATE POLICY "Users manage own integrations"
      ON integrations FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
  `);
  console.log('✓ RLS applied to integrations');

  // Lead source columns on leads (if migration-lead-sources.sql wasn't run yet)
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS state text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_lead_id text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_form_id text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_ad_name text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_lead_id text`);
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_campaign_id text`);
  console.log('✓ leads source columns added');

  // Webhook insert policies
  await client.query(`DROP POLICY IF EXISTS "Webhook insert leads" ON leads`);
  await client.query(`CREATE POLICY "Webhook insert leads" ON leads FOR INSERT WITH CHECK (true)`);
  await client.query(`DROP POLICY IF EXISTS "Webhook insert notifications" ON notifications`);
  await client.query(`CREATE POLICY "Webhook insert notifications" ON notifications FOR INSERT WITH CHECK (true)`);
  console.log('✓ webhook RLS policies applied');

  await client.query(`SELECT pg_notify('pgrst', 'reload schema')`);
  console.log('✓ schema cache refreshed');
  console.log('\nSUCCESS: All migrations complete!');
  await client.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

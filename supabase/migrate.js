const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const sql = `
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS company_name text,
    ADD COLUMN IF NOT EXISTS industry text,
    ADD COLUMN IF NOT EXISTS team_size text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS website text,
    ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'owner',
    ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS whatsapp_notifications boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
`;

const fixNotifSql = `
  DO $fix$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='notifications' AND column_name='read'
    ) THEN
      ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
    ELSE
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
    END IF;
  END $fix$;
`;

const refreshSql = `SELECT pg_notify('pgrst', 'reload schema');`;

client.connect()
  .then(() => client.query(sql))
  .then(() => { console.log('✓ profiles columns added'); return client.query(fixNotifSql); })
  .then(() => { console.log('✓ notifications.is_read fixed'); return client.query(refreshSql); })
  .then(() => { console.log('✓ schema cache refreshed'); console.log('SUCCESS: Database migration complete!'); client.end(); })
  .catch(err => { console.error('ERROR:', err.message); client.end(); process.exit(1); });

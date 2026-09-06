const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON leads(assigned_to, company_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to
  ON deals(assigned_to, company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
  ON tasks(assigned_to, company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read) WHERE read = false;

-- Verify company_members has department column
ALTER TABLE company_members 
  ADD COLUMN IF NOT EXISTS department varchar;

-- Make sure invites table exists
CREATE TABLE IF NOT EXISTS invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  invited_email varchar NOT NULL,
  invited_name varchar,
  role varchar NOT NULL DEFAULT 'sales_rep',
  department varchar,
  invited_by uuid REFERENCES profiles(id),
  token varchar UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL 
    DEFAULT NOW() + INTERVAL '7 days',
  accepted_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_company_scope" ON invites;
CREATE POLICY "invites_company_scope"
  ON invites FOR ALL
  USING (
    company_id = (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid()
    )
  );
`;

async function main() {
  await client.connect();
  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration complete!');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

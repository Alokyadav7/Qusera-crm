const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database. Fixing recursive policies...');

  // 1. Fix company_members SELECT policy
  await client.query(`
    DROP POLICY IF EXISTS "members_can_see_company_members" ON company_members;
    CREATE POLICY "members_can_see_company_members" ON company_members FOR SELECT
      USING (
        user_id = auth.uid()
        OR
        company_id IN (
          SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
        )
      );
  `);
  console.log('Dropped and recreated members_can_see_company_members SELECT policy.');

  // 2. Double check if we need to enable RLS and add basic security rules
  await client.query(`
    ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
  `);
  console.log('Ensured RLS is enabled on company_members.');

  await client.end();
  console.log('RLS policy update complete!');
}

main().catch(console.error);

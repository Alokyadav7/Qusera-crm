const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database. Fixing company_members RLS policies to eliminate infinite recursion...');

  // Drop recursive policies
  await client.query(`
    DROP POLICY IF EXISTS "members_can_read_same_company_members" ON company_members;
    DROP POLICY IF EXISTS "owner_admin_can_manage_members" ON company_members;
  `);
  console.log('Dropped members_can_read_same_company_members and owner_admin_can_manage_members.');

  // Create non-recursive replacements
  await client.query(`
    CREATE POLICY "members_can_read_same_company_members" ON company_members FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "owner_admin_can_manage_members" ON company_members FOR ALL
      USING (
        company_id IN (
          SELECT id FROM companies WHERE owner_id = auth.uid()
        )
      );
  `);
  console.log('Created non-recursive RLS policy replacements successfully.');

  await client.end();
  console.log('Finished.');
}

main().catch(console.error);

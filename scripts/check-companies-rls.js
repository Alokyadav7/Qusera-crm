const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT policyname, cmd
    FROM pg_policies
    WHERE tablename = 'companies'
  `);
  console.log('companies RLS policies:', res.rows);
  await client.end();
}

main().catch(console.error);

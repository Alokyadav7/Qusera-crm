const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
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

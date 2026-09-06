const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB.');
  
  // Get all columns of auth.users
  const columnsQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users'
    ORDER BY ordinal_position;
  `;
  const columnsRes = await client.query(columnsQuery);
  console.log('--- COLUMNS IN auth.users ---');
  console.log(columnsRes.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});

const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('--- DATABASE CONNECTION DIAGNOSTIC ---');
  console.log('Connection: SUCCESSFUL');

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('\nExisting Tables in Database:');
  console.log(tables.join(', '));

  console.log('\n--- VERIFYING CUSTOMER SUCCESS TABLES ---');
  const hasHealth = tables.includes('customer_health_snapshots');
  const hasRenewal = tables.includes('renewal_opportunities');
  console.log(`Table 'customer_health_snapshots': ${hasHealth ? 'EXISTS' : 'NOT FOUND'}`);
  console.log(`Table 'renewal_opportunities': ${hasRenewal ? 'EXISTS' : 'NOT FOUND'}`);

  await client.end();
}

main().catch(console.error);

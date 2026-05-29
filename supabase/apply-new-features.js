const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected.');
  const sql = fs.readFileSync(path.join(__dirname, 'new-features-migration.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('✓ new-features-migration.sql applied');
  } catch (e) {
    console.error('✗ Migration error:', e.message);
  }
  await client.end();
  console.log('Done.');
}
main().catch(async e => { console.error(e); await client.end(); });

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected for triggers.');
  const sql = fs.readFileSync(path.join(__dirname, 'triggers-new-features.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('✓ triggers-new-features.sql applied');
  } catch (e) {
    console.error('✗ Trigger error:', e.message);
  }
  await client.end();
  console.log('Done.');
}
main().catch(async e => { console.error(e); await client.end(); });

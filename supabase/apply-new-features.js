const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
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

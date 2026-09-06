const { Client } = require('pg');

// Use the exact non-pooling URL with sslmode=require from .env
const connectionString = (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL);

console.log('Initializing pg client...');
const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

console.log('Connecting to database...');
client.connect()
  .then(() => {
    console.log('Connected successfully!');
    const sql = `
      ALTER TABLE interactions
        ADD COLUMN IF NOT EXISTS ai_summary text;
    `;
    return client.query(sql);
  })
  .then(() => {
    console.log('✓ Added ai_summary column to interactions table (if it did not exist).');
    const refreshSql = `SELECT pg_notify('pgrst', 'reload schema');`;
    return client.query(refreshSql);
  })
  .then(() => {
    console.log('✓ Reloaded PostgREST schema cache.');
    client.end();
    console.log('Done!');
  })
  .catch(err => {
    console.error('CONNECTION OR QUERY ERROR:', err);
    client.end();
    process.exit(1);
  });

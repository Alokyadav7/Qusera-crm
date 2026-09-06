const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name='profiles' ORDER BY ordinal_position"))
  .then(r => { console.log('profiles columns:', r.rows.map(c => c.column_name).join(', ')); return client.query("SELECT column_name FROM information_schema.columns WHERE table_name='notifications' ORDER BY ordinal_position"); })
  .then(r => { console.log('notifications columns:', r.rows.map(c => c.column_name).join(', ')); client.end(); })
  .catch(err => { console.error(err.message); client.end(); });

const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name='profiles' ORDER BY ordinal_position"))
  .then(r => { console.log('profiles columns:', r.rows.map(c => c.column_name).join(', ')); return client.query("SELECT column_name FROM information_schema.columns WHERE table_name='notifications' ORDER BY ordinal_position"); })
  .then(r => { console.log('notifications columns:', r.rows.map(c => c.column_name).join(', ')); client.end(); })
  .catch(err => { console.error(err.message); client.end(); });

const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB.');

  try {
    await client.query('BEGIN');
    
    // Attempt to insert directly into auth.users to see if the trigger fails
    const res = await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (
        gen_random_uuid(), 
        'test_trigger_temp@example.com',
        '{"full_name": "Test User"}'::jsonb
      )
      RETURNING id, email;
    `);
    
    console.log('Insert succeeded:', res.rows[0]);
  } catch (err) {
    console.error('Insert failed with error:', err.message);
    console.error(err);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

main();

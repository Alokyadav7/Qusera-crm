const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database. Running migrations...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS blog_subscribers (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      email varchar UNIQUE NOT NULL,
      subscribed_at timestamptz DEFAULT NOW()
    );
  `);
  console.log('blog_subscribers table verified.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      full_name varchar NOT NULL,
      company_name varchar NOT NULL,
      work_email varchar NOT NULL,
      phone varchar,
      team_size varchar,
      industry varchar,
      message text,
      created_at timestamptz DEFAULT NOW()
    );
  `);
  console.log('contact_submissions table verified.');

  await client.end();
  console.log('Migration finished successfully!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

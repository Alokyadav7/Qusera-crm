const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.eqllqrppeodrhalpiajx:fcFxfE8Z7BjLbX99@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const migrationFiles = [
  'multi-tenant-core.sql',
  'migrations/001_auth_schema.sql',
  'activity-events.sql',
  'job-queue.sql',
  'subscriptions-billing.sql',
  'migrations/20260527_notifications_and_score_history.sql',
  'patch-migration-v2.sql',
  'client-schema-migration.sql',
  'enterprise-readiness.sql'
];

async function main() {
  await client.connect();
  console.log('Connected to Supabase Postgres database.');

  // Run the core migration files
  for (const filename of migrationFiles) {
    const filePath = path.join(__dirname, filename);
    console.log(`Running migration: ${filename}...`);
    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      await client.query(sqlContent);
      console.log(`✓ Migration ${filename} executed successfully.`);
    } catch (err) {
      console.error(`✗ Error running migration ${filename}:`, err.message);
    }
  }

  // Create and seed plan_limits table
  console.log('Checking plan_limits table...');
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_limits (
        id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
        plan_id     text        REFERENCES plans(id) ON DELETE CASCADE NOT NULL,
        feature_key text        NOT NULL,
        limit_value integer     NOT NULL,
        UNIQUE (plan_id, feature_key)
      );
    `);
    console.log('✓ plan_limits table ready.');

    const seedLimits = [
      // Free plan
      { plan_id: 'free', feature_key: 'max_users', limit_value: 3 },
      { plan_id: 'free', feature_key: 'max_leads', limit_value: 100 },
      { plan_id: 'free', feature_key: 'max_pipelines', limit_value: 1 },
      { plan_id: 'free', feature_key: 'ai_credits', limit_value: 10 },
      { plan_id: 'free', feature_key: 'whatsapp_messages', limit_value: 0 },
      { plan_id: 'free', feature_key: 'sms_credits', limit_value: 0 },
      // Pro plan
      { plan_id: 'pro', feature_key: 'max_users', limit_value: 15 },
      { plan_id: 'pro', feature_key: 'max_leads', limit_value: 5000 },
      { plan_id: 'pro', feature_key: 'max_pipelines', limit_value: 5 },
      { plan_id: 'pro', feature_key: 'ai_credits', limit_value: 500 },
      { plan_id: 'pro', feature_key: 'whatsapp_messages', limit_value: 1000 },
      { plan_id: 'pro', feature_key: 'sms_credits', limit_value: 2000 },
      // Enterprise plan
      { plan_id: 'enterprise', feature_key: 'max_users', limit_value: -1 },
      { plan_id: 'enterprise', feature_key: 'max_leads', limit_value: -1 },
      { plan_id: 'enterprise', feature_key: 'max_pipelines', limit_value: -1 },
      { plan_id: 'enterprise', feature_key: 'ai_credits', limit_value: -1 },
      { plan_id: 'enterprise', feature_key: 'whatsapp_messages', limit_value: -1 },
      { plan_id: 'enterprise', feature_key: 'sms_credits', limit_value: -1 }
    ];

    for (const limit of seedLimits) {
      await client.query(`
        INSERT INTO plan_limits (plan_id, feature_key, limit_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (plan_id, feature_key) DO UPDATE SET limit_value = $3
      `, [limit.plan_id, limit.feature_key, limit.limit_value]);
    }
    console.log('✓ Seeding plan_limits complete.');
  } catch (err) {
    console.error('✗ Error checking/seeding plan_limits:', err.message);
  }

  // Reload PostgREST schema cache
  try {
    await client.query("SELECT pg_notify('pgrst', 'reload schema');");
    console.log('✓ PostgREST schema cache reloaded.');
  } catch (err) {
    console.error('✗ Error reloading schema cache:', err.message);
  }

  await client.end();
  console.log('All migrations complete!');
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  await client.end();
});

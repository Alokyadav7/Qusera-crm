const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB.');

  try {
    const resUsers = await client.query("SELECT id, email, created_at FROM auth.users WHERE email LIKE '%qusera%'");
    console.log('Users in auth.users:', resUsers.rows);
    
    const resIdentities = await client.query("SELECT id, user_id, identity_data FROM auth.identities WHERE identity_data::text LIKE '%qusera%'");
    console.log('Identities in auth.identities:', resIdentities.rows);

    const resProfiles = await client.query("SELECT id, email, company_id FROM public.profiles WHERE email LIKE '%qusera%'");
    console.log('Profiles in public.profiles:', resProfiles.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();

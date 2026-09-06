const { Client } = require('pg');
const client = new Client({
  connectionString: (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL),
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB.');

  try {
    console.log('Checking for orphaned identities with email info.qusera@gmail.com...');
    const checkRes = await client.query("SELECT * FROM auth.identities WHERE identity_data::text LIKE '%info.qusera@gmail.com%'");
    console.log('Orphaned identities found:', checkRes.rows);

    if (checkRes.rows.length > 0) {
      console.log('Deleting orphaned identities...');
      const delRes = await client.query("DELETE FROM auth.identities WHERE identity_data::text LIKE '%info.qusera@gmail.com%'");
      console.log('Deleted rows:', delRes.rowCount);
      
      const checkAgain = await client.query("SELECT * FROM auth.identities WHERE identity_data::text LIKE '%info.qusera@gmail.com%'");
      console.log('Checking again, remaining rows:', checkAgain.rows.length);
    } else {
      console.log('No orphaned identities found.');
    }
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await client.end();
  }
}

main();

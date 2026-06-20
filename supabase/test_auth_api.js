const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing URL or serviceKey');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const email = 'info.qusera@gmail.com';
  console.log(`Attempting to create auth user with email: ${email}`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: 'TemporaryPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Qusera Admin',
      company_id: '1f5a8fed-aa72-4b28-9c89-541392f47a87',
    },
  });

  if (error) {
    console.error('--- CREATE USER FAILED ---');
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Full Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('--- CREATE USER SUCCEEDED ---');
    console.log('User ID:', data.user.id);
    console.log('User Email:', data.user.email);
    
    // Clean it up immediately so the onboard wizard can run with it
    console.log('Cleaning up test user from auth.users...');
    const { error: delError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (delError) {
      console.error('Failed to clean up:', delError.message);
    } else {
      console.log('Cleaned up successfully.');
    }
  }
}

main();

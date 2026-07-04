import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const email = 'qa_owner@klinqcrm.test'
  const password = 'TestPassword123!'

  console.log('Supabase URL:', url)
  const supabase = createClient(url, anonKey)

  // Test ping/select
  const { data, error } = await supabase.from('companies').select('count', { count: 'exact', head: true })
  if (error) {
    console.error('Database connection failed:', error.message)
  } else {
    console.log('Database connection SUCCESS! Company count:', data)
  }
}

main().catch(console.error)

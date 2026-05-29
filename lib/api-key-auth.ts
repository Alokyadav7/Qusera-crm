import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

export interface ApiAuthResult {
  authorized: boolean
  companyId?: string
  error?: string
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  // Extract x-api-key header or Authorization header
  const apiKey = req.headers.get('x-api-key') || req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')

  if (!apiKey) {
    return { authorized: false, error: 'Missing API Key in headers' }
  }

  // API keys must start with 'Klinq_'
  if (!apiKey.startsWith('Klinq_')) {
    return { authorized: false, error: 'Invalid API Key format' }
  }

  const prefix = apiKey.slice(0, 10)
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const supabase = createServiceClient()

  // Find active key matches prefix and hash
  const { data: keyRecord, error } = await (supabase as any)
    .from('api_keys')
    .select('company_id')
    .eq('key_prefix', prefix)
    .eq('key_hash', hash)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !keyRecord) {
    return { authorized: false, error: 'Unauthorized or invalid API token' }
  }

  // Verify company subscription plan tier is enterprise
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select('plan_id')
    .eq('company_id', (keyRecord as any).company_id)
    .maybeSingle()

  if ((sub as any)?.plan_id !== 'enterprise') {
    return { authorized: false, error: 'Forbidden. API access requires an active Enterprise subscription plan.' }
  }

  // Update last_used_at timestamp
  await (supabase as any)
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', prefix)
    .eq('key_hash', hash)

  return { authorized: true, companyId: (keyRecord as any).company_id }
}


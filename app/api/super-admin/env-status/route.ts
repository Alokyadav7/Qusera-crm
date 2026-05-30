import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'

// GET /api/super-admin/env-status
// Returns which environment variables are configured (presence only — NEVER values)
export const GET = withSuperAdmin(async (_req: NextRequest, _adminId: string) => {
  const vars = [
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'NEXT_PUBLIC_META_APP_ID',
    'META_APP_SECRET',
    'META_SYSTEM_USER_TOKEN',
    'WHATSAPP_VERIFY_TOKEN',
    'FAST2SMS_API_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const status = Object.fromEntries(
    vars.map(key => [key, !!process.env[key]])
  )

  return NextResponse.json({ env: status })
})

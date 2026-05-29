import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/feature-flags/data
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()

  const { data: adminRecord } = await svc.from('platform_admins').select('is_active').eq('user_id', user.id).single()
  const metaFlag = user.user_metadata?.is_platform_admin === true || (user as any).app_metadata?.is_platform_admin === true
  if (!adminRecord?.is_active && !metaFlag) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: features }, { data: plans }, { data: planFeatures }] = await Promise.all([
    svc.from('feature_definitions').select('*').order('category').order('name'),
    svc.from('plans').select('*').eq('is_active', true).order('sort_order'),
    svc.from('plan_features').select('*'),
  ])

  return NextResponse.json({
    features: features ?? [],
    plans: plans ?? [],
    planFeatures: planFeatures ?? [],
  })
}

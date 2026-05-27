import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, used only server-side
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/admin/users — list all users with their roles
export async function GET() {
  try {
    const supabase = getServiceClient()

    // Fetch all users from auth.users via admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    // Fetch all user_roles with role details
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*, role:roles(*)')
    if (rolesError) throw rolesError

    // Merge
    const enriched = users.map(u => ({
      id: u.id,
      email: u.email ?? '',
      full_name: u.user_metadata?.full_name ?? null,
      avatar_url: u.user_metadata?.avatar_url ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      is_active: !u.banned_until,
      roles: (userRoles ?? [])
        .filter(ur => ur.user_id === u.id)
        .map(ur => ur.role)
        .filter(Boolean),
    }))

    return NextResponse.json({ users: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

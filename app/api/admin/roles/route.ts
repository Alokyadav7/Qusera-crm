import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/admin/roles — assign a role to a user
export async function POST(req: NextRequest) {
  try {
    const { userId, roleId, assignedBy } = await req.json()
    if (!userId || !roleId) {
      return NextResponse.json({ error: 'userId and roleId are required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy ?? null,
    })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/roles — remove a role from a user
export async function DELETE(req: NextRequest) {
  try {
    const { userId, roleId } = await req.json()
    if (!userId || !roleId) {
      return NextResponse.json({ error: 'userId and roleId are required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

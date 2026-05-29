// ─── Klinq CRM — Soft Delete Utility ─────────────────────────────────────────
// Centralized soft delete and restore for all major entities.
// Never permanently deletes data unless explicitly requested by super admin.

import { createServiceClient } from '@/lib/supabase/service'

export type SoftDeleteTable =
  | 'leads'
  | 'tasks'
  | 'interactions'
  | 'clients'
  | 'companies'
  | 'workspaces'
  | 'company_members'

/**
 * Soft delete a record by setting deleted_at and deleted_by.
 *
 * @example
 * await softDelete('leads', leadId, userId)
 */
export async function softDelete(
  table: SoftDeleteTable,
  id: string,
  deletedBy: string
): Promise<void> {
  // Use `as any` because SoftDeleteTable is a union of strings, and the
  // Supabase client can't statically resolve the column types for a
  // runtime-determined table name. Safety is ensured by the SoftDeleteTable union.
  const supabase = createServiceClient()
  const { error } = await (supabase as any)
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to soft delete ${table}/${id}: ${error.message}`)
  }
}

/**
 * Restore a soft-deleted record.
 */
export async function restore(
  table: SoftDeleteTable,
  id: string
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await (supabase as any)
    .from(table)
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to restore ${table}/${id}: ${error.message}`)
  }
}

/**
 * Check if a record is soft-deleted.
 */
export async function isDeleted(
  table: SoftDeleteTable,
  id: string
): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await (supabase as any)
    .from(table)
    .select('deleted_at')
    .eq('id', id)
    .single()

  return !!(data as any)?.deleted_at
}

/**
 * Get a default Supabase query filter that excludes soft-deleted records.
 * In practice, just always add `.is('deleted_at', null)` to queries.
 */
export const ACTIVE_ONLY = { column: 'deleted_at', value: null } as const

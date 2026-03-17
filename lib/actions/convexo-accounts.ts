'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSessionUser, requireAdmin } from './auth'

export type ConvexoAccountInput = {
  method: string
  label?: string
  details?: Record<string, unknown>
  directions?: string[]
  is_default?: boolean
  is_active?: boolean
  doc_url?: string
}

/** Public read — any authenticated user can see Convexo's active accounts. */
export async function getConvexoAccounts(privyToken: string) {
  await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase
    .from('convexo_accounts')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
  if (error) throw error
  return data
}

/** Admin read — returns all accounts including inactive ones. */
export async function adminGetConvexoAccounts(privyToken: string) {
  await requireAdmin(privyToken)
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('convexo_accounts')
    .select('*')
    .order('is_default', { ascending: false })
  if (error) throw error
  return data
}

/** Admin only — create a new Convexo receiving account. */
export async function createConvexoAccount(
  privyToken: string,
  data: ConvexoAccountInput
) {
  await requireAdmin(privyToken)
  const supabase = await createServiceClient()
  const { data: account, error } = await supabase
    .from('convexo_accounts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(data as any)
    .select()
    .single()
  if (error) throw error
  return account
}

/** Admin only — update an existing Convexo account. */
export async function updateConvexoAccount(
  privyToken: string,
  id: string,
  data: Partial<ConvexoAccountInput>
) {
  await requireAdmin(privyToken)
  const supabase = await createServiceClient()
  const { data: updated, error } = await supabase
    .from('convexo_accounts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ ...data, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated
}

/** Admin only — soft-delete a Convexo account. */
export async function deactivateConvexoAccount(privyToken: string, id: string) {
  await requireAdmin(privyToken)
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('convexo_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

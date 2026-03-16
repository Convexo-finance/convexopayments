'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

/**
 * Payment profiles belong exclusively to suppliers and clients.
 * Convexo's own accounts live in convexo-accounts.ts.
 */

export type PaymentProfileInput = {
  entity_type: 'SUPPLIER' | 'CLIENT'
  entity_id: string
  method: string
  label?: string
  details?: Record<string, unknown>
  doc_url?: string
  is_default?: boolean
  is_active?: boolean
}

export async function createPaymentProfile(
  privyToken: string,
  data: PaymentProfileInput
) {
  await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { data: profile, error } = await supabase
    .from('payment_profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(data as any)
    .select()
    .single()
  if (error) throw error
  return profile
}

export async function getPaymentProfiles(
  privyToken: string,
  entityType: string,
  entityId: string
) {
  await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase
    .from('payment_profiles')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
  if (error) throw error
  return data
}

export async function updatePaymentProfile(
  privyToken: string,
  id: string,
  data: Partial<PaymentProfileInput>
) {
  await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { data: updated, error } = await supabase
    .from('payment_profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ ...data, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return updated
}

export async function deactivatePaymentProfile(privyToken: string, id: string) {
  await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { error } = await supabase
    .from('payment_profiles')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

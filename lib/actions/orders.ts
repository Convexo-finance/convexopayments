'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'
import { createNotification } from './notifications'

export async function uploadInvoice(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  // Storage upload uses service client — bucket RLS blocks user JWTs.
  // Identity is already verified above; path is scoped to the user's ID.
  const supabase = await createServiceClient()
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `invoices/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}

export async function uploadUserProof(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createServiceClient()
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `user-proofs/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}

const CANCEL_ALLOWED = ['DRAFT', 'OPENED']

export type OrderInput = {
  type: 'PAY' | 'COLLECT'
  entity_id: string
  payment_profile_id?: string
  own_profile_id?: string
  convexo_account_id?: string
  amount: number
  currency: string
  due_date?: string
  reference?: string
  invoice_url?: string
  txn_hash?: string
  processing_fee?: number
  fiat_currency?: string
  fiat_amount?: number
  fiat_rate?: number
}

async function appendStatusHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  newStatus: string,
  userId: string
) {
  const { data: order } = await supabase
    .from('payment_orders')
    .select('status_history')
    .eq('id', orderId)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: any[] = (order?.status_history as any[]) ?? []
  history.push({
    status: newStatus,
    changed_at: new Date().toISOString(),
    changed_by: userId,
  })
  return history
}

export async function createOrder(privyToken: string, data: OrderInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: order, error } = await supabase
    .from('payment_orders')
    .insert({ ...data, user_id: user.id, status: 'DRAFT' })
    .select()
    .single()
  if (error) throw error
  return order
}

export async function submitOrder(privyToken: string, orderId: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: order } = await supabase
    .from('payment_orders')
    .select()
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()
  if (!order || order.status !== 'DRAFT') throw new Error('INVALID_TRANSITION')
  const history = await appendStatusHistory(supabase, orderId, 'OPENED', user.id)
  const { data: updated, error } = await supabase
    .from('payment_orders')
    .update({
      status: 'OPENED',
      status_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  await createNotification(
    user.id,
    'ORDER_STATUS',
    'Order opened',
    'Your order is open. Please complete your payment to proceed.',
    orderId,
    'ORDER'
  )
  return updated
}

export async function confirmPayment(
  privyToken: string,
  orderId: string,
  payload: { txnHash?: string; convexoAccountId?: string; userProofUrl?: string }
) {
  const { txnHash, convexoAccountId, userProofUrl } = payload
  if (!txnHash?.trim() && !userProofUrl) throw new Error('MISSING_PAYMENT_EVIDENCE')
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: order } = await supabase
    .from('payment_orders')
    .select('status, user_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()
  if (!order || order.status !== 'OPENED') throw new Error('INVALID_TRANSITION')
  const history = await appendStatusHistory(supabase, orderId, 'ORDERED', user.id)
  const update: Record<string, unknown> = {
    status: 'ORDERED',
    status_history: history,
    updated_at: new Date().toISOString(),
  }
  if (txnHash?.trim()) update.txn_hash = txnHash.trim()
  if (convexoAccountId) update.convexo_account_id = convexoAccountId
  if (userProofUrl) update.user_proof_url = userProofUrl
  const { data: updated, error } = await supabase
    .from('payment_orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  await createNotification(
    user.id,
    'ORDER_STATUS',
    'Payment confirmed',
    'Your payment has been submitted. Convexo will process your order shortly.',
    orderId,
    'ORDER'
  )
  return updated
}

export async function cancelOrder(privyToken: string, orderId: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: order } = await supabase
    .from('payment_orders')
    .select()
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()
  if (!order || !CANCEL_ALLOWED.includes(order.status))
    throw new Error('INVALID_TRANSITION')
  const history = await appendStatusHistory(supabase, orderId, 'CANCELADO', user.id)
  const { data: updated, error } = await supabase
    .from('payment_orders')
    .update({
      status: 'CANCELADO',
      status_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  await createNotification(
    user.id,
    'ORDER_STATUS',
    'Order cancelled',
    'Your order has been cancelled.',
    orderId,
    'ORDER'
  )
  return updated
}

export async function getOrders(
  privyToken: string,
  type: 'PAY' | 'COLLECT',
  { page = 1, status = '' } = {}
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase
    .from('payment_orders')
    .select('*, payment_profiles!payment_profile_id(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('type', type)
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, count, error } = await q
  if (error) throw error

  // entity_id has no FK so we can't join — batch-fetch entity names separately
  const entityIds = [...new Set((data ?? []).map((o) => o.entity_id).filter(Boolean))]
  const table = type === 'PAY' ? 'suppliers' : 'clients'
  let entityMap: Record<string, string> = {}
  if (entityIds.length > 0) {
    const { data: entities } = await supabase
      .from(table)
      .select('id, internal_name')
      .in('id', entityIds)
    if (entities) {
      entityMap = Object.fromEntries(entities.map((e) => [e.id, e.internal_name]))
    }
  }

  const enriched = (data ?? []).map((o) => ({
    ...o,
    entity_name: entityMap[o.entity_id] ?? null,
  }))

  return { data: enriched, total: count ?? 0 }
}

export async function getOrderById(privyToken: string, orderId: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*, payment_profiles!payment_profile_id(*)')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()
  if (error) throw error

  // entity_id has no FK to suppliers/clients — resolve name with a separate query
  let entity_name: string | null = null
  if (data?.entity_id) {
    const table = data.type === 'PAY' ? 'suppliers' : 'clients'
    const { data: entity } = await supabase
      .from(table)
      .select('internal_name')
      .eq('id', data.entity_id)
      .single()
    entity_name = entity?.internal_name ?? null
  }

  return { ...data, entity_name }
}

export async function updateOrderDraft(
  privyToken: string,
  orderId: string,
  data: Partial<OrderInput>
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: order } = await supabase
    .from('payment_orders')
    .select('status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()
  if (!order || order.status !== 'DRAFT') throw new Error('INVALID_TRANSITION')
  const { data: updated, error } = await supabase
    .from('payment_orders')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error
  return updated
}

'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from './auth'
import { createNotification } from './notifications'
import { getPrivyClient } from '@/lib/privy/server'

const ADMIN_VALID_TRANSITIONS: Record<string, string[]> = {
  OPENED:     ['EN_REVISION'],
  ORDERED:    ['EN_REVISION'],
  EN_REVISION: ['PROCESANDO', 'RECHAZADO'],
  PROCESANDO: ['PAYED', 'RECHAZADO'],
}

export async function adminUpdateOrderStatus(
  privyToken: string,
  orderId: string,
  newStatus: string,
  opts: { rejectionReason?: string; proofUrl?: string } = {}
) {
  const admin = await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const { data: order } = await supabase
    .from('payment_orders')
    .select()
    .eq('id', orderId)
    .single()
  if (!order) throw new Error('NOT_FOUND')
  const allowed = ADMIN_VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(newStatus)) throw new Error('INVALID_TRANSITION')

  const history = (order.status_history as Array<unknown>) ?? []
  history.push({
    status: newStatus,
    changed_at: new Date().toISOString(),
    changed_by: admin.id,
  })

  const update: Record<string, unknown> = {
    status: newStatus,
    status_history: history,
    updated_at: new Date().toISOString(),
  }
  if (opts.rejectionReason) update.rejection_reason = opts.rejectionReason
  if (opts.proofUrl) update.proof_url = opts.proofUrl

  const { data: updated, error } = await supabase
    .from('payment_orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .single()
  if (error) throw error

  await createNotification(
    order.user_id!,
    'ORDER_STATUS',
    `Order ${newStatus.toLowerCase()}`,
    newStatus === 'RECHAZADO'
      ? `Your order was rejected: ${opts.rejectionReason}`
      : newStatus === 'PAYED'
        ? 'Your order has been paid. You can now download the proof of payment.'
        : `Your order status is now ${newStatus}.`,
    orderId,
    'ORDER'
  )
  return updated
}

export async function adminEnableUser(
  privyToken: string,
  userId: string,
  enabled: boolean
) {
  await requireAdmin(privyToken)
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({ is_enabled: enabled })
    .eq('id', userId)
  if (error) throw error

  // When enabling, provision the Privy embedded wallet so the user has a
  // deposit address ready. Errors are non-fatal — wallet creation on login
  // (createOnLogin: 'users-without-wallets') acts as a fallback.
  if (enabled) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('privy_user_id')
        .eq('id', userId)
        .single()
      if (userData?.privy_user_id) {
        const privy = getPrivyClient()
        await privy.createWallets({
          userId: userData.privy_user_id,
          wallets: [{ chainType: 'ethereum', policyIds: [] }],
        })
      }
    } catch (err) {
      // Wallet may already exist — log and continue
      console.error('[adminEnableUser] Privy wallet creation skipped:', err)
    }
  }

  await createNotification(
    userId,
    'ACCOUNT',
    enabled ? 'Account activated' : 'Account deactivated',
    enabled
      ? 'Your account has been activated. You can now log in.'
      : 'Your account has been deactivated.'
  )
}

export async function adminVerifyRUT(
  privyToken: string,
  userId: string,
  status: 'VERIFICADO' | 'RECHAZADO',
  note?: string
) {
  await requireAdmin(privyToken)
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      rut_status: status,
      rut_admin_note: note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) throw error
  await createNotification(
    userId,
    'PROFILE',
    `RUT ${status.toLowerCase()}`,
    status === 'VERIFICADO'
      ? 'Your RUT has been verified.'
      : `Your RUT was rejected: ${note}`
  )
}

export async function adminUploadProof(privyToken: string, orderId: string, file: File) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `proofs/${orderId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}

export async function adminGetAllOrders(
  privyToken: string,
  type: 'PAY' | 'COLLECT',
  { page = 1, status = '' } = {}
) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase
    .from('payment_orders')
    .select('*, users(email), payment_profiles!payment_profile_id(*)', { count: 'exact' })
    .eq('type', type)
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, count, error } = await q
  if (error) throw error

  // entity_id has no FK — batch-fetch entity names separately
  const entityIds = [...new Set((data ?? []).map((o) => o.entity_id).filter(Boolean))]
  const table = type === 'PAY' ? 'suppliers' : 'clients'
  let entityMap: Record<string, string> = {}
  if (entityIds.length > 0) {
    const { data: entities } = await supabase.from(table).select('id, internal_name').in('id', entityIds)
    if (entities) entityMap = Object.fromEntries(entities.map((e) => [e.id, e.internal_name]))
  }

  const enriched = (data ?? []).map((o) => ({ ...o, entity_name: entityMap[o.entity_id] ?? null }))
  return { data: enriched, total: count ?? 0 }
}

export async function adminGetAllUsers(
  privyToken: string,
  { page = 1 } = {}
) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  const { data, count, error } = await supabase
    .from('users')
    .select('*, profiles(rut_status, rut_url, first_name, last_name)', {
      count: 'exact',
    })
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (error) throw error
  return { data, total: count ?? 0 }
}

const OTC_VALID_TRANSITIONS: Record<string, string[]> = {
  ORDERED:   ['ACEPTADO', 'CANCELADO'],
  ACEPTADO:  ['POR_PAGAR', 'CANCELADO'],
  POR_PAGAR: ['REVISION', 'CANCELADO'],
  REVISION:  ['LIQUIDADO', 'CANCELADO'],
  // Legacy transitions kept for backward compatibility
  PENDIENTE:   ['EN_REVISION', 'COMPLETADO', 'RECHAZADO'],
  EN_REVISION: ['COMPLETADO', 'RECHAZADO'],
}

const OTC_NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  ACEPTADO:  { title: 'Orden aceptada', body: 'Tu orden OTC ha sido aceptada por Convexo.' },
  POR_PAGAR: { title: 'Listo para pagar', body: 'Tu orden está lista. Completa tu pago para continuar.' },
  REVISION:  { title: 'Pago en revisión', body: 'Tu pago está siendo revisado por Convexo.' },
  LIQUIDADO: { title: 'Orden liquidada', body: 'Tu operación OTC ha sido completada y liquidada.' },
  CANCELADO: { title: 'Orden cancelada', body: 'Tu orden OTC ha sido cancelada.' },
}

export async function adminUpdateWalletRequest(
  privyToken: string,
  requestId: string,
  newStatus: string,
  opts: {
    proofUrl?: string
    rejectionReason?: string
    adminNote?: string
    spreadPct?: number
    rate?: number
    copAmount?: number
  } = {}
) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const { data: req } = await supabase
    .from('wallet_requests')
    .select()
    .eq('id', requestId)
    .single()
  if (!req) throw new Error('NOT_FOUND')

  const allowed = OTC_VALID_TRANSITIONS[req.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(`INVALID_TRANSITION: ${req.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`)
  }

  const update: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...(opts.proofUrl   ? { proof_url:  opts.proofUrl }   : {}),
    ...(opts.rejectionReason ? { rejection_reason: opts.rejectionReason } : {}),
    ...(opts.adminNote  ? { admin_note: opts.adminNote }  : {}),
  }

  // Admin can override spread, rate, and COP amount at any step (stored in metadata)
  if (opts.spreadPct != null || opts.rate != null || opts.copAmount != null || newStatus === 'ACEPTADO') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (req.metadata as any) ?? {}
    const spread   = opts.spreadPct  != null ? opts.spreadPct  : (meta.spread_pct  ?? 0.01)
    const baseRate = opts.rate       != null ? opts.rate       : (meta.usdcop_rate ?? null)
    const amount   = Number(req.amount)

    update.spread_pct = spread
    if (baseRate) {
      const computedCop = req.type === 'CASH_IN'
        ? amount * baseRate * (1 + spread)
        : amount * baseRate * (1 - spread)
      const finalCop = opts.copAmount != null ? opts.copAmount : computedCop
      update.metadata = { ...meta, usdcop_rate: baseRate, cop_amount: finalCop, spread_pct: spread }
    } else if (opts.copAmount != null) {
      update.metadata = { ...meta, cop_amount: opts.copAmount, spread_pct: spread }
    }
  }

  // Balance operations and paid_at on final settlement
  if (newStatus === 'LIQUIDADO') {
    update.paid_at = new Date().toISOString()
    const fn = req.type === 'CASH_IN' ? 'increment_balance' : 'decrement_balance'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)(fn, { user_id: req.user_id, amount: req.amount })
  }

  // Legacy COMPLETADO support
  if (newStatus === 'COMPLETADO') {
    update.paid_at = new Date().toISOString()
    if (opts.proofUrl) {
      const fn = req.type === 'TOPUP' ? 'increment_balance' : 'decrement_balance'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)(fn, { user_id: req.user_id, amount: req.amount })
    }
  }

  await supabase.from('wallet_requests').update(update).eq('id', requestId)

  const notif = OTC_NOTIFICATIONS[newStatus]
  await createNotification(
    req.user_id!,
    'WALLET',
    notif?.title ?? `Estado: ${newStatus}`,
    notif?.body ?? `Tu solicitud ahora está en estado ${newStatus}.`,
    requestId,
    'WALLET_REQUEST'
  )

}

export async function adminBroadcastNotification(
  privyToken: string,
  opts: {
    target: 'ALL' | string
    title: string
    body: string
    sendEmail: boolean
    sendInApp: boolean
  }
) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  let users: { id: string; email: string }[] = []
  if (opts.target === 'ALL') {
    const { data } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_enabled', true)
    users = data ?? []
  } else {
    const { data } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', opts.target)
      .single()
    if (data) users = [data]
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await Promise.all(
    users.map(async (u) => {
      if (opts.sendInApp) {
        // createNotification also sends email internally
        await createNotification(u.id, 'BROADCAST', opts.title, opts.body)
      } else if (opts.sendEmail) {
        try {
          await resend.emails.send({
            from: 'pay@convexo.xyz',
            to: u.email,
            subject: opts.title,
            html: `<p>${opts.body}</p>`,
          })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          await supabase
            .from('notification_errors')
            .insert({ error: message })
        }
      }
    })
  )
}

export async function adminGetOrderById(privyToken: string, orderId: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const { data: order, error } = await supabase
    .from('payment_orders')
    .select('*, users(email), payment_profiles!payment_profile_id(*)')
    .eq('id', orderId)
    .single()
  if (error || !order) throw new Error('NOT_FOUND')

  const table = order.type === 'PAY' ? 'suppliers' : 'clients'
  const { data: entity } = await supabase
    .from(table)
    .select('id, internal_name, legal_name, company_type, registration_country, registration_number, contact_email, company_phone, contact_name, contact_phone, contact_person_email, office_country, state, city, address, postal_code')
    .eq('id', order.entity_id)
    .single()

  return { ...order, entity: entity ?? null }
}

export async function adminGetSupplierById(privyToken: string, id: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const { data: entity, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !entity) throw new Error('NOT_FOUND')

  const { data: paymentProfiles } = await supabase
    .from('payment_profiles')
    .select('*')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })

  const { data: orders } = await supabase
    .from('payment_orders')
    .select('id, type, amount, currency, status, created_at')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return { ...entity, paymentProfiles: paymentProfiles ?? [], orders: orders ?? [] }
}

export async function adminGetClientById(privyToken: string, id: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const { data: entity, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !entity) throw new Error('NOT_FOUND')

  const { data: paymentProfiles } = await supabase
    .from('payment_profiles')
    .select('*')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })

  const { data: orders } = await supabase
    .from('payment_orders')
    .select('id, type, amount, currency, status, created_at')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return { ...entity, paymentProfiles: paymentProfiles ?? [], orders: orders ?? [] }
}

export async function adminGetAllSuppliers(
  privyToken: string,
  { page = 1, search = '' } = {}
) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase
    .from('suppliers')
    .select('*, users(email)', { count: 'exact' })
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

export async function adminGetAllClients(
  privyToken: string,
  { page = 1, search = '' } = {}
) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase
    .from('clients')
    .select('*, users(email)', { count: 'exact' })
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

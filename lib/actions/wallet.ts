'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

const OTC_CANCEL_ALLOWED = ['ORDERED', 'ACEPTADO', 'POR_PAGAR']

export type WalletRequestInput = {
  type: 'CASH_IN' | 'CASH_OUT' | 'CRYPTO_WITHDRAW' | 'TOPUP' | 'WITHDRAW'
  amount: number
  currency: string
  destination_profile_id?: string
  convexo_account_id?: string
  provider_rate?: number
  initial_spread?: number
  crypto_address?: string
  metadata?: Record<string, unknown>
}

export async function getUsdCopRate(): Promise<number> {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    { next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error('Could not fetch USD/COP rate')
  const json = await res.json()
  const rate = json?.usd?.cop
  if (!rate) throw new Error('COP rate not found in response')
  return Number(rate)
}

export async function createWalletRequest(
  privyToken: string,
  data: WalletRequestInput
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const spreadPct = (data.metadata?.spread_pct as number) ?? data.initial_spread ?? 0.01
  const { data: req, error } = await supabase
    .from('wallet_requests')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      ...data,
      user_id: user.id,
      status: 'ORDERED',
      spread_pct: spreadPct,
      provider_rate: data.provider_rate ?? null,
      initial_spread: data.initial_spread ?? spreadPct,
      crypto_address: data.crypto_address ?? null,
    } as any)
    .select()
    .single()
  if (error) throw error
  return req
}

export async function uploadUserFile(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createServiceClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `user-proofs/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}

export async function markOtcAsPaid(
  privyToken: string,
  requestId: string,
  opts: { userProofUrl?: string; txnUrl?: string } = {}
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: req } = await supabase
    .from('wallet_requests')
    .select('status')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!req || req.status !== 'POR_PAGAR') throw new Error('INVALID_TRANSITION')
  const update: Record<string, unknown> = {
    status: 'REVISION',
    updated_at: new Date().toISOString(),
  }
  if (opts.userProofUrl) update.user_proof_url = opts.userProofUrl
  if (opts.txnUrl) update.txn_url = opts.txnUrl
  const { error } = await supabase
    .from('wallet_requests')
    .update(update)
    .eq('id', requestId)
  if (error) throw error
}

export async function cancelWalletRequest(
  privyToken: string,
  requestId: string
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: req } = await supabase
    .from('wallet_requests')
    .select('status')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single()
  if (!req || !OTC_CANCEL_ALLOWED.includes(req.status))
    throw new Error('INVALID_TRANSITION')
  const { error } = await supabase
    .from('wallet_requests')
    .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

export async function getWalletData(privyToken: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const [
    { data: profile },
    { data: ownProfiles },
    { data: convexoAccounts },
    { data: requests },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('usdc_balance')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('payment_profiles')
      .select('*')
      .eq('entity_type', 'USER_OWN')
      .eq('entity_id', user.id)
      .eq('is_active', true),
    supabase
      .from('convexo_accounts')
      .select('*')
      .eq('is_active', true),
    supabase
      .from('wallet_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  return {
    balance: profile?.usdc_balance ?? 0,
    ownProfiles,
    convexoAccounts,
    requests,
  }
}

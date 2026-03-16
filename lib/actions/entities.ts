'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

export type SupplierInput = {
  internal_name: string
  legal_name?: string
  company_type?: string
  registration_country?: string
  registration_number?: string
  contact_email?: string
  company_phone?: string
  contact_name?: string
  contact_phone?: string
  contact_person_email?: string
  address?: string
  state?: string
  state_code?: string
  city?: string
  postal_code?: string
  office_country?: string
  office_country_code?: string
  status?: string
}

export type ClientInput = SupplierInput

export async function createSupplier(privyToken: string, data: SupplierInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: existing } = await supabase
    .from('suppliers')
    .select('id')
    .eq('user_id', user.id)
    .eq('contact_email', data.contact_email ?? '')
    .maybeSingle()
  const warning = existing ? 'DUPLICATE_EMAIL' : null
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({ ...data, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return { supplier, warning }
}

export async function getSuppliers(
  privyToken: string,
  { page = 1, search = '' } = {}
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

export async function getSupplierById(privyToken: string, id: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateSupplier(
  privyToken: string,
  id: string,
  data: Partial<SupplierInput>
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: updated, error } = await supabase
    .from('suppliers')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error) throw error
  return updated
}

export async function createEntityClient(privyToken: string, data: ClientInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .eq('contact_email', data.contact_email ?? '')
    .maybeSingle()
  const warning = existing ? 'DUPLICATE_EMAIL' : null
  const { data: client, error } = await supabase
    .from('clients')
    .insert({ ...data, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return { client, warning }
}

export async function getClients(
  privyToken: string,
  { page = 1, search = '' } = {}
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .range(from, from + 19)
    .order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

export async function getClientById(privyToken: string, id: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateClient(
  privyToken: string,
  id: string,
  data: Partial<ClientInput>
) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: updated, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error) throw error
  return updated
}

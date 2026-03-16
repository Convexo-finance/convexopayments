'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

export type ProfileInput = {
  first_name?: string
  last_name?: string
  id_type?: string
  id_number?: string
  contact_email?: string
  phone_country_code?: string
  phone?: string
  address?: string
  state?: string
  state_code?: string
  city?: string
  country?: string
  country_code?: string
  id_doc_url?: string
  rut_url?: string
  instagram?: string
  twitter?: string
  linkedin?: string
}

export async function upsertProfile(privyToken: string, data: ProfileInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const payload = {
    ...data,
    user_id: user.id,
    updated_at: new Date().toISOString(),
    // NOTE: rut_status is NOT changed here — only requestVerification() does that
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return profile
}

export async function getProfile(privyToken: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function uploadIDDoc(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `id_docs/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}

export async function uploadRUT(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `rut/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}

/**
 * User explicitly submits their profile for admin review.
 * Requires both ID document and RUT to be uploaded first.
 */
export async function requestVerification(privyToken: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')

  const supabase = await createClient(privyToken)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id_doc_url, rut_url, rut_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.id_doc_url) throw new Error('Identity document required before requesting verification')
  if (!profile?.rut_url) throw new Error('RUT document required before requesting verification')

  await supabase
    .from('profiles')
    .update({ rut_status: 'PENDIENTE', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  const serviceSupabase = await createServiceClient()
  const { data: admins } = await serviceSupabase
    .from('users')
    .select('id')
    .eq('role', 'ADMIN')

  if (admins && admins.length > 0) {
    await serviceSupabase.from('notifications').insert(
      admins.map((admin) => ({
        user_id: admin.id,
        type: 'VERIFICATION_REQUEST',
        title: 'New verification request',
        body: `User ${user.email} has submitted their profile for verification.`,
        related_id: user.id,
        related_type: 'USER',
      }))
    )
  }
}

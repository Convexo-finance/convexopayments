import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/actions/profile'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const profile = await getProfile(privyToken).catch(() => null)

  // Already completed onboarding — send to dashboard
  if (profile?.first_name) redirect('/dashboard')

  return <OnboardingClient privyToken={privyToken} />
}

import { PrivyClient } from '@privy-io/server-auth'

export function getPrivyClient() {
  return new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!
  )
}

export async function verifyPrivyToken(token: string) {
  return getPrivyClient().verifyAuthToken(token)
}

export async function getPrivyUser(token: string) {
  return verifyPrivyToken(token)
}

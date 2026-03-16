'use client'
import { createContext, useContext } from 'react'

interface UserContextValue {
  isEnabled: boolean
}

export const UserContext = createContext<UserContextValue>({ isEnabled: false })

export function useAppUser() {
  return useContext(UserContext)
}

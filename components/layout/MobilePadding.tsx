'use client'
import { useIsMobile } from '@/lib/hooks/use-mobile'

export function MobilePadding({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ paddingBottom: isMobile ? 'calc(64px + env(safe-area-inset-bottom))' : 0 }}>
      {children}
    </div>
  )
}

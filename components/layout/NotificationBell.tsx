'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface NotificationBellProps {
  userId?: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    // Initial count
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count: c }) => setCount(c ?? 0))

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setCount((c) => c + 1)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <Link
      href="/notificaciones"
      style={{
        position: 'relative',
        width: 34,
        height: 34,
        borderRadius: 8,
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        fontSize: 16,
      }}
    >
      🔔
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#ef4444',
          }}
        />
      )}
    </Link>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { getUnreadCount, notificationsChanged } from '../../notifications/notification.api'
import { Icon } from '../icons/Icon'

export function NotificationBell() {
  const { user } = useAuth()
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!user) return
    let active = true
    let sequence = 0
    async function refresh() {
      if (document.visibilityState === 'hidden') return
      const request = ++sequence
      try {
        const result = await getUnreadCount()
        if (active && request === sequence) { setCount(result.unreadCount); setFailed(false) }
      } catch { if (active && request === sequence) setFailed(true) }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    window.addEventListener('focus', refresh)
    window.addEventListener(notificationsChanged, refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false; window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener(notificationsChanged, refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [user])
  return <Link to="/notifications" className="inline-flex items-center gap-1.5 border border-line px-2.5 py-2 text-sm font-semibold text-forest" aria-label={failed ? 'Notifications, unread count unavailable' : `Notifications${count !== null ? `, ${count} unread` : ''}`} title={failed ? 'Open notifications to retry' : 'Notifications'}>
    <Icon name="bell" className="size-4" />
    {count !== null && count > 0 && <span className="min-w-5 bg-forest px-1 text-center text-xs leading-5 text-white" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    {failed && <span aria-hidden="true">!</span>}
  </Link>
}

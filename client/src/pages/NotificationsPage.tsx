import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { announceNotificationChange, getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationInbox } from '../notifications/notification.api'

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [inbox, setInbox] = useState<NotificationInbox | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    let sequence = 0
    async function refresh() {
      const request = ++sequence
      try { const result = await getNotifications(filter); if (active && request === sequence) { setInbox(result); setError(''); announceNotificationChange() } }
      catch (reason) { if (active && request === sequence) setError(reason instanceof Error ? reason.message : 'Could not load notifications') }
    }
    void refresh()
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void refresh() }, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [filter, revision])
  async function read(id?: string) {
    setBusy(id ?? 'all'); setError('')
    try { if (id) await markNotificationRead(id); else await markAllNotificationsRead(); announceNotificationChange(); setRevision(value => value + 1) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not mark notifications as read') }
    finally { setBusy('') }
  }
  return <div className="mx-auto max-w-4xl">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-forest-light">My library account</p><h1 className="mt-1 font-serif text-3xl sm:text-4xl">Notifications</h1><p className="mt-2 text-sm text-muted">Due dates, waitlist updates, renewals, and book condition notices.</p></header>
    <div className="mt-6 flex flex-wrap items-center gap-3 border border-line bg-surface p-4">
      <label className="text-sm font-medium">Show <select className="ml-2 border border-line bg-white px-3 py-2" value={filter} onChange={event => { setInbox(null); setFilter(event.target.value as 'all' | 'unread') }}><option value="all">All notices</option><option value="unread">Unread</option></select></label>
      <p className="text-sm text-muted" role="status">{inbox ? `${inbox.unreadCount} unread` : 'Loading notifications…'}</p>
      <button className="text-sm font-semibold text-forest hover:underline disabled:opacity-50 sm:ml-auto" disabled={!!busy || !inbox?.unreadCount} onClick={() => void read()}>Mark all as read</button>
      <button className="text-sm font-semibold text-forest hover:underline" onClick={() => setRevision(value => value + 1)}>Refresh</button>
    </div>
    {error && <p className="mt-4 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
    {inbox && (inbox.items.length ? <ul className="mt-5 space-y-3">{inbox.items.map(item => <li key={item.id} className={`border bg-surface p-4 sm:p-5 ${item.readAt ? 'border-line' : 'border-forest'}`}>
      <div className="flex flex-wrap items-baseline gap-2"><h2 className="font-serif text-xl">{item.title}</h2>{!item.readAt && <span className="bg-forest px-2 py-0.5 text-xs font-semibold text-white">Unread</span>}</div>
      <p className="mt-2 break-words text-sm leading-6 text-muted">{item.message}</p><time className="mt-2 block text-xs text-muted" dateTime={item.createdAt}>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(item.createdAt))} · Philippine time</time>
      <div className="mt-4 flex flex-wrap gap-4"><Link to={item.link} className="text-sm font-semibold text-forest hover:underline">{item.link === '/reservations' ? 'View reservations' : item.link === '/fines' ? 'View fines' : 'View loans'}</Link>{!item.readAt && <button className="text-sm font-semibold text-forest hover:underline disabled:opacity-50" disabled={!!busy} onClick={() => void read(item.id)}>{busy === item.id ? 'Saving…' : 'Mark as read'}</button>}</div>
    </li>)}</ul> : <p className="mt-5 border border-dashed border-line p-8 text-center text-muted" role="status">{filter === 'unread' ? 'You have no unread notifications.' : 'Your library notifications will appear here.'}</p>)}
    <p className="mt-5 text-xs text-muted">Showing up to 100 recent notices. Due-date and pickup checks run every 15 minutes; this inbox refreshes every minute while open.</p>
  </div>
}

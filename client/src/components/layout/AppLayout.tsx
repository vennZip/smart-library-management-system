import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import type { UserRole } from '../../auth/auth.types'
import { Icon } from '../icons/Icon'
import { ChangePasswordDialog } from './ChangePasswordDialog'

type NavigationItem = { to: string; label: string; icon: 'home' | 'book' | 'swap' | 'bookmark' | 'wallet' | 'nodes' | 'chart'; end?: boolean; roles?: UserRole[] }
const navigation: NavigationItem[] = [
  { to: '/', label: 'Overview', icon: 'home', end: true },
  { to: '/catalog', label: 'Book catalog', icon: 'book' },
  { to: '/borrowing', label: 'Borrowing', icon: 'swap' },
  { to: '/reservations', label: 'Reservations', icon: 'bookmark' },
  { to: '/fines', label: 'Fines & payments', icon: 'wallet' },
  { to: '/analytics', label: 'Admin analytics', icon: 'chart', roles: ['admin'] },
  { to: '/dsa-lab', label: 'DSA evidence lab', icon: 'nodes', roles: ['admin', 'librarian'] },
]

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [passwordDialog, setPasswordDialog] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const visibleNavigation = navigation.filter(item => !item.roles || (role && item.roles.includes(role)))
  const activeLabel = visibleNavigation.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))?.label ?? 'Library workspace'
  const displayName = typeof user?.user_metadata.full_name === 'string' ? user.user_metadata.full_name : user?.email?.split('@')[0] ?? 'Library user'
  const initials = displayName.split(/[ ._-]/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'LU'
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', keyboard)
    }
  }, [open])

  async function handleSignOut() {
    setSignOutError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setSignOutError('Could not sign out. Please try again.')
    }
  }

  function closeNavigation() {
    setOpen(false)
    menuButtonRef.current?.focus()
  }

  return <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_248px]">
    <a className="fixed left-3 top-3 z-50 -translate-y-20 bg-surface px-4 py-2 font-semibold text-forest focus:translate-y-0" href="#main-content">Skip to main content</a>
    {open && <button className="fixed inset-0 z-20 bg-black/35 lg:hidden" aria-label="Close navigation" onClick={closeNavigation} />}
    <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur md:px-8">
        <p className="text-sm font-semibold text-ink">{activeLabel}</p>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm font-medium capitalize text-muted sm:inline">{role} account</span>
          <button ref={menuButtonRef} type="button" className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm font-semibold text-forest lg:hidden" aria-label="Open navigation" aria-controls="app-navigation" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" className="size-4" /> Menu</button>
        </div>
      </header>
      <main key={location.pathname} id="main-content" tabIndex={-1} className="w-full flex-1 animate-page-enter px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
      <footer className="border-t border-line bg-surface px-4 py-5 text-center text-xs leading-5 text-muted">
        <p>© {year} Cristobal S. Conducto Memorial Integrated National High School Library System.</p>
        <p>All rights reserved.</p>
      </footer>
    </div>
    <aside id="app-navigation" aria-label="Library navigation" className={`fixed inset-y-0 right-0 z-30 flex w-[248px] translate-x-full flex-col overflow-y-auto bg-forest px-4 py-6 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : ''}`}>
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center border border-white/30 bg-white/10"><Icon name="book" /></div>
        <div><p className="font-serif text-lg leading-tight">CSCMINHS</p><p className="text-[11px] uppercase tracking-[.16em] text-white/70">School Library</p></div>
        <button ref={closeButtonRef} type="button" className="ml-auto p-2 text-white/70 hover:text-white lg:hidden" aria-label="Close navigation menu" onClick={closeNavigation}>×</button>
      </div>
      <nav className="mt-10" aria-label="Main navigation">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[.16em] text-white/55">Workspace</p>
        <ul className="mt-3 space-y-1">{visibleNavigation.map(({ to, label, icon, end }) => <li key={to}><NavLink to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 border-r-2 px-3 py-2.5 text-sm transition ${isActive ? 'border-gold bg-white/15 text-white' : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon name={icon} className="size-[18px]" />{label}</NavLink></li>)}</ul>
      </nav>
      <div className="mt-auto border-t border-white/20 pt-5">
        <div className="flex items-center gap-3 px-2"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-forest" aria-hidden="true">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-medium capitalize">{displayName}</p><p className="text-xs capitalize text-white/60">{role}</p></div></div>
        <button className="mt-4 w-full border border-white/25 px-3 py-2 text-left text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white" type="button" onClick={() => setPasswordDialog(true)}>Change password</button>
        <button className="mt-2 w-full border border-white/25 px-3 py-2 text-left text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white" type="button" onClick={() => void handleSignOut()}>Sign out</button>
        {signOutError && <p className="mt-2 text-xs text-red-200" role="alert">{signOutError}</p>}
      </div>
    </aside>
    {passwordDialog && <ChangePasswordDialog onClose={() => setPasswordDialog(false)} />}
  </div>
}

import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Icon } from '../components/icons/Icon'

export function LoginPage() {
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard'

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
    <section className="hidden bg-forest p-12 text-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center border border-white/30 bg-white/10"><Icon name="book" /></div>
        <div><p className="font-serif text-xl">CSCMINHS</p><p className="text-xs uppercase tracking-[.16em] text-white/70">School Library</p></div>
      </div>
      <div className="my-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold">Learn · Read · Grow</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight">Cristobal S. Conducto Memorial Integrated National High School</h1>
        <p className="mt-5 max-w-xl text-white/75">A secure library workspace for students, teachers, and school library personnel.</p>
      </div>
      <p className="text-xs text-white/55">Library Management System</p>
    </section>
    <section className="flex items-center justify-center px-5 py-12 sm:px-10">
      <div className="w-full max-w-sm">
        <Link className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-forest hover:underline" to="/"><span aria-hidden="true">←</span> Back to welcome</Link>
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="grid size-10 place-items-center bg-forest text-white"><Icon name="book" /></div>
          <div><p className="font-serif text-lg leading-tight">CSCMINHS Library</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">School Library System</p></div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">Student and personnel access</p>
        <h1 className="mt-2 font-serif text-4xl">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Sign in with the email and password registered with your school library account.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div><label className="mb-2 block text-sm font-medium" htmlFor="email">Email address</label><input className="w-full border border-line bg-surface px-3 py-3 text-sm focus:border-forest" id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="student@example.com" /></div>
          <div><label className="mb-2 block text-sm font-medium" htmlFor="password">Password</label><input className="w-full border border-line bg-surface px-3 py-3 text-sm focus:border-forest" id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></div>
          {error && <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <button className="w-full bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-light disabled:cursor-wait disabled:opacity-65" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in to library'}</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-muted">Accounts and roles are managed by the school library administrator. Contact library personnel if you cannot access your account.</p>
      </div>
    </section>
  </main>
}

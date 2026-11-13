import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters for your new password.')
    if (password !== confirmation) return setError('The password confirmation does not match.')
    setSaving(true)
    try {
      await changePassword(password)
      setSaved(true)
      setPassword('')
      setConfirmation('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update your password.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="w-full animate-dialog-enter bg-surface p-5 sm:max-w-md sm:border sm:border-line sm:p-7" role="dialog" aria-modal="true" aria-labelledby="password-dialog-title">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">Account security</p><h2 id="password-dialog-title" className="mt-1 font-serif text-2xl">Change password</h2></div><button type="button" className="px-2 py-1 text-xl text-muted" aria-label="Close password dialog" onClick={onClose}>×</button></div>
      {saved ? <div className="mt-6 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><strong>Password updated.</strong><p className="mt-1">Use your new password the next time you sign in.</p><button type="button" className="mt-4 font-semibold underline" onClick={onClose}>Close</button></div> : <form className="mt-6 space-y-5" onSubmit={submit}>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="new-password">New password</label><input autoFocus id="new-password" className="w-full border border-line bg-paper px-3 py-3 text-sm" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /><p className="mt-1 text-xs text-muted">Use at least 8 characters.</p></div>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" className="w-full border border-line bg-paper px-3 py-3 text-sm" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>
        {error && <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4"><button type="button" className="border border-line px-4 py-2 text-sm font-semibold" onClick={onClose}>Cancel</button><button className="bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button></div>
      </form>}
    </section>
  </div>
}

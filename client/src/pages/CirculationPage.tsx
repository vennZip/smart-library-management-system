/* eslint-disable react-hooks/set-state-in-effect -- filters initiate data loading */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLoans, listMyLoans, recordLoanIncident, renewLoan, returnLoan } from '../circulation/circulation.api'
import type { LoanRecord, LoanState } from '../circulation/circulation.types'
import { useAuth } from '../auth/useAuth'
import { CheckoutDialog } from '../components/circulation/CheckoutDialog'
import { LoanIncidentDialog, type IncidentInput } from '../components/circulation/LoanIncidentDialog'
import { announceNotificationChange } from '../notifications/notification.api'

export function CirculationPage() {
  const { role } = useAuth()
  const staff = role === 'admin' || role === 'librarian'
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [filter, setFilter] = useState<LoanState | 'all'>(staff ? 'active' : 'all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [incident, setIncident] = useState<LoanRecord | null>(null)
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try { const result = staff ? await listLoans(filter === 'all' ? '' : filter) : await listMyLoans(filter === 'all' ? '' : filter); setLoans(result.loans) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load loans') }
    finally { setLoading(false) }
  }, [filter, staff])
  useEffect(() => { setError(''); void load() }, [load])
  async function process(loan: LoanRecord, action: 'return' | 'renew') {
    const question = action === 'return' ? `Return "${loan.bookTitle}" from ${loan.memberName}?` : `Renew "${loan.bookTitle}" for seven more days? Each loan can be renewed once, subject to waitlist and account checks.`
    if (!window.confirm(question)) return
    setBusy(loan.id); setError(''); setNotice('')
    try {
      if (action === 'return') await returnLoan(loan.id)
      else await renewLoan(loan.id)
      setNotice(action === 'return' ? 'Book returned.' : 'Loan renewed for seven days. The updated due date is shown below.')
      announceNotificationChange(); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the loan') }
    finally { setBusy('') }
  }
  async function resolve(input: IncidentInput) {
    if (!incident) return
    await recordLoanIncident(incident.id, input)
    setNotice(`Book recorded as ${input.kind}. The loan is closed; any charges appear in Fines & payments.`)
    announceNotificationChange(); await load()
  }
  const actions = (loan: LoanRecord) => <LoanActions loan={loan} staff={staff} busy={!!busy} onReturn={() => void process(loan, 'return')} onRenew={() => void process(loan, 'renew')} onIncident={() => setIncident(loan)} />
  return <div className="mx-auto max-w-[1400px]">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-forest-light">{staff ? 'Circulation desk' : 'My library account'}</p><h1 className="mt-1 font-serif text-3xl sm:text-4xl">{staff ? 'Borrowing and returns' : 'My loans'}</h1><p className="mt-2 text-sm text-muted">{staff ? 'Issue copies, renew loans, process returns, and record lost or damaged books.' : 'Review your loans and renew eligible books once for seven more days.'}</p></div>
      {staff && <button className="bg-forest px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={!!busy} onClick={() => setCheckoutOpen(true)}>Issue book</button>}
    </header>
    <section className="mt-7 grid gap-4 sm:grid-cols-3" aria-label="Loan summary"><Summary label="Displayed loans" value={loans.length} /><Summary label="Active" value={loans.filter(loan => loan.status === 'active').length} /><Summary label="Overdue" value={loans.filter(loan => loan.overdue).length} attention /></section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-4"><label className="text-sm font-medium">Show <select className="ml-2 border border-line bg-white px-3 py-2" value={filter} onChange={event => setFilter(event.target.value as LoanState | 'all')}><option value="all">All loans</option><option value="active">Active</option><option value="returned">Returned (including damaged)</option><option value="lost">Lost</option></select></label><button className="text-sm font-semibold text-forest hover:underline" onClick={() => void load()}>Refresh</button></div>
    <p className="mt-3 text-xs leading-5 text-muted">Renew before the due date. Renewals require an active account, a balance below the borrowing block, and no waitlist for the title. Dates use Philippine time.</p>
    {error && <p className="mt-4 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
    {notice && <p className="mt-4 border-l-2 border-forest bg-emerald-50 px-4 py-3 text-sm text-forest" role="status">{notice}</p>}
    {loading ? <div className="mt-5 h-32 animate-pulse border border-line bg-surface" aria-busy="true" aria-label="Loading loans" /> : loans.length ? <>
      <div className="mt-5 hidden overflow-x-auto border border-line bg-surface md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Book</th>{staff && <th className="px-5 py-3">Member</th>}<th className="px-5 py-3">Copy</th><th className="px-5 py-3">Borrowed</th><th className="px-5 py-3">Due / closed</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-line">{loans.map(loan => <tr key={loan.id}>
        <td className="max-w-xs px-5 py-4"><p className="font-medium">{loan.bookTitle}</p><p className="mt-1 text-xs text-muted">{loan.bookAuthor}</p><IncidentNote loan={loan} /></td>
        {staff && <td className="px-5 py-4"><p>{loan.memberName}</p><p className="mt-1 text-xs text-muted">{loan.memberEmail}</p></td>}
        <td className="px-5 py-4 font-mono text-xs">{loan.barcode}</td><td className="px-5 py-4 text-muted">{date(loan.borrowedAt)}</td><td className={`px-5 py-4 ${loan.overdue ? 'text-red-800' : 'text-muted'}`}>{date(loan.closedAt ?? loan.returnedAt ?? loan.dueAt)}{loan.renewalCount > 0 && <span className="mt-1 block text-xs">Renewed once</span>}</td><td className="px-5 py-4"><Status loan={loan} /></td><td className="px-5 py-4">{actions(loan)}</td>
      </tr>)}</tbody></table></div>
      <div className="mt-5 grid gap-3 md:hidden">{loans.map(loan => <article key={loan.id} className="border border-line bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-lg">{loan.bookTitle}</h2><p className="mt-1 text-sm text-muted">{loan.bookAuthor}</p></div><Status loan={loan} /></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs"><div><dt className="text-muted">Due / closed</dt><dd className="mt-1">{date(loan.closedAt ?? loan.returnedAt ?? loan.dueAt)}</dd></div><div><dt className="text-muted">Barcode</dt><dd className="mt-1 font-mono">{loan.barcode}</dd></div>{staff && <div className="col-span-2"><dt className="text-muted">Member</dt><dd className="mt-1 break-words">{loan.memberName} · {loan.memberEmail}</dd></div>}</dl>{loan.renewalCount > 0 && <p className="mt-2 text-xs text-muted">Renewed once</p>}<IncidentNote loan={loan} /><div className="mt-4">{actions(loan)}</div></article>)}</div>
    </> : <p className="mt-5 border border-dashed border-line p-10 text-center text-muted" role="status">No loans to show.</p>}
    {checkoutOpen && <CheckoutDialog onClose={() => setCheckoutOpen(false)} onComplete={load} />}
    {incident && <LoanIncidentDialog loan={incident} onClose={() => setIncident(null)} onSave={resolve} />}
  </div>
}
function LoanActions({ loan, staff, busy, onReturn, onRenew, onIncident }: { loan: LoanRecord; staff: boolean; busy: boolean; onReturn: () => void; onRenew: () => void; onIncident: () => void }) {
  if (loan.status !== 'active') return <span className="text-xs text-muted">Closed</span>
  return <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm font-semibold">
    {!loan.overdue && loan.renewalCount === 0 && <button className="text-forest hover:underline disabled:opacity-50" disabled={busy} onClick={onRenew}>Renew +7 days</button>}
    {staff && <><button className="text-forest hover:underline disabled:opacity-50" disabled={busy} onClick={onReturn}>Return</button><button className="text-red-800 hover:underline disabled:opacity-50" disabled={busy} onClick={onIncident}>Lost / damaged</button></>}
  </div>
}
function IncidentNote({ loan }: { loan: LoanRecord }) { return loan.incident && <p className="mt-2 break-words text-xs text-muted">{loan.incident.reason} · Incident charge {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(loan.incident.chargeCents / 100)}. <Link className="font-semibold text-forest underline" to="/fines">View fines</Link></p> }
function Status({ loan }: { loan: LoanRecord }) {
  const label = loan.status === 'lost' ? 'Lost' : loan.incident?.kind === 'damaged' ? 'Damaged / returned' : loan.status === 'returned' ? 'Returned' : loan.overdue ? 'Overdue' : 'Active'
  return <span className={`inline-block border px-2 py-1 text-xs font-semibold ${label === 'Lost' || label === 'Overdue' ? 'border-red-200 bg-red-50 text-red-800' : 'border-line bg-paper text-ink'}`}>{label}</span>
}
function date(value: string) { return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(value)) }
function Summary({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) { return <article className="border border-line bg-surface p-4"><p className="text-sm text-muted">{label}</p><p className={`mt-2 font-serif text-3xl ${attention && value > 0 ? 'text-red-800' : 'text-ink'}`}>{value}</p></article> }

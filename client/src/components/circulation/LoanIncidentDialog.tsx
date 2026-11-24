import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { LoanRecord } from '../../circulation/circulation.types'

export interface IncidentInput { kind: 'lost' | 'damaged'; reason: string; chargeCents: number }
export function LoanIncidentDialog({ loan, onClose, onSave }: { loan: LoanRecord; onClose: () => void; onSave: (input: IncidentInput) => Promise<void> }) {
  const [kind, setKind] = useState<'lost' | 'damaged'>('damaged')
  const [reason, setReason] = useState('')
  const [charge, setCharge] = useState('0.00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const first = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current
    element?.showModal(); first.current?.focus()
    return () => { element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!/^\d+(\.\d{1,2})?$/.test(charge) || Number(charge) > 100000) { setError('Enter a charge from PHP 0.00 to PHP 100,000.00 with at most two decimal places.'); return }
    if (reason.trim().length < 2) { setError('Enter a reason with at least two characters.'); return }
    setSaving(true)
    try { await onSave({ kind, reason: reason.trim(), chargeCents: Math.round(Number(charge) * 100) }); onClose() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not record the incident') }
    finally { setSaving(false) }
  }
  return <dialog ref={dialog} aria-labelledby="incident-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto border border-line bg-surface p-5 backdrop:bg-black/50 sm:p-7" onCancel={event => { event.preventDefault(); if (!saving) onClose() }}>
    <h2 id="incident-title" className="font-serif text-2xl">Lost or damaged book</h2><p className="mt-2 text-sm text-muted">{loan.bookTitle} · {loan.barcode} · {loan.memberName}</p>
    <form className="mt-5 space-y-4" onSubmit={event => void submit(event)}>
      <label className="block text-sm font-medium">Condition<select ref={first} className="mt-1 w-full border border-line bg-white p-2.5" value={kind} onChange={event => setKind(event.target.value as 'lost' | 'damaged')} disabled={saving}><option value="damaged">Damaged — returned for maintenance</option><option value="lost">Lost — copy not returned</option></select></label>
      <label className="block text-sm font-medium">Reason<textarea className="mt-1 w-full border border-line bg-white p-2.5" required minLength={2} maxLength={240} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} /></label>
      <label className="block text-sm font-medium">Incident charge (PHP)<input className="mt-1 w-full border border-line bg-white p-2.5" type="number" min="0" max="100000" step="0.01" required value={charge} onChange={event => setCharge(event.target.value)} disabled={saving} /></label>
      <p className="text-sm leading-6 text-muted">This closes the loan and makes the copy unavailable. Any overdue fine is added separately. Enter 0 if no incident charge applies.</p>
      {error && <p role="alert" className="border-l-2 border-red-600 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4"><button type="button" className="border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={saving} onClick={onClose}>Cancel</button><button className="bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={saving}>{saving ? 'Recording…' : 'Record and close loan'}</button></div>
    </form>
  </dialog>
}

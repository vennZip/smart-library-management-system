import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { checkout, searchAvailableCopies, searchMembers } from '../../circulation/circulation.api'
import type { AvailableCopy, MemberSummary } from '../../circulation/circulation.types'

export function CheckoutDialog({ onClose, onComplete }: { onClose: () => void; onComplete: () => Promise<void> }) {
  const [memberQuery, setMemberQuery] = useState('')
  const [copyQuery, setCopyQuery] = useState('')
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [copies, setCopies] = useState<AvailableCopy[]>([])
  const [memberId, setMemberId] = useState('')
  const [copyId, setCopyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastScan, setLastScan] = useState<Date | null>(null)
  const memberInputRef = useRef<HTMLInputElement>(null)

  const scan = useCallback(async (memberSearch = memberQuery, copySearch = copyQuery) => {
    setLoading(true)
    setError('')
    try {
      const [memberResult, copyResult] = await Promise.all([searchMembers(memberSearch), searchAvailableCopies(copySearch)])
      const eligibleMembers = memberResult.members.filter(member => member.status === 'active' && member.activeLoanCount < 5)
      setMembers(eligibleMembers)
      setCopies(copyResult.copies)
      setMemberId(current => eligibleMembers.some(member => member.id === current) ? current : eligibleMembers.length === 1 ? eligibleMembers[0].id : '')
      setCopyId(current => copyResult.copies.some(copy => copy.id === current) ? current : copyResult.copies.length === 1 ? copyResult.copies[0].id : '')
      setLastScan(new Date())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not scan members and available copies')
    } finally {
      setLoading(false)
    }
  }, [copyQuery, memberQuery])

  useEffect(() => {
    memberInputRef.current?.focus()
    const timer = window.setTimeout(() => void scan(), 250)
    return () => window.clearTimeout(timer)
  }, [scan])

  function selectScannedBarcode(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const exact = copies.find(copy => copy.barcode.toLowerCase() === copyQuery.trim().toLowerCase())
    if (exact) {
      event.preventDefault()
      setCopyId(exact.id)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!memberId || !copyId) {
      setError('Select both an eligible member and an available copy')
      return
    }
    setSaving(true)
    setError('')
    try {
      await checkout(memberId, copyId)
      await onComplete()
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout failed')
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="max-h-[92vh] w-full animate-dialog-enter overflow-y-auto bg-surface p-5 sm:max-w-3xl sm:border sm:border-line sm:p-7" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">Circulation desk</p><h2 id="checkout-title" className="mt-1 font-serif text-2xl">Issue a book</h2><p className="mt-2 text-sm text-muted">The system automatically scans eligible members and currently available barcodes.</p></div>
        <button className="px-2 py-1 text-xl text-muted" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-line bg-paper px-4 py-3 text-xs text-muted" role="status" aria-live="polite">
        <span><strong className="text-ink">{members.length}</strong> eligible members · <strong className="text-ink">{copies.length}</strong> available barcodes</span>
        <span>{loading ? 'Scanning system…' : lastScan ? `Updated ${lastScan.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to scan'}</span>
        <button type="button" className="font-semibold text-forest hover:underline disabled:opacity-50" disabled={loading} onClick={() => void scan()}>Scan again</button>
      </div>
      <form className="mt-6 space-y-6" onSubmit={submit}>
        <fieldset>
          <legend className="text-sm font-semibold">1. Select an eligible member</legend>
          <input ref={memberInputRef} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 text-sm" placeholder="Search active members by name or email" value={memberQuery} onChange={event => setMemberQuery(event.target.value)} />
          <div className="mt-2 max-h-44 overflow-y-auto border border-line" aria-busy={loading}>{members.map(member => <label key={member.id} className={`flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2.5 text-sm transition last:border-0 ${memberId === member.id ? 'bg-green-50' : 'hover:bg-paper'}`}><input type="radio" name="member" value={member.id} checked={memberId === member.id} onChange={() => setMemberId(member.id)} /><span><strong>{member.displayName}</strong><span className="block text-xs text-muted">{member.email} · {member.activeLoanCount}/5 active loans</span></span></label>)}</div>
          {!loading && members.length === 0 && <p className="mt-2 text-xs text-muted">No active members below the loan limit match this search.</p>}
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">2. Scan or select an available barcode</legend>
          <input className="mt-2 w-full border border-line bg-paper px-3 py-2.5 font-mono text-sm" placeholder="Scan barcode or type to search" value={copyQuery} onChange={event => setCopyQuery(event.target.value)} onKeyDown={selectScannedBarcode} />
          <p className="mt-1 text-xs text-muted">A hardware barcode scanner can type directly into this field. An exact barcode is selected when you press Enter.</p>
          <div className="mt-2 max-h-44 overflow-y-auto border border-line" aria-busy={loading}>{copies.map(copy => <label key={copy.id} className={`flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2.5 text-sm transition last:border-0 ${copyId === copy.id ? 'bg-green-50' : 'hover:bg-paper'}`}><input type="radio" name="copy" value={copy.id} checked={copyId === copy.id} onChange={() => setCopyId(copy.id)} /><span><strong>{copy.bookTitle}</strong><span className="block text-xs text-muted"><span className="font-mono">{copy.barcode}</span> · Shelf {copy.shelfLocation}</span></span></label>)}</div>
          {!loading && copies.length === 0 && <p className="mt-2 text-xs text-muted">No available copy barcodes match this search.</p>}
        </fieldset>
        {error && <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4"><button className="border border-line px-4 py-2 text-sm font-semibold" type="button" onClick={onClose}>Cancel</button><button className="bg-forest px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-light disabled:opacity-60" disabled={saving || loading || !memberId || !copyId}>{saving ? 'Issuing…' : 'Issue for 14 days'}</button></div>
      </form>
    </section>
  </div>
}

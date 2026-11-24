import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type { LoanRecord } from '../circulation/circulation.types.js'
import { LoanIncident, type IncidentInput } from '../domain/loan-incident.js'
import { StandardRenewalPolicy, type RenewalContext } from '../domain/renewal-policy.js'
import type { LoanLifecycleRepository } from '../repositories/loan-lifecycle.repository.js'
import { LoanLifecycleConflictError, LoanLifecycleForbiddenError, LoanLifecycleService, LoanLifecycleValidationError } from './loan-lifecycle.service.js'

const now = new Date('2026-11-24T01:00:00Z')
const student: AuthenticatedUser = { id: 'member-1', role: 'student', email: 'student@example.test' }
const staff: AuthenticatedUser = { id: 'staff-1', role: 'librarian', email: 'staff@example.test' }
const context: RenewalContext = { memberId: student.id, status: 'active', dueAt: '2026-11-25T01:00:00Z', renewalCount: 0, memberStatus: 'active', outstandingCents: 0, borrowingBlockCents: 50000, hasWaitlist: false, copyStatus: 'on_loan' }
const loan: LoanRecord = { id: 'loan-1', copyId: 'copy-1', memberId: student.id, memberName: 'Student', memberEmail: student.email, barcode: 'TEST-001', bookId: 'book-1', bookTitle: 'Algorithms', bookAuthor: 'Author', borrowedAt: '2026-11-10T01:00:00Z', dueAt: context.dueAt, returnedAt: null, status: 'active', overdue: false, renewalCount: 0, renewedAt: null, closedAt: null, incident: null }
class MemoryLifecycleRepository implements LoanLifecycleRepository {
  context: RenewalContext | null = { ...context }
  renewed = false
  input: IncidentInput | null = null
  overdueFine = 0
  failure = false
  async renewalContext() { return this.context }
  async renew() { if (this.failure) throw new Error('Loan changed; refresh and try again'); this.renewed = true; return { ...loan, renewalCount: 1 } }
  async resolutionContext() { return { dueAt: '2026-11-22T13:00:00Z', policy: { dailyRateCents: 1000, maximumFineCents: 50000, borrowingBlockCents: 50000 } } }
  async resolve(_id: string, input: IncidentInput, at: string, overdueFine: number) { this.input = input; this.overdueFine = overdueFine; return { ...loan, status: input.kind === 'lost' ? 'lost' as const : 'returned' as const, closedAt: at } }
}
test('renewal policy adds seven days to the previous due date, not the request date', () => {
  assert.equal(new StandardRenewalPolicy().nextDueDate(context, now).toISOString(), '2026-12-02T01:00:00.000Z')
})
test('renewal policy rejects every eligibility boundary', () => {
  const cases: Partial<RenewalContext>[] = [{ status: 'returned' }, { status: 'lost' }, { copyStatus: 'lost' }, { dueAt: now.toISOString() }, { dueAt: 'invalid' }, { renewalCount: 1 }, { memberStatus: 'suspended' }, { outstandingCents: 50000 }, { hasWaitlist: true }]
  for (const invalid of cases) assert.throws(() => new StandardRenewalPolicy().nextDueDate({ ...context, ...invalid }, now))
  assert.doesNotThrow(() => new StandardRenewalPolicy().nextDueDate({ ...context, outstandingCents: 49999 }, now))
})
test('renewals authorize ownership before mutation and use the policy contract', async () => {
  const repository = new MemoryLifecycleRepository()
  const service = new LoanLifecycleService(repository, new StandardRenewalPolicy(), () => now)
  await assert.rejects(() => service.renew('loan-1', { ...student, id: 'another' }), LoanLifecycleForbiddenError)
  assert.equal(repository.renewed, false)
  assert.equal((await service.renew('loan-1', student))?.renewalCount, 1)
  assert.ok(repository.renewed)
})
test('renewal rejects stale database state and missing loans without mutating', async () => {
  const repository = new MemoryLifecycleRepository(); repository.failure = true
  const service = new LoanLifecycleService(repository, new StandardRenewalPolicy(), () => now)
  await assert.rejects(() => service.renew('loan-1', staff), LoanLifecycleConflictError)
  repository.context = null
  assert.equal(await service.renew('missing', staff), null)
})
test('incident encapsulation validates charge and reason and returns an independent snapshot', () => {
  for (const chargeCents of [-1, 0.5, NaN, Infinity, 10000001, '100']) assert.throws(() => new LoanIncident({ kind: 'lost', reason: 'Lost copy', chargeCents }))
  for (const input of [{ kind: 'other', reason: 'Valid', chargeCents: 0 }, { kind: 'lost', reason: ' ', chargeCents: 0 }, { kind: 'damaged', reason: 'x'.repeat(241), chargeCents: 0 }]) assert.throws(() => new LoanIncident(input))
  const incident = new LoanIncident({ kind: 'damaged', reason: ' Torn cover ', chargeCents: 0 })
  const snapshot = incident.toInput(); snapshot.reason = 'changed'
  assert.equal(incident.toInput().reason, 'Torn cover')
})
test('only staff resolve incidents and overdue fine remains separate from the incident charge', async () => {
  const repository = new MemoryLifecycleRepository()
  const service = new LoanLifecycleService(repository, new StandardRenewalPolicy(), () => now)
  const input = { kind: 'lost', reason: 'Missing after search', chargeCents: 25000 }
  await assert.rejects(() => service.resolve('loan-1', input, student), LoanLifecycleForbiddenError)
  assert.equal(repository.input, null)
  assert.equal((await service.resolve('loan-1', input, staff))?.status, 'lost')
  assert.equal(repository.overdueFine, 2000); assert.deepEqual(repository.input, input)
})
test('malformed incident bodies and empty identifiers fail before persistence', async () => {
  const repository = new MemoryLifecycleRepository()
  const service = new LoanLifecycleService(repository)
  for (const body of [null, [], {}, 'lost']) await assert.rejects(() => service.resolve('loan-1', body, staff), LoanLifecycleValidationError)
  await assert.rejects(() => service.renew('', student), LoanLifecycleValidationError)
  assert.equal(repository.input, null)
})

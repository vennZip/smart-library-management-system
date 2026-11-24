import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import { createApp } from '../app.js'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import type { LoanRecord } from '../circulation/circulation.types.js'
import type { NotificationRecord } from '../notifications/notification.types.js'
import type { LoanLifecycleRepository } from '../repositories/loan-lifecycle.repository.js'
import { LoanLifecycleService } from '../services/loan-lifecycle.service.js'
import { NotificationService } from '../services/notification.service.js'

const loan: LoanRecord = { id: 'loan-1', copyId: 'copy-1', memberId: 'student', memberName: 'Student', memberEmail: 'student@example.test', barcode: 'TEST-001', bookId: 'book-1', bookTitle: 'Algorithms', bookAuthor: 'Author', borrowedAt: '2026-11-10T01:00:00Z', dueAt: '2099-11-25T01:00:00Z', returnedAt: null, status: 'active', overdue: false, renewalCount: 0, renewedAt: null, closedAt: null, incident: null }
const verifier: AuthVerifier = { verifyAccessToken: async token => token === 'student' || token === 'other' ? { id: token, role: 'student', email: `${token}@example.test` } : token === 'staff' ? { id: 'staff', role: 'librarian', email: 'staff@example.test' } : null }
const notices = new Map<string, NotificationRecord[]>([['student', [{ id: 'notice-1', kind: 'due_soon', title: 'Book due soon', message: 'Return Algorithms.', link: '/borrowing', createdAt: '2026-11-24T00:00:00Z', readAt: null }]], ['other', []]])
const repository: LoanLifecycleRepository = {
  renewalContext: async id => id === 'loan-1' ? { memberId: 'student', status: 'active', dueAt: loan.dueAt, renewalCount: 0, memberStatus: 'active', outstandingCents: 0, borrowingBlockCents: 50000, hasWaitlist: false, copyStatus: 'on_loan' } : null,
  renew: async () => ({ ...loan, renewalCount: 1 }),
  resolutionContext: async () => ({ dueAt: loan.dueAt, policy: { dailyRateCents: 1000, maximumFineCents: 50000, borrowingBlockCents: 50000 } }),
  resolve: async (_id, input) => ({ ...loan, status: input.kind === 'lost' ? 'lost' : 'returned' }),
}
let server: Server
let base: string
before(async () => {
  const app = createApp(verifier, undefined, undefined, undefined, undefined, undefined, undefined, undefined, () => ({ record: async () => {} }), undefined,
    () => new LoanLifecycleService(repository),
    token => new NotificationService({
      inbox: async unread => { const items = notices.get(token) ?? []; return { items: items.filter(item => !unread || !item.readAt), unreadCount: items.filter(item => !item.readAt).length } },
      unreadCount: async () => (notices.get(token) ?? []).filter(item => !item.readAt).length,
      markRead: async id => { const item = notices.get(token)?.find(item => item.id === id); if (item) item.readAt = new Date().toISOString(); return item ?? null },
      markAllRead: async () => { for (const item of notices.get(token) ?? []) item.readAt = new Date().toISOString() },
    }))
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', () => resolve()) })
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing address')
  base = `http://127.0.0.1:${address.port}`
})
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) })
function request(path: string, token = 'student', method = 'GET', body?: unknown) { return fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }) }

test('renewal endpoint requires authentication and allows owners and staff', async () => {
  assert.equal((await request('/loans/loan-1/renew', 'invalid', 'POST')).status, 401)
  assert.equal((await request('/loans/loan-1/renew', 'student', 'POST')).status, 200)
  assert.equal((await request('/loans/loan-1/renew', 'staff', 'POST')).status, 200)
  assert.equal((await request('/loans/loan-1/renew', 'other', 'POST')).status, 403)
  assert.equal((await request('/loans/missing/renew', 'student', 'POST')).status, 404)
})
test('incident endpoint enforces staff roles, input validation, and lost outcomes', async () => {
  const body = { kind: 'lost', reason: 'Not returned', chargeCents: 10000 }
  assert.equal((await request('/loans/loan-1/incident', 'student', 'POST', body)).status, 403)
  assert.equal((await request('/loans/loan-1/incident', 'staff', 'POST', null)).status, 400)
  assert.equal((await request('/loans/loan-1/incident', 'staff', 'POST', { ...body, chargeCents: -1 })).status, 400)
  const response = await request('/loans/loan-1/incident', 'staff', 'POST', body)
  assert.equal(response.status, 200)
  assert.equal((await response.json() as { loan: LoanRecord }).loan.status, 'lost')
})
test('notification endpoints protect ownership and mark-read responses update the inbox', async () => {
  assert.equal((await request('/notifications', 'invalid')).status, 401)
  assert.equal((await request('/notifications?filter=invalid')).status, 400)
  assert.equal((await request('/notifications/notice-1/read', 'other', 'PATCH')).status, 404)
  assert.equal((await request('/notifications/notice-1/read', 'student', 'PATCH')).status, 200)
  assert.equal((await (await request('/notifications/unread-count')).json() as { unreadCount: number }).unreadCount, 0)
  assert.equal((await request('/notifications/read-all', 'student', 'POST')).status, 204)
})

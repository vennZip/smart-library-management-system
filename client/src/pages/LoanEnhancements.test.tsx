// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import type { LoanRecord } from '../circulation/circulation.types'
import { listLoans, listMyLoans, recordLoanIncident, renewLoan } from '../circulation/circulation.api'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../notifications/notification.api'
import { CirculationPage } from './CirculationPage'
import { NotificationsPage } from './NotificationsPage'

vi.mock('../circulation/circulation.api', () => ({ listLoans: vi.fn(), listMyLoans: vi.fn(), returnLoan: vi.fn(), renewLoan: vi.fn(), recordLoanIncident: vi.fn() }))
vi.mock('../notifications/notification.api', () => ({ announceNotificationChange: vi.fn(), getNotifications: vi.fn(), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const loan: LoanRecord = { id: 'loan-1', copyId: 'copy-1', memberId: 'student', memberName: 'Student', memberEmail: 'student@example.test', barcode: 'TEST-001', bookId: 'book-1', bookTitle: 'Algorithms', bookAuthor: 'Author', borrowedAt: '2026-11-10T01:00:00Z', dueAt: '2099-11-25T01:00:00Z', returnedAt: null, status: 'active', overdue: false, renewalCount: 0, renewedAt: null, closedAt: null, incident: null }
const auth: AuthContextValue = { session: null, user: null, role: 'student', loading: false, signIn: async () => {}, changePassword: async () => {}, signOut: async () => {} }
let container: HTMLDivElement
let root: Root
async function render(page: 'loans' | 'notifications', role: 'student' | 'librarian' = 'student') {
  await act(async () => root.render(<AuthContext.Provider value={{ ...auth, role }}><MemoryRouter>{page === 'loans' ? <CirculationPage /> : <NotificationsPage />}</MemoryRouter></AuthContext.Provider>))
}
function button(label: string) { const item = [...container.querySelectorAll('button')].find(item => item.textContent === label); if (!item) throw new Error(`Missing button ${label}`); return item }
async function change(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value)
  await act(async () => { element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) })
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
  vi.mocked(listLoans).mockResolvedValue({ loans: [loan] }); vi.mocked(listMyLoans).mockResolvedValue({ loans: [loan] })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks() })

test('students can renew their own loan without seeing staff incident/return controls', async () => {
  await render('loans')
  expect(container.textContent).not.toContain('Lost / damaged')
  vi.mocked(renewLoan).mockResolvedValue({ loan: { ...loan, renewalCount: 1 } })
  vi.mocked(listMyLoans).mockResolvedValue({ loans: [{ ...loan, renewalCount: 1 }] })
  await act(async () => button('Renew +7 days').click())
  expect(renewLoan).toHaveBeenCalledWith('loan-1')
  expect(container.textContent).toContain('Renewed once')
  expect([...container.querySelectorAll('button')].some(item => item.textContent === 'Renew +7 days')).toBe(false)
})
test('staff incident form submits exact centavos and closes after a successful save', async () => {
  await render('loans', 'librarian')
  await act(async () => button('Lost / damaged').click())
  const dialog = container.querySelector('dialog')!
  expect(document.activeElement).toBe(dialog.querySelector('select'))
  await change(dialog.querySelector('select')!, 'lost')
  await change(dialog.querySelector('textarea')!, 'Missing after search')
  await change(dialog.querySelector('input')!, '0.29')
  vi.mocked(recordLoanIncident).mockResolvedValue({ loan: { ...loan, status: 'lost' } })
  vi.mocked(listLoans).mockResolvedValue({ loans: [] })
  await act(async () => { dialog.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(recordLoanIncident).toHaveBeenCalledWith('loan-1', { kind: 'lost', reason: 'Missing after search', chargeCents: 29 })
  expect(container.querySelector('dialog')).toBeNull()
  expect(container.textContent).toContain('Book recorded as lost')
})
test('Escape closes the incident dialog and restores focus to its trigger', async () => {
  await render('loans', 'librarian')
  const trigger = button('Lost / damaged'); trigger.focus()
  await act(async () => trigger.click())
  await act(async () => { container.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })) })
  expect(container.querySelector('dialog')).toBeNull(); expect(document.activeElement).toBe(trigger)
})
test('a failed incident request preserves the form and shows an accessible error', async () => {
  await render('loans', 'librarian'); await act(async () => button('Lost / damaged').click())
  const dialog = container.querySelector('dialog')!
  await change(dialog.querySelector('textarea')!, 'Torn cover')
  vi.mocked(recordLoanIncident).mockRejectedValue(new Error('Loan is already closed'))
  await act(async () => { dialog.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(dialog.querySelector('[role="alert"]')?.textContent).toBe('Loan is already closed')
  expect(dialog.querySelector('textarea')?.value).toBe('Torn cover')
})
test('notification inbox marks notices as read and supports the unread filter', async () => {
  const notification = { id: 'notice-1', kind: 'due_soon', title: 'Book due soon', message: 'Return Algorithms.', link: '/borrowing' as const, createdAt: '2026-11-24T00:00:00Z', readAt: null }
  vi.mocked(getNotifications).mockResolvedValue({ items: [notification], unreadCount: 1 })
  await render('notifications')
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/borrowing')
  vi.mocked(markNotificationRead).mockResolvedValue({ notification: { ...notification, readAt: '2026-11-24T01:00:00Z' } })
  vi.mocked(getNotifications).mockResolvedValue({ items: [{ ...notification, readAt: '2026-11-24T01:00:00Z' }], unreadCount: 0 })
  await act(async () => button('Mark as read').click())
  expect(markNotificationRead).toHaveBeenCalledWith('notice-1')
  expect(container.textContent).toContain('0 unread')
  vi.mocked(getNotifications).mockResolvedValue({ items: [], unreadCount: 0 })
  await change(container.querySelector('select')!, 'unread')
  expect(getNotifications).toHaveBeenLastCalledWith('unread')
  expect(container.textContent).toContain('You have no unread notifications.')
})
test('mark all read refreshes the unread count', async () => {
  vi.mocked(getNotifications).mockResolvedValue({ items: [], unreadCount: 2 })
  vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined)
  await render('notifications')
  vi.mocked(getNotifications).mockResolvedValue({ items: [], unreadCount: 0 })
  await act(async () => button('Mark all as read').click())
  expect(markAllNotificationsRead).toHaveBeenCalledOnce()
  expect(container.textContent).toContain('0 unread')
})

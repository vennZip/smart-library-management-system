import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { NotificationRepository } from '../repositories/notification.repository.js'
import { NotificationService, NotificationValidationError } from './notification.service.js'

test('notification service supports unread filtering and rejects invalid filters', async () => {
  const received: boolean[] = []
  const repository: NotificationRepository = { inbox: async unread => { received.push(unread); return { items: [], unreadCount: 0 } }, unreadCount: async () => 0, markRead: async () => null, markAllRead: async () => {} }
  const service = new NotificationService(repository)
  await service.inbox('unread'); await service.inbox(undefined)
  assert.deepEqual(received, [true, false])
  assert.throws(() => service.inbox('other'), NotificationValidationError)
  assert.throws(() => service.markRead(''), NotificationValidationError)
  assert.equal(await service.markRead('missing'), null)
})

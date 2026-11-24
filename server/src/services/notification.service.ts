import type { NotificationRepository } from '../repositories/notification.repository.js'
export class NotificationValidationError extends Error {}
export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}
  inbox(raw: unknown) {
    if (raw !== undefined && raw !== 'all' && raw !== 'unread') throw new NotificationValidationError('Filter must be all or unread')
    return this.repository.inbox(raw === 'unread')
  }
  unreadCount() { return this.repository.unreadCount() }
  markRead(rawId: unknown) {
    if (typeof rawId !== 'string' || !rawId.trim() || rawId.length > 100) throw new NotificationValidationError('A notification ID is required')
    return this.repository.markRead(rawId.trim())
  }
  markAllRead() { return this.repository.markAllRead() }
}

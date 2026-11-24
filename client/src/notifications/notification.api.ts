import { apiRequest } from '../lib/api'
export interface NotificationRecord { id: string; kind: string; title: string; message: string; link: '/borrowing' | '/reservations' | '/fines'; createdAt: string; readAt: string | null }
export interface NotificationInbox { items: NotificationRecord[]; unreadCount: number }
export const notificationsChanged = 'library:notifications-changed'
export function announceNotificationChange() { window.dispatchEvent(new Event(notificationsChanged)) }
export function getNotifications(filter: 'all' | 'unread') { return apiRequest<NotificationInbox>(`/api/notifications?filter=${filter}`) }
export function getUnreadCount() { return apiRequest<{ unreadCount: number }>('/api/notifications/unread-count') }
export function markNotificationRead(id: string) { return apiRequest<{ notification: NotificationRecord }>(`/api/notifications/${id}/read`, { method: 'PATCH' }) }
export function markAllNotificationsRead() { return apiRequest<void>('/api/notifications/read-all', { method: 'POST' }) }

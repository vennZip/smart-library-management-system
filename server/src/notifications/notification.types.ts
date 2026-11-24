export type NotificationKind = 'due_soon' | 'due_today' | 'overdue' | 'waitlist_joined' | 'waitlist_ready' | 'waitlist_expired' | 'renewed' | 'incident'
export interface NotificationRecord { id: string; kind: NotificationKind; title: string; message: string; link: string; createdAt: string; readAt: string | null }
export interface NotificationInbox { items: NotificationRecord[]; unreadCount: number }

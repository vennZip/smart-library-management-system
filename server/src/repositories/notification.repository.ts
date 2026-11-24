import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'
import type { NotificationInbox, NotificationKind, NotificationRecord } from '../notifications/notification.types.js'

export interface NotificationRepository {
  inbox(unreadOnly: boolean): Promise<NotificationInbox>
  unreadCount(): Promise<number>
  markRead(id: string): Promise<NotificationRecord | null>
  markAllRead(): Promise<void>
}
type NotificationRow = { id: string; kind: NotificationKind; title: string; message: string; link: string; created_at: string; read_at: string | null }
function map(row: NotificationRow): NotificationRecord { return { id: row.id, kind: row.kind, title: row.title, message: row.message, link: row.link, createdAt: row.created_at, readAt: row.read_at } }
export class SupabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async refresh() {
    const { error } = await this.client.rpc('refresh_my_notifications')
    if (error) throw new Error(`Notification refresh failed: ${error.message}`)
  }
  private async count() {
    const { count, error } = await this.client.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
    if (error) throw new Error(error.message)
    return count ?? 0
  }
  async inbox(unreadOnly: boolean) {
    await this.refresh()
    let query = this.client.from('notifications').select('id,kind,title,message,link,created_at,read_at').order('created_at', { ascending: false }).order('id').limit(100)
    if (unreadOnly) query = query.is('read_at', null)
    const [{ data, error }, unreadCount] = await Promise.all([query, this.count()])
    if (error) throw new Error(error.message)
    return { items: (data as NotificationRow[]).map(map), unreadCount }
  }
  async unreadCount() { await this.refresh(); return this.count() }
  async markRead(id: string) {
    // Keep the first read timestamp when an action is retried.
    const { error } = await this.client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null)
    if (error) throw new Error(error.message)
    const { data, error: lookupError } = await this.client.from('notifications').select('id,kind,title,message,link,created_at,read_at').eq('id', id).maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    return data ? map(data as NotificationRow) : null
  }
  async markAllRead() {
    const { error } = await this.client.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
    if (error) throw new Error(error.message)
  }
}
export function createNotificationRepository(token: string) { return new SupabaseNotificationRepository(createSupabaseUserClient(token)) }

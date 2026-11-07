import type { User } from '@supabase/supabase-js'
export const userRoles=['admin','librarian','student'] as const
export type UserRole=(typeof userRoles)[number]
export function roleFromUser(user:User):UserRole{const role:unknown=user.app_metadata.role;return typeof role==='string'&&userRoles.includes(role as UserRole)?role as UserRole:'student'}

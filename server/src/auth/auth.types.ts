export const userRoles = ['admin', 'librarian', 'student'] as const
export type UserRole = (typeof userRoles)[number]

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole)
}

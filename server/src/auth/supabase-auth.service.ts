import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { isUserRole, type AuthenticatedUser } from './auth.types.js'

export interface AuthVerifier {
  verifyAccessToken(accessToken: string): Promise<AuthenticatedUser | null>
}

export class SupabaseAuthService implements AuthVerifier {
  readonly #client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.#client = client
  }

  async verifyAccessToken(accessToken: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.#client.auth.getUser(accessToken)
    if (error || !data.user) return null
    return this.toAuthenticatedUser(data.user)
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    const claimedRole: unknown = user.app_metadata.role
    return {
      id: user.id,
      email: user.email ?? 'unknown',
      role: isUserRole(claimedRole) ? claimedRole : 'student',
    }
  }
}

export function createSupabaseAuthService(): SupabaseAuthService {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for authenticated routes')
  return new SupabaseAuthService(createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }))
}

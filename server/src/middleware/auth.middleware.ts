import type { NextFunction, Request, Response } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import type { UserRole } from '../auth/auth.types.js'
import { sendApiError } from '../http/api-error.js'

export interface AuthenticatedRequest extends Request {
  authUser?: Awaited<ReturnType<AuthVerifier['verifyAccessToken']>>
  authToken?: string
}

export function authenticate(verifier: AuthVerifier) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> => {
    const [scheme, token] = request.header('authorization')?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) {
      sendApiError(response,401,'AUTH_REQUIRED','A Bearer access token is required')
      return
    }
    try {
      const user = await verifier.verifyAccessToken(token)
      if (!user) {
        sendApiError(response,401,'AUTH_INVALID','The access token is invalid or expired')
        return
      }
      request.authUser = user
      request.authToken = token
      next()
    } catch {
      sendApiError(response,503,'AUTH_UNAVAILABLE','Authentication service unavailable')
    }
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    const user = request.authUser
    if (!user) {
      sendApiError(response,401,'AUTH_REQUIRED','Authentication required')
      return
    }
    if (!allowedRoles.includes(user.role)) {
      sendApiError(response,403,'FORBIDDEN','You do not have permission to access this resource')
      return
    }
    next()
  }
}

import type { NextFunction, Request, Response } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import type { UserRole } from '../auth/auth.types.js'

export interface AuthenticatedRequest extends Request {
  authUser?: Awaited<ReturnType<AuthVerifier['verifyAccessToken']>>
}

export function authenticate(verifier: AuthVerifier) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> => {
    const [scheme, token] = request.header('authorization')?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) {
      response.status(401).json({ message: 'A Bearer access token is required' })
      return
    }
    try {
      const user = await verifier.verifyAccessToken(token)
      if (!user) {
        response.status(401).json({ message: 'The access token is invalid or expired' })
        return
      }
      request.authUser = user
      next()
    } catch {
      response.status(503).json({ message: 'Authentication service unavailable' })
    }
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    const user = request.authUser
    if (!user) {
      response.status(401).json({ message: 'Authentication required' })
      return
    }
    if (!allowedRoles.includes(user.role)) {
      response.status(403).json({ message: 'You do not have permission to access this resource' })
      return
    }
    next()
  }
}

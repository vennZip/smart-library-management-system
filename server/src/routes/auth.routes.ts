import { Router } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.middleware.js'

export function createAuthRouter(verifier: AuthVerifier): Router {
  const router = Router()
  router.get('/me', authenticate(verifier), (request: AuthenticatedRequest, response) => response.json({ user: request.authUser }))
  router.get('/staff-check', authenticate(verifier), authorize('admin', 'librarian'), (request: AuthenticatedRequest, response) => response.json({ user: request.authUser }))
  return router
}

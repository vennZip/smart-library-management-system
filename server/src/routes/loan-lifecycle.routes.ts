import { Router, type Response } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import { sendApiError } from '../http/api-error.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.middleware.js'
import { LoanLifecycleConflictError, LoanLifecycleForbiddenError, LoanLifecycleValidationError, type LoanLifecycleService } from '../services/loan-lifecycle.service.js'

export type LoanLifecycleServiceFactory = (token: string) => LoanLifecycleService
function handle(error: unknown, response: Response) {
  if (error instanceof LoanLifecycleValidationError) { sendApiError(response, 400, 'VALIDATION_FAILED', error.message); return }
  if (error instanceof LoanLifecycleForbiddenError) { sendApiError(response, 403, 'FORBIDDEN', error.message); return }
  if (error instanceof LoanLifecycleConflictError) { sendApiError(response, 409, 'CIRCULATION_CONFLICT', error.message); return }
  console.error(error); sendApiError(response, 500, 'CIRCULATION_FAILED', 'Circulation operation failed')
}
export function createLoanLifecycleRouter(verifier: AuthVerifier, factory: LoanLifecycleServiceFactory) {
  const router = Router()
  router.use('/loans', authenticate(verifier))
  router.post('/loans/:id/renew', async (request: AuthenticatedRequest, response) => {
    try {
      if (!request.authToken || !request.authUser) throw new Error('Missing identity')
      const loan = await factory(request.authToken).renew(request.params.id, request.authUser)
      if (!loan) { sendApiError(response, 404, 'LOAN_NOT_FOUND', 'Loan not found'); return }
      response.json({ loan })
    } catch (error) { handle(error, response) }
  })
  router.post('/loans/:id/incident', authorize('admin', 'librarian'), async (request: AuthenticatedRequest, response) => {
    try {
      if (!request.authToken || !request.authUser) throw new Error('Missing identity')
      const loan = await factory(request.authToken).resolve(request.params.id, request.body as unknown, request.authUser)
      if (!loan) { sendApiError(response, 404, 'LOAN_NOT_FOUND', 'Active loan not found'); return }
      response.json({ loan })
    } catch (error) { handle(error, response) }
  })
  return router
}

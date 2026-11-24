import { Router, type Response } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import { sendApiError } from '../http/api-error.js'
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js'
import { NotificationValidationError, type NotificationService } from '../services/notification.service.js'

export type NotificationServiceFactory = (token: string) => NotificationService
function handle(error: unknown, response: Response) {
  if (error instanceof NotificationValidationError) { sendApiError(response, 400, 'VALIDATION_FAILED', error.message); return }
  console.error(error); sendApiError(response, 500, 'NOTIFICATION_FAILED', 'Notification operation failed')
}
export function createNotificationRouter(verifier: AuthVerifier, factory: NotificationServiceFactory) {
  const router = Router()
  router.use('/notifications', authenticate(verifier))
  function service(request: AuthenticatedRequest) { if (!request.authToken) throw new Error('Missing identity'); return factory(request.authToken) }
  router.get('/notifications', async (request: AuthenticatedRequest, response) => {
    try { response.json(await service(request).inbox(request.query.filter)) } catch (error) { handle(error, response) }
  })
  router.get('/notifications/unread-count', async (request: AuthenticatedRequest, response) => {
    try { response.json({ unreadCount: await service(request).unreadCount() }) } catch (error) { handle(error, response) }
  })
  router.patch('/notifications/:id/read', async (request: AuthenticatedRequest, response) => {
    try {
      const notification = await service(request).markRead(request.params.id)
      if (!notification) { sendApiError(response, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found'); return }
      response.json({ notification })
    } catch (error) { handle(error, response) }
  })
  router.post('/notifications/read-all', async (request: AuthenticatedRequest, response) => {
    try { await service(request).markAllRead(); response.status(204).end() } catch (error) { handle(error, response) }
  })
  return router
}

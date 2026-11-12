import { Router } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import { sendApiError } from '../http/api-error.js'
import { authenticate,authorize,type AuthenticatedRequest } from '../middleware/auth.middleware.js'
import type { AnalyticsService } from '../services/analytics.service.js'
export type AnalyticsServiceFactory=(token:string)=>AnalyticsService
export function createAnalyticsRouter(verifier:AuthVerifier,factory:AnalyticsServiceFactory):Router{const router=Router();router.use(authenticate(verifier),authorize('admin'));router.get('/admin/analytics',async(request:AuthenticatedRequest,response)=>{try{if(!request.authToken)throw new Error('Authenticated request is missing its token');response.json(await factory(request.authToken).getSummary())}catch(error){console.error(error);sendApiError(response,500,'ANALYTICS_FAILED','Analytics could not be generated')}});return router}

import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.routes.js'
import { createAuthRouter } from './routes/auth.routes.js'
import { createSupabaseAuthService, type AuthVerifier } from './auth/supabase-auth.service.js'
import { createCatalogRouter, type CatalogServiceFactory } from './routes/catalog.routes.js'
import { createCatalogRepository } from './repositories/catalog.repository.js'
import { CatalogService } from './services/catalog.service.js'
import { createCopyRouter,type CopyServiceFactory } from './routes/copy.routes.js'
import { createCopyRepository } from './repositories/copy.repository.js'
import { CopyService } from './services/copy.service.js'
import { createCirculationRouter,type CirculationServiceFactory } from './routes/circulation.routes.js'
import { createCirculationRepository } from './repositories/circulation.repository.js'
import { CirculationService } from './services/circulation.service.js'
import { createReservationRouter,type ReservationServiceFactory } from './routes/reservation.routes.js'
import { createReservationRepository } from './repositories/reservation.repository.js'
import { ReservationService } from './services/reservation.service.js'
import { createFineRouter,type FineServiceFactory } from './routes/fine.routes.js'
import { createFineRepository } from './repositories/fine.repository.js'
import { FineService } from './services/fine.service.js'
import { createDsaRouter,type DsaServiceFactory } from './routes/dsa.routes.js'
import { createDsaRepository } from './repositories/dsa.repository.js'
import { DsaService } from './services/dsa.service.js'
import { createAnalyticsRouter, type AnalyticsServiceFactory } from './routes/analytics.routes.js'
import { createAnalyticsRepository } from './repositories/analytics.repository.js'
import { AnalyticsService } from './services/analytics.service.js'
import { createAuditMiddleware,rateLimit,requestContext,securityHeaders,structuredLogger,type AuditRepositoryFactory } from './middleware/production.middleware.js'
import { sendApiError } from './http/api-error.js'
import type { NextFunction,Request,Response } from 'express'
import { createAccountsRouter,type AccountsServiceFactory } from './routes/accounts.routes.js'
import { createAccountsRepository } from './repositories/accounts.repository.js'
import { AccountsService } from './services/accounts.service.js'

export function createApp(authVerifier?:AuthVerifier,catalogFactory?:CatalogServiceFactory,copyFactory?:CopyServiceFactory,circulationFactory?:CirculationServiceFactory,reservationFactory?:ReservationServiceFactory,fineFactory?:FineServiceFactory,dsaFactory?:DsaServiceFactory,analyticsFactory?:AnalyticsServiceFactory,auditFactory?:AuditRepositoryFactory,accountsFactory?:AccountsServiceFactory) {
const app=express()
const verifier=authVerifier??createSupabaseAuthService()
const serviceFactory=catalogFactory??((token:string)=>new CatalogService(createCatalogRepository(token)))
const copyServiceFactory=copyFactory??((token:string)=>new CopyService(createCopyRepository(token)))
const circulationServiceFactory=circulationFactory??((token:string)=>new CirculationService(createCirculationRepository(token)))
const reservationServiceFactory=reservationFactory??((token:string)=>new ReservationService(createReservationRepository(token)))
const fineServiceFactory=fineFactory??((token:string)=>new FineService(createFineRepository(token)))
const dsaServiceFactory=dsaFactory??((token:string)=>new DsaService(createDsaRepository(token)))
const analyticsServiceFactory=analyticsFactory??((token:string)=>new AnalyticsService(createAnalyticsRepository(token)))
const accountsServiceFactory=accountsFactory??(()=>new AccountsService(createAccountsRepository()))
const clientOrigin=process.env.CLIENT_ORIGIN??'http://localhost:5173'
app.disable('x-powered-by')
app.set('trust proxy',1)
app.use(requestContext,securityHeaders,structuredLogger,rateLimit)
app.use(cors({origin:clientOrigin,credentials:true}))
app.use(express.json({limit:'100kb'}))
app.use(createAuditMiddleware(auditFactory))
app.use('/api/health',healthRouter)
app.use('/api/auth', createAuthRouter(verifier))
app.use('/api/catalog',createCatalogRouter(verifier,serviceFactory))
app.use('/api',createCopyRouter(verifier,copyServiceFactory))
app.use('/api',createCirculationRouter(verifier,circulationServiceFactory))
app.use('/api',createReservationRouter(verifier,reservationServiceFactory))
app.use('/api',createFineRouter(verifier,fineServiceFactory))
app.use('/api',createDsaRouter(verifier,dsaServiceFactory))
app.use('/api',createAnalyticsRouter(verifier,analyticsServiceFactory))
app.use('/api',createAccountsRouter(verifier,accountsServiceFactory))
app.use((_request,response)=>{sendApiError(response,404,'ROUTE_NOT_FOUND','Route not found')})
app.use((error:unknown,_request:Request,response:Response,_next:NextFunction)=>{if(error instanceof SyntaxError){sendApiError(response,400,'INVALID_JSON','Request body must contain valid JSON');return}console.error(error);sendApiError(response,500,'INTERNAL_ERROR','An unexpected server error occurred')})
return app
}

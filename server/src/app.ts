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

export function createApp(authVerifier?:AuthVerifier,catalogFactory?:CatalogServiceFactory,copyFactory?:CopyServiceFactory,circulationFactory?:CirculationServiceFactory,reservationFactory?:ReservationServiceFactory,fineFactory?:FineServiceFactory,dsaFactory?:DsaServiceFactory) {
const app=express()
const verifier=authVerifier??createSupabaseAuthService()
const serviceFactory=catalogFactory??((token:string)=>new CatalogService(createCatalogRepository(token)))
const copyServiceFactory=copyFactory??((token:string)=>new CopyService(createCopyRepository(token)))
const circulationServiceFactory=circulationFactory??((token:string)=>new CirculationService(createCirculationRepository(token)))
const reservationServiceFactory=reservationFactory??((token:string)=>new ReservationService(createReservationRepository(token)))
const fineServiceFactory=fineFactory??((token:string)=>new FineService(createFineRepository(token)))
const dsaServiceFactory=dsaFactory??((token:string)=>new DsaService(createDsaRepository(token)))
const clientOrigin=process.env.CLIENT_ORIGIN??'http://localhost:5173'
app.use(cors({origin:clientOrigin,credentials:true}))
app.use(express.json())
app.use('/api/health',healthRouter)
app.use('/api/auth', createAuthRouter(verifier))
app.use('/api/catalog',createCatalogRouter(verifier,serviceFactory))
app.use('/api',createCopyRouter(verifier,copyServiceFactory))
app.use('/api',createCirculationRouter(verifier,circulationServiceFactory))
app.use('/api',createReservationRouter(verifier,reservationServiceFactory))
app.use('/api',createFineRouter(verifier,fineServiceFactory))
app.use('/api',createDsaRouter(verifier,dsaServiceFactory))
app.use((_request,response)=>{response.status(404).json({message:'Route not found'})})
return app
}

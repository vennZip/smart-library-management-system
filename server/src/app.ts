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

export function createApp(authVerifier?:AuthVerifier,catalogFactory?:CatalogServiceFactory,copyFactory?:CopyServiceFactory,circulationFactory?:CirculationServiceFactory) {
const app=express()
const verifier=authVerifier??createSupabaseAuthService()
const serviceFactory=catalogFactory??((token:string)=>new CatalogService(createCatalogRepository(token)))
const copyServiceFactory=copyFactory??((token:string)=>new CopyService(createCopyRepository(token)))
const circulationServiceFactory=circulationFactory??((token:string)=>new CirculationService(createCirculationRepository(token)))
const clientOrigin=process.env.CLIENT_ORIGIN??'http://localhost:5173'
app.use(cors({origin:clientOrigin,credentials:true}))
app.use(express.json())
app.use('/api/health',healthRouter)
app.use('/api/auth', createAuthRouter(verifier))
app.use('/api/catalog',createCatalogRouter(verifier,serviceFactory))
app.use('/api',createCopyRouter(verifier,copyServiceFactory))
app.use('/api',createCirculationRouter(verifier,circulationServiceFactory))
app.use((_request,response)=>{response.status(404).json({message:'Route not found'})})
return app
}

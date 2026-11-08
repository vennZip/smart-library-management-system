import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.routes.js'
import { createAuthRouter } from './routes/auth.routes.js'
import { createSupabaseAuthService, type AuthVerifier } from './auth/supabase-auth.service.js'
import { createCatalogRouter, type CatalogServiceFactory } from './routes/catalog.routes.js'
import { createCatalogRepository } from './repositories/catalog.repository.js'
import { CatalogService } from './services/catalog.service.js'

export function createApp(authVerifier?: AuthVerifier,catalogFactory?:CatalogServiceFactory) {
const app=express()
const verifier=authVerifier??createSupabaseAuthService()
const serviceFactory=catalogFactory??((token:string)=>new CatalogService(createCatalogRepository(token)))
const clientOrigin=process.env.CLIENT_ORIGIN??'http://localhost:5173'
app.use(cors({origin:clientOrigin,credentials:true}))
app.use(express.json())
app.use('/api/health',healthRouter)
app.use('/api/auth', createAuthRouter(verifier))
app.use('/api/catalog',createCatalogRouter(verifier,serviceFactory))
app.use((_request,response)=>{response.status(404).json({message:'Route not found'})})
return app
}

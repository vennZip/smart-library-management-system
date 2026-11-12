import { Router, type Response } from 'express'
import type { AuthVerifier } from '../auth/supabase-auth.service.js'
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth.middleware.js'
import { CatalogValidationError, type CatalogService } from '../services/catalog.service.js'
import { sendApiError } from '../http/api-error.js'

export type CatalogServiceFactory=(accessToken:string)=>CatalogService

function serviceFor(request:AuthenticatedRequest,factory:CatalogServiceFactory):CatalogService{
  if(!request.authToken)throw new Error('Authenticated request is missing its token')
  return factory(request.authToken)
}
function routeId(request:AuthenticatedRequest):string{
  const value=request.params.id
  return typeof value==='string'?value:''
}
function handleError(error:unknown,response:Response):void{
  if(error instanceof CatalogValidationError){sendApiError(response,400,'VALIDATION_FAILED',error.message);return}
  console.error(error);sendApiError(response,500,'CATALOG_FAILED','Catalog operation failed')
}

export function createCatalogRouter(verifier:AuthVerifier,factory:CatalogServiceFactory):Router{
  const router=Router()
  router.use(authenticate(verifier))
  router.get('/',async(request:AuthenticatedRequest,response)=>{try{const result=await serviceFor(request,factory).list({search:request.query.search,page:request.query.page,pageSize:request.query.pageSize,includeArchived:request.query.includeArchived});response.json(result)}catch(error){handleError(error,response)}})
  router.get('/:id',async(request:AuthenticatedRequest,response)=>{try{const book=await serviceFor(request,factory).get(routeId(request));if(!book){sendApiError(response,404,'BOOK_NOT_FOUND','Book not found');return}response.json({book})}catch(error){handleError(error,response)}})
  router.post('/',authorize('admin','librarian'),async(request:AuthenticatedRequest,response)=>{try{const book=await serviceFor(request,factory).create(request.body as Record<string,unknown>);response.status(201).json({book})}catch(error){handleError(error,response)}})
  router.patch('/:id',authorize('admin','librarian'),async(request:AuthenticatedRequest,response)=>{try{const book=await serviceFor(request,factory).update(routeId(request),request.body as Record<string,unknown>);if(!book){sendApiError(response,404,'BOOK_NOT_FOUND','Book not found');return}response.json({book})}catch(error){handleError(error,response)}})
  router.delete('/:id',authorize('admin','librarian'),async(request:AuthenticatedRequest,response)=>{try{const archived=await serviceFor(request,factory).archive(routeId(request));if(!archived){sendApiError(response,404,'BOOK_NOT_FOUND','Book not found or already archived');return}response.status(204).send()}catch(error){handleError(error,response)}})
  return router
}

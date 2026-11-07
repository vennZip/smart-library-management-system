import { Router } from 'express'
import { HealthService } from '../services/health.service.js'
const healthService=new HealthService()
export const healthRouter=Router()
healthRouter.get('/',(_request,response)=>{response.status(200).json(healthService.getStatus())})

import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.routes.js'
export const app=express()
const clientOrigin=process.env.CLIENT_ORIGIN??'http://localhost:5173'
app.use(cors({origin:clientOrigin,credentials:true}))
app.use(express.json())
app.use('/api/health',healthRouter)
app.use((_request,response)=>{response.status(404).json({message:'Route not found'})})

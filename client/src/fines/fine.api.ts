import { apiRequest } from '../lib/api'
import type { FineLedger,FineRecord } from './fine.types'
export function listMyFines(status=''){const query=status?`?status=${status}`:'';return apiRequest<FineLedger>(`/api/fines/me${query}`)}
export function listFines(status='',search=''){const params=new URLSearchParams();if(status)params.set('status',status);if(search)params.set('search',search);const query=params.size?`?${params}`:'';return apiRequest<FineLedger>(`/api/fines${query}`)}
export function recordPayment(id:string,amountCents:number,note:string){return apiRequest<{fine:FineRecord}>(`/api/fines/${id}/payments`,{method:'POST',body:JSON.stringify({amountCents,note})})}
export function recordAdjustment(id:string,amountCents:number,note:string){return apiRequest<{fine:FineRecord}>(`/api/fines/${id}/adjustments`,{method:'POST',body:JSON.stringify({amountCents,note})})}

import type { Response } from 'express'
export interface ApiErrorBody {error:{code:string;message:string;requestId:string;details?:unknown};message:string}
export function sendApiError(response:Response,status:number,code:string,message:string,details?:unknown):void{
  const requestId=String(response.getHeader('x-request-id')??'unknown')
  const body:ApiErrorBody={error:{code,message,requestId,...(details===undefined?{}:{details})},message}
  response.status(status).json(body)
}

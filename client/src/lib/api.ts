import { supabase } from './supabase'

const apiUrl=(import.meta.env.VITE_API_URL as string|undefined)?.replace(/\/$/,'')??''

export async function apiRequest<T>(path:string,options:RequestInit={}):Promise<T>{
  const{data:{session}}=await supabase.auth.getSession()
  if(!session)throw new Error('Your session has expired. Please sign in again.')
  const response=await fetch(`${apiUrl}${path}`,{...options,headers:{Authorization:`Bearer ${session.access_token}`,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}})
  if(response.status===204)return undefined as T
  const body=await response.json() as unknown
  if(!response.ok){const message=typeof body==='object'&&body!==null&&'message'in body&&typeof body.message==='string'?body.message:'The request could not be completed';throw new Error(message)}
  return body as T
}

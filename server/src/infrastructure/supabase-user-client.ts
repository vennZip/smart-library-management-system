import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createSupabaseUserClient(accessToken:string):SupabaseClient{
  const url=process.env.SUPABASE_URL
  const key=process.env.SUPABASE_PUBLISHABLE_KEY
  if(!url||!key)throw new Error('Supabase database configuration is missing')
  return createClient(url,key,{global:{headers:{Authorization:`Bearer ${accessToken}`}},auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}})
}

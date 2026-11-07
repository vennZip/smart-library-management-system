import type { Session } from '@supabase/supabase-js'
import { useEffect,useMemo,useState,type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { roleFromUser } from './auth.types'
import { AuthContext, type AuthContextValue } from './auth-context'
export function AuthProvider({children}:{children:ReactNode}){const[session,setSession]=useState<Session|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{let active=true;void supabase.auth.getSession().then(({data})=>{if(active){setSession(data.session);setLoading(false)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>{setSession(nextSession);setLoading(false)});return()=>{active=false;subscription.unsubscribe()}},[]);const value=useMemo<AuthContextValue>(()=>({session,user:session?.user??null,role:session?roleFromUser(session.user):null,loading,async signIn(email,password){const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error},async signOut(){const{error}=await supabase.auth.signOut();if(error)throw error}}),[loading,session]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>}

import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { UserRole } from './auth.types'

export type AuthContextValue={session:Session|null;user:User|null;role:UserRole|null;loading:boolean;signIn(email:string,password:string):Promise<void>;changePassword(password:string):Promise<void>;signOut():Promise<void>}
export const AuthContext=createContext<AuthContextValue|null>(null)

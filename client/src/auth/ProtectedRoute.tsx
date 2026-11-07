import type { ReactNode } from 'react'
import { Navigate,useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { UserRole } from './auth.types'
export function ProtectedRoute({children,allowedRoles}:{children:ReactNode;allowedRoles?:UserRole[]}){const{user,role,loading}=useAuth();const location=useLocation();if(loading)return <div className="grid min-h-screen place-items-center bg-paper" role="status"><p className="text-sm text-muted">Checking your library session…</p></div>;if(!user)return <Navigate to="/login" replace state={{from:location}}/>;if(allowedRoles&&(!role||!allowedRoles.includes(role)))return <Navigate to="/unauthorized" replace/>;return children}

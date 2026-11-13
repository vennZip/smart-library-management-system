import { apiRequest } from './lib/api'
import type { UserRole } from './auth/auth.types'
export type AccountStatus='active'|'suspended'
export interface ManagedAccount{id:string;email:string;displayName:string;role:UserRole;status:AccountStatus;createdAt:string;lastSignInAt:string|null}
export interface NewAccount{email:string;password:string;displayName:string;role:UserRole}
export function listAccounts(){return apiRequest<{accounts:ManagedAccount[]}>('/api/admin/accounts')}
export function createAccount(input:NewAccount){return apiRequest<{account:ManagedAccount}>('/api/admin/accounts',{method:'POST',body:JSON.stringify(input)})}
export function updateAccount(id:string,input:{role?:UserRole;status?:AccountStatus}){return apiRequest<{account:ManagedAccount}>(`/api/admin/accounts/${id}`,{method:'PATCH',body:JSON.stringify(input)})}
export function resetAccountPassword(id:string,password:string){return apiRequest<void>(`/api/admin/accounts/${id}/password`,{method:'POST',body:JSON.stringify({password})})}

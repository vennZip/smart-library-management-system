import { apiRequest } from '../lib/api'
import type { AvailableCopy,LoanRecord,MemberSummary } from './circulation.types'
export function listMyLoans(status=''){const query=status?`?status=${status}`:'';return apiRequest<{loans:LoanRecord[]}>(`/api/loans/me${query}`)}
export function listLoans(status='active'){return apiRequest<{loans:LoanRecord[]}>(`/api/loans?status=${status}`)}
export function searchMembers(search:string){return apiRequest<{members:MemberSummary[]}>(`/api/circulation/members?${new URLSearchParams({search})}`)}
export function searchAvailableCopies(search:string){return apiRequest<{copies:AvailableCopy[]}>(`/api/circulation/available-copies?${new URLSearchParams({search})}`)}
export function checkout(memberId:string,copyId:string){return apiRequest<{loan:LoanRecord}>('/api/loans',{method:'POST',body:JSON.stringify({memberId,copyId})})}
export function returnLoan(id:string){return apiRequest<{loan:LoanRecord}>(`/api/loans/${id}/return`,{method:'POST'})}

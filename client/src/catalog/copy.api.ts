import { apiRequest } from '../lib/api'
import type { BookCopyInput,BookCopyRecord } from './catalog.types'
function payload(input:BookCopyInput){return{...input,acquiredAt:input.acquiredAt||null}}
export function listCopies(bookId:string,search=''){const params=new URLSearchParams({search});return apiRequest<{copies:BookCopyRecord[]}>(`/api/catalog/${bookId}/copies?${params}`)}
export function createCopy(bookId:string,input:BookCopyInput){return apiRequest<{copy:BookCopyRecord}>(`/api/catalog/${bookId}/copies`,{method:'POST',body:JSON.stringify(payload(input))})}
export function updateCopy(id:string,input:BookCopyInput){return apiRequest<{copy:BookCopyRecord}>(`/api/copies/${id}`,{method:'PATCH',body:JSON.stringify(payload(input))})}
export function deleteCopy(id:string){return apiRequest<void>(`/api/copies/${id}`,{method:'DELETE'})}

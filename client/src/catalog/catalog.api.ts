import { apiRequest } from '../lib/api'
import type { BookInput, BookRecord, CatalogPage } from './catalog.types'

function payload(input:BookInput){return{...input,publicationYear:input.publicationYear?Number(input.publicationYear):null,publisher:input.publisher||null,description:input.description||null,coverUrl:input.coverUrl||null}}
export function listBooks(search:string,page:number,includeArchived=false){const params=new URLSearchParams({search,page:String(page),pageSize:'10'});if(includeArchived)params.set('includeArchived','true');return apiRequest<CatalogPage>(`/api/catalog?${params}`)}
export function getBook(id:string){return apiRequest<{book:BookRecord}>(`/api/catalog/${id}`)}
export function createBook(input:BookInput){return apiRequest<{book:BookRecord}>('/api/catalog',{method:'POST',body:JSON.stringify(payload(input))})}
export function updateBook(id:string,input:BookInput){return apiRequest<{book:BookRecord}>(`/api/catalog/${id}`,{method:'PATCH',body:JSON.stringify(payload(input))})}
export function archiveBook(id:string){return apiRequest<void>(`/api/catalog/${id}`,{method:'DELETE'})}

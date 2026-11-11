import { apiRequest } from '../lib/api'
import type { CatalogAlgorithmResult,DsaOverview,GraphTraversalResult,IdentifierValidation,TreeSearchResult } from './dsa.types'
export function getDsaOverview(){return apiRequest<DsaOverview>('/api/dsa/overview')}
export function validateIdentifiers(isbns:string[],barcodes:string[]){return apiRequest<IdentifierValidation>('/api/dsa/validate-identifiers',{method:'POST',body:JSON.stringify({isbns,barcodes})})}
export function searchTitleTree(title:string){return apiRequest<TreeSearchResult>('/api/dsa/tree-search',{method:'POST',body:JSON.stringify({title})})}
export function traverseBookGraph(bookId:string,mode:'bfs'|'dfs',maxDepth:number){return apiRequest<GraphTraversalResult>('/api/dsa/graph-traverse',{method:'POST',body:JSON.stringify({bookId,mode,maxDepth})})}
export function runCatalogAlgorithms(query:string,category:string,sortBy:'title'|'rank'){return apiRequest<CatalogAlgorithmResult>('/api/dsa/catalog-algorithms',{method:'POST',body:JSON.stringify({query,category,sortBy})})}

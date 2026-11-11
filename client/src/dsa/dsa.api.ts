import { apiRequest } from '../lib/api'
import type { DsaOverview,IdentifierValidation } from './dsa.types'
export function getDsaOverview(){return apiRequest<DsaOverview>('/api/dsa/overview')}
export function validateIdentifiers(isbns:string[],barcodes:string[]){return apiRequest<IdentifierValidation>('/api/dsa/validate-identifiers',{method:'POST',body:JSON.stringify({isbns,barcodes})})}

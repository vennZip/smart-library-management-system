import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'
export interface AuditEvent {actorId:string;actorRole:'admin'|'librarian';requestId:string;action:string;entityType:string;entityId:string|null;method:string;path:string;statusCode:number}
export interface AuditRepository {record(event:AuditEvent):Promise<void>}
export class SupabaseAuditRepository implements AuditRepository{
  readonly #client:SupabaseClient
  constructor(client:SupabaseClient){this.#client=client}
  async record(event:AuditEvent):Promise<void>{const{error}=await this.#client.from('audit_logs').insert({actor_id:event.actorId,actor_role:event.actorRole,request_id:event.requestId,action:event.action,entity_type:event.entityType,entity_id:event.entityId,method:event.method,path:event.path,status_code:event.statusCode});if(error)throw new Error(`Audit log insert failed: ${error.message}`)}
}
export function createAuditRepository(token:string){return new SupabaseAuditRepository(createSupabaseUserClient(token))}

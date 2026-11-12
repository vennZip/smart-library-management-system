import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalyticsActivity,AnalyticsSummary } from '../analytics/analytics.types.js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'

export interface AnalyticsRepository {getSummary():Promise<AnalyticsSummary>}
type AuditRow={id:string;action:string;entity_type:string;created_at:string;profiles:{display_name:string}|null}
type CountResult={count:number|null;error:{message:string}|null}
async function resolvedCount(query:PromiseLike<CountResult>,label:string):Promise<number>{const{count,error}=await query;if(error)throw new Error(`Analytics ${label} count failed: ${error.message}`);return count??0}
export class SupabaseAnalyticsRepository implements AnalyticsRepository{
  readonly #client:SupabaseClient
  constructor(client:SupabaseClient){this.#client=client}
  async getSummary():Promise<AnalyticsSummary>{
    const now=new Date().toISOString()
    const[titles,copies,available,onLoan,reserved,activeLoans,overdueLoans,returnedLoans,pendingReservations,readyReservations,members,openFines,fines,audits]=await Promise.all([
      resolvedCount(this.#client.from('books').select('id',{count:'exact',head:true}).is('archived_at',null),'books'),resolvedCount(this.#client.from('book_copies').select('id',{count:'exact',head:true}),'copies'),resolvedCount(this.#client.from('book_copies').select('id',{count:'exact',head:true}).eq('status','available'),'available copies'),resolvedCount(this.#client.from('book_copies').select('id',{count:'exact',head:true}).eq('status','on_loan'),'on-loan copies'),resolvedCount(this.#client.from('book_copies').select('id',{count:'exact',head:true}).eq('status','reserved'),'reserved copies'),resolvedCount(this.#client.from('loans').select('id',{count:'exact',head:true}).eq('status','active'),'active loans'),resolvedCount(this.#client.from('loans').select('id',{count:'exact',head:true}).eq('status','active').lt('due_at',now),'overdue loans'),resolvedCount(this.#client.from('loans').select('id',{count:'exact',head:true}).eq('status','returned'),'returned loans'),resolvedCount(this.#client.from('reservations').select('id',{count:'exact',head:true}).eq('status','pending'),'pending reservations'),resolvedCount(this.#client.from('reservations').select('id',{count:'exact',head:true}).eq('status','ready'),'ready reservations'),resolvedCount(this.#client.from('profiles').select('id',{count:'exact',head:true}).eq('status','active'),'members'),resolvedCount(this.#client.from('fines').select('id',{count:'exact',head:true}).eq('status','open'),'open fines'),this.#client.from('fines').select('balance_cents').eq('status','open'),this.#client.from('audit_logs').select('id,action,entity_type,created_at,profiles!audit_logs_actor_id_fkey(display_name)').order('created_at',{ascending:false}).limit(8)
    ])
    if(fines.error)throw new Error(`Analytics fine balance failed: ${fines.error.message}`)
    if(audits.error)throw new Error(`Analytics audit activity failed: ${audits.error.message}`)
    const outstandingCents=(fines.data as {balance_cents:number}[]).reduce((sum,row)=>sum+row.balance_cents,0)
    const recentActivity=(audits.data as unknown as AuditRow[]).map((row):AnalyticsActivity=>({id:row.id,action:row.action,entityType:row.entity_type,actorName:row.profiles?.display_name??'Library staff',createdAt:row.created_at}))
    return{generatedAt:now,collection:{titles,copies,available,onLoan,reserved,availabilityPercent:copies?Math.round(available/copies*100):0},circulation:{activeLoans,overdueLoans,returnedLoans,pendingReservations,readyReservations},accounts:{members,openFines,outstandingCents},recentActivity}
  }
}
export function createAnalyticsRepository(token:string){return new SupabaseAnalyticsRepository(createSupabaseUserClient(token))}

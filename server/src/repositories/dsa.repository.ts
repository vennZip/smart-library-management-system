import type { SupabaseClient } from '@supabase/supabase-js'
import type { DsaCatalogSource,DsaLoanSource,DsaReservationSource,DsaSnapshot } from '../dsa/dsa.types.js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'

export interface DsaRepository {loadSnapshot():Promise<DsaSnapshot>}
type LoanRow={id:string;member_id:string;borrowed_at:string;returned_at:string|null;status:'active'|'returned';profiles:{display_name:string};book_copies:{barcode:string;book_id:string;books:{title:string}}}
type ReservationRow={id:string;book_id:string;created_at:string;profiles:{display_name:string};books:{title:string}}
type CatalogRow={id:string;title:string;author:string;category:string;isbn:string;updated_at:string}
function loan(row:LoanRow):DsaLoanSource{return{id:row.id,memberId:row.member_id,bookId:row.book_copies.book_id,memberName:row.profiles.display_name,bookTitle:row.book_copies.books.title,barcode:row.book_copies.barcode,borrowedAt:row.borrowed_at,returnedAt:row.returned_at,status:row.status}}
function reservation(row:ReservationRow):DsaReservationSource{return{id:row.id,bookId:row.book_id,bookTitle:row.books.title,memberName:row.profiles.display_name,createdAt:row.created_at}}
function catalog(row:CatalogRow):DsaCatalogSource{return{id:row.id,title:row.title,author:row.author,category:row.category,isbn:row.isbn,updatedAt:row.updated_at}}

export class SupabaseDsaRepository implements DsaRepository{
  readonly #client:SupabaseClient
  constructor(client:SupabaseClient){this.#client=client}
  async loadSnapshot(){const[loans,reservations,books,copies]=await Promise.all([this.#client.from('loans').select('id,member_id,borrowed_at,returned_at,status,profiles!loans_member_id_fkey(display_name),book_copies!loans_copy_id_fkey(barcode,book_id,books(title))').order('borrowed_at',{ascending:true}).limit(500),this.#client.from('reservations').select('id,book_id,created_at,profiles!reservations_member_id_fkey(display_name),books(title)').eq('status','pending').order('created_at',{ascending:true}).limit(100),this.#client.from('books').select('id,title,author,category,isbn,updated_at').is('archived_at',null).order('updated_at',{ascending:true}).limit(100),this.#client.from('book_copies').select('barcode').order('barcode').limit(500)]);for(const result of[loans,reservations,books,copies])if(result.error)throw new Error(`DSA snapshot query failed: ${result.error.message}`);return{loans:(loans.data as unknown as LoanRow[]).map(loan),reservations:(reservations.data as unknown as ReservationRow[]).map(reservation),catalog:(books.data as unknown as CatalogRow[]).map(catalog),barcodes:(copies.data as unknown as Array<{barcode:string}>).map(item=>item.barcode)} satisfies DsaSnapshot}
}
export function createDsaRepository(token:string){return new SupabaseDsaRepository(createSupabaseUserClient(token))}

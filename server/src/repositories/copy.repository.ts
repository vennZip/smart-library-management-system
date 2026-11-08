import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookCopyInput,BookCopyRecord,CopyStatus } from '../copies/copy.types.js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'

export interface CopyRepository { listForBook(bookId:string,search:string):Promise<BookCopyRecord[]>;findById(id:string):Promise<BookCopyRecord|null>;create(bookId:string,input:BookCopyInput):Promise<BookCopyRecord>;update(id:string,input:Partial<BookCopyInput>):Promise<BookCopyRecord|null>;hasLoanHistory(id:string):Promise<boolean>;delete(id:string):Promise<boolean> }
type CopyRow={id:string;book_id:string;barcode:string;shelf_location:string;status:CopyStatus;acquired_at:string|null;created_at:string}
function mapRow(row:CopyRow):BookCopyRecord{return{id:row.id,bookId:row.book_id,barcode:row.barcode,shelfLocation:row.shelf_location,status:row.status,acquiredAt:row.acquired_at,createdAt:row.created_at}}
function databaseInput(input:Partial<BookCopyInput>){return{barcode:input.barcode,shelf_location:input.shelfLocation,status:input.status,acquired_at:input.acquiredAt}}

export class SupabaseCopyRepository implements CopyRepository{
  readonly #client:SupabaseClient
  constructor(client:SupabaseClient){this.#client=client}
  async listForBook(bookId:string,search:string){let request=this.#client.from('book_copies').select('id,book_id,barcode,shelf_location,status,acquired_at,created_at').eq('book_id',bookId).order('barcode');if(search){const escaped=search.replaceAll('%','\\%').replaceAll(',',' ');request=request.or(`barcode.ilike.%${escaped}%,shelf_location.ilike.%${escaped}%`)}const{data,error}=await request;if(error)throw new Error(`Copy query failed: ${error.message}`);return(data as CopyRow[]).map(mapRow)}
  async findById(id:string){const{data,error}=await this.#client.from('book_copies').select('id,book_id,barcode,shelf_location,status,acquired_at,created_at').eq('id',id).maybeSingle();if(error)throw new Error(`Copy lookup failed: ${error.message}`);return data?mapRow(data as CopyRow):null}
  async create(bookId:string,input:BookCopyInput){const{data,error}=await this.#client.from('book_copies').insert({book_id:bookId,...databaseInput(input)}).select('id,book_id,barcode,shelf_location,status,acquired_at,created_at').single();if(error)throw new Error(`Copy creation failed: ${error.message}`);return mapRow(data as CopyRow)}
  async update(id:string,input:Partial<BookCopyInput>){const{data,error}=await this.#client.from('book_copies').update(databaseInput(input)).eq('id',id).select('id,book_id,barcode,shelf_location,status,acquired_at,created_at').maybeSingle();if(error)throw new Error(`Copy update failed: ${error.message}`);return data?mapRow(data as CopyRow):null}
  async hasLoanHistory(id:string){const{count,error}=await this.#client.from('loans').select('id',{count:'exact',head:true}).eq('copy_id',id);if(error)throw new Error(`Loan history check failed: ${error.message}`);return(count??0)>0}
  async delete(id:string){const{data,error}=await this.#client.from('book_copies').delete().eq('id',id).select('id').maybeSingle();if(error)throw new Error(`Copy deletion failed: ${error.message}`);return data!==null}
}
export function createCopyRepository(accessToken:string){return new SupabaseCopyRepository(createSupabaseUserClient(accessToken))}

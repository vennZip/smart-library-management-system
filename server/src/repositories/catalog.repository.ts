import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookInput, BookRecord, CatalogPage, CatalogQuery } from '../catalog/catalog.types.js'
import { createSupabaseUserClient } from '../infrastructure/supabase-user-client.js'

export interface CatalogRepository {
  list(query: CatalogQuery): Promise<CatalogPage>
  findById(id: string): Promise<BookRecord | null>
  create(input: BookInput): Promise<BookRecord>
  update(id: string, input: Partial<BookInput>): Promise<BookRecord | null>
  archive(id: string): Promise<boolean>
}

type BookRow = {
  id:string; isbn:string; title:string; author:string; publisher:string|null; publication_year:number|null;
  category:string; description:string|null; cover_url:string|null; archived_at:string|null;
  book_copies?: { status:string }[]
}

function mapRow(row: BookRow): BookRecord {
  const copies=row.book_copies??[]
  return {id:row.id,isbn:row.isbn,title:row.title,author:row.author,publisher:row.publisher,publicationYear:row.publication_year,category:row.category,description:row.description,coverUrl:row.cover_url,archivedAt:row.archived_at,totalCopies:copies.length,availableCopies:copies.filter(copy=>copy.status==='available').length}
}

function toDatabaseInput(input: Partial<BookInput>) {
  return {isbn:input.isbn,title:input.title,author:input.author,publisher:input.publisher,publication_year:input.publicationYear,category:input.category,description:input.description,cover_url:input.coverUrl}
}

export class SupabaseCatalogRepository implements CatalogRepository {
  readonly #client: SupabaseClient
  constructor(client: SupabaseClient){this.#client=client}

  async list(query: CatalogQuery): Promise<CatalogPage> {
    const from=(query.page-1)*query.pageSize
    const to=from+query.pageSize-1
    let request=this.#client.from('books').select('id,isbn,title,author,publisher,publication_year,category,description,cover_url,archived_at,book_copies(status)',{count:'exact'}).order('title').range(from,to)
    if(!query.includeArchived) request=request.is('archived_at',null)
    if(query.search){const escaped=query.search.replaceAll('%','\\%').replaceAll(',',' ');request=request.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%,isbn.ilike.%${escaped}%,category.ilike.%${escaped}%`)}
    const{data,error,count}=await request
    if(error)throw new Error(`Catalog query failed: ${error.message}`)
    const total=count??0
    return {items:(data as BookRow[]).map(mapRow),page:query.page,pageSize:query.pageSize,total,totalPages:Math.max(1,Math.ceil(total/query.pageSize))}
  }

  async findById(id:string):Promise<BookRecord|null>{const{data,error}=await this.#client.from('books').select('id,isbn,title,author,publisher,publication_year,category,description,cover_url,archived_at,book_copies(status)').eq('id',id).maybeSingle();if(error)throw new Error(`Book lookup failed: ${error.message}`);return data?mapRow(data as BookRow):null}
  async create(input:BookInput):Promise<BookRecord>{const{data,error}=await this.#client.from('books').insert(toDatabaseInput(input)).select('id,isbn,title,author,publisher,publication_year,category,description,cover_url,archived_at').single();if(error)throw new Error(`Book creation failed: ${error.message}`);return mapRow(data as BookRow)}
  async update(id:string,input:Partial<BookInput>):Promise<BookRecord|null>{const{data,error}=await this.#client.from('books').update(toDatabaseInput(input)).eq('id',id).select('id,isbn,title,author,publisher,publication_year,category,description,cover_url,archived_at').maybeSingle();if(error)throw new Error(`Book update failed: ${error.message}`);return data?mapRow(data as BookRow):null}
  async archive(id:string):Promise<boolean>{const{data,error}=await this.#client.from('books').update({archived_at:new Date().toISOString()}).eq('id',id).is('archived_at',null).select('id').maybeSingle();if(error)throw new Error(`Book archive failed: ${error.message}`);return data!==null}
}

export function createCatalogRepository(accessToken:string):SupabaseCatalogRepository{
  return new SupabaseCatalogRepository(createSupabaseUserClient(accessToken))
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookInput, BookRecord, CatalogPage, CatalogQuery } from '../catalog/catalog.types.js'
import type { CatalogRepository } from '../repositories/catalog.repository.js'
import { CatalogService, CatalogValidationError } from './catalog.service.js'

class MemoryCatalogRepository implements CatalogRepository {
  books:BookRecord[]=[]
  async list(query:CatalogQuery):Promise<CatalogPage>{const filtered=this.books.filter(book=>(query.includeArchived||!book.archivedAt)&&`${book.title} ${book.author} ${book.isbn}`.toLowerCase().includes(query.search.toLowerCase()));return{items:filtered,page:query.page,pageSize:query.pageSize,total:filtered.length,totalPages:Math.max(1,Math.ceil(filtered.length/query.pageSize))}}
  async findById(id:string){return this.books.find(book=>book.id===id)??null}
  async create(input:BookInput){const book:BookRecord={...input,publisher:input.publisher??null,publicationYear:input.publicationYear??null,description:input.description??null,coverUrl:input.coverUrl??null,id:`book-${this.books.length+1}`,archivedAt:null,totalCopies:0,availableCopies:0};this.books.push(book);return book}
  async update(id:string,input:Partial<BookInput>){const book=await this.findById(id);if(!book)return null;Object.assign(book,input);return book}
  async archive(id:string){const book=await this.findById(id);if(!book||book.archivedAt)return false;book.archivedAt=new Date().toISOString();return true}
}

const validInput={isbn:'978-0132350884',title:'Clean Code',author:'Robert Martin',category:'Software Engineering'}
test('catalog service validates and normalizes a new book',async()=>{const repository=new MemoryCatalogRepository();const book=await new CatalogService(repository).create({...validInput,title:'  Clean Code  '});assert.equal(book.title,'Clean Code');assert.equal(repository.books.length,1)})
test('catalog service rejects malformed input before repository access',()=>{const service=new CatalogService(new MemoryCatalogRepository());assert.throws(()=>service.create({...validInput,isbn:'bad'}),CatalogValidationError)})
test('catalog service constrains pagination and search input',async()=>{const repository=new MemoryCatalogRepository();const service=new CatalogService(repository);await service.create(validInput);const page=await service.list({search:'clean',page:'-2',pageSize:'500'});assert.equal(page.page,1);assert.equal(page.pageSize,50);assert.equal(page.total,1)})
test('archiving preserves the record but hides it from the active catalog',async()=>{const repository=new MemoryCatalogRepository();const service=new CatalogService(repository);const book=await service.create(validInput);assert.equal(await service.archive(book.id),true);assert.equal((await service.list({})).total,0);assert.equal((await service.list({includeArchived:true})).total,1)})

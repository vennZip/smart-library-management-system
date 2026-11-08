import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import { createApp } from './app.js'
import type { AuthVerifier } from './auth/supabase-auth.service.js'
import type { CatalogRepository } from './repositories/catalog.repository.js'
import { CatalogService } from './services/catalog.service.js'
import type { BookInput, BookRecord, CatalogQuery } from './catalog/catalog.types.js'
import type { CopyRepository } from './repositories/copy.repository.js'
import type { BookCopyInput,BookCopyRecord } from './copies/copy.types.js'
import { CopyService } from './services/copy.service.js'
const verifier: AuthVerifier = { verifyAccessToken: async token => token === 'staff-token' ? { id: 'user-1', email: 'staff@example.edu', role: 'librarian' } : token === 'student-token' ? { id: 'user-2', email: 'student@example.edu', role: 'student' } : null }
const catalogBook:BookRecord={id:'book-1',isbn:'978-0132350884',title:'Clean Code',author:'Robert Martin',publisher:null,publicationYear:2008,category:'Software Engineering',description:null,coverUrl:null,archivedAt:null,totalCopies:2,availableCopies:1}
const catalogRepository:CatalogRepository={list:async(query:CatalogQuery)=>({items:[catalogBook],page:query.page,pageSize:query.pageSize,total:1,totalPages:1}),findById:async id=>id===catalogBook.id?catalogBook:null,create:async(input:BookInput)=>({...catalogBook,...input}),update:async(id,input)=>id===catalogBook.id?{...catalogBook,...input}:null,archive:async id=>id===catalogBook.id}
const inventoryCopy:BookCopyRecord={id:'copy-1',bookId:'book-1',barcode:'NB-0001',shelfLocation:'A-12',status:'available',acquiredAt:null,createdAt:'2026-11-08T00:00:00Z'}
const copyRepository:CopyRepository={listForBook:async()=>[inventoryCopy],findById:async id=>id===inventoryCopy.id?inventoryCopy:null,create:async(bookId:string,input:BookCopyInput)=>({...inventoryCopy,...input,bookId}),update:async(id,input)=>id===inventoryCopy.id?{...inventoryCopy,...input}:null,hasLoanHistory:async()=>false,delete:async id=>id===inventoryCopy.id}
const app=createApp(verifier,()=>new CatalogService(catalogRepository),()=>new CopyService(copyRepository))
let server:Server;let baseUrl:string
before(async()=>{await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',()=>resolve())});const address=server.address();if(!address||typeof address==='string')throw new Error('Could not start test server');baseUrl=`http://127.0.0.1:${address.port}`})
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))})
test('GET /api/health reports API status',async()=>{const response=await fetch(`${baseUrl}/api/health`);const body=await response.json() as {status:string;service:string};assert.equal(response.status,200);assert.equal(body.status,'ok');assert.equal(body.service,'smart-library-api')})
test('protected route rejects a missing token',async()=>{const response=await fetch(`${baseUrl}/api/auth/me`);assert.equal(response.status,401)})
test('protected route returns the verified user',async()=>{const response=await fetch(`${baseUrl}/api/auth/me`,{headers:{Authorization:'Bearer student-token'}});const body=await response.json() as {user:{role:string}};assert.equal(response.status,200);assert.equal(body.user.role,'student')})
test('role middleware allows staff and rejects students',async()=>{const allowed=await fetch(`${baseUrl}/api/auth/staff-check`,{headers:{Authorization:'Bearer staff-token'}});const denied=await fetch(`${baseUrl}/api/auth/staff-check`,{headers:{Authorization:'Bearer student-token'}});assert.equal(allowed.status,200);assert.equal(denied.status,403)})
test('authenticated users can read the catalog',async()=>{const response=await fetch(`${baseUrl}/api/catalog`,{headers:{Authorization:'Bearer student-token'}});const body=await response.json() as {items:BookRecord[]};assert.equal(response.status,200);assert.equal(body.items[0]?.title,'Clean Code')})
test('only staff can create catalog records',async()=>{const input={isbn:'978-0321125217',title:'Domain-Driven Design',author:'Eric Evans',category:'Software Engineering'};const student=await fetch(`${baseUrl}/api/catalog`,{method:'POST',headers:{Authorization:'Bearer student-token','Content-Type':'application/json'},body:JSON.stringify(input)});const staff=await fetch(`${baseUrl}/api/catalog`,{method:'POST',headers:{Authorization:'Bearer staff-token','Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(student.status,403);assert.equal(staff.status,201)})
test('authenticated users can view copies but only staff can add them',async()=>{const list=await fetch(`${baseUrl}/api/catalog/book-1/copies`,{headers:{Authorization:'Bearer student-token'}});const studentCreate=await fetch(`${baseUrl}/api/catalog/book-1/copies`,{method:'POST',headers:{Authorization:'Bearer student-token','Content-Type':'application/json'},body:JSON.stringify({barcode:'NB-0002',shelfLocation:'A-13'})});const staffCreate=await fetch(`${baseUrl}/api/catalog/book-1/copies`,{method:'POST',headers:{Authorization:'Bearer staff-token','Content-Type':'application/json'},body:JSON.stringify({barcode:'NB-0002',shelfLocation:'A-13'})});assert.equal(list.status,200);assert.equal(studentCreate.status,403);assert.equal(staffCreate.status,201)})

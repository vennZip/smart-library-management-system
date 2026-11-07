import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import { createApp } from './app.js'
import type { AuthVerifier } from './auth/supabase-auth.service.js'
const verifier: AuthVerifier = { verifyAccessToken: async token => token === 'staff-token' ? { id: 'user-1', email: 'staff@example.edu', role: 'librarian' } : token === 'student-token' ? { id: 'user-2', email: 'student@example.edu', role: 'student' } : null }
const app=createApp(verifier)
let server:Server;let baseUrl:string
before(async()=>{await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',()=>resolve())});const address=server.address();if(!address||typeof address==='string')throw new Error('Could not start test server');baseUrl=`http://127.0.0.1:${address.port}`})
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))})
test('GET /api/health reports API status',async()=>{const response=await fetch(`${baseUrl}/api/health`);const body=await response.json() as {status:string;service:string};assert.equal(response.status,200);assert.equal(body.status,'ok');assert.equal(body.service,'smart-library-api')})
test('protected route rejects a missing token',async()=>{const response=await fetch(`${baseUrl}/api/auth/me`);assert.equal(response.status,401)})
test('protected route returns the verified user',async()=>{const response=await fetch(`${baseUrl}/api/auth/me`,{headers:{Authorization:'Bearer student-token'}});const body=await response.json() as {user:{role:string}};assert.equal(response.status,200);assert.equal(body.user.role,'student')})
test('role middleware allows staff and rejects students',async()=>{const allowed=await fetch(`${baseUrl}/api/auth/staff-check`,{headers:{Authorization:'Bearer staff-token'}});const denied=await fetch(`${baseUrl}/api/auth/staff-check`,{headers:{Authorization:'Bearer student-token'}});assert.equal(allowed.status,200);assert.equal(denied.status,403)})

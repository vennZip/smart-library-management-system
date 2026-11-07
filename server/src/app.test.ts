import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import { app } from './app.js'
let server:Server;let baseUrl:string
before(async()=>{await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',()=>resolve())});const address=server.address();if(!address||typeof address==='string')throw new Error('Could not start test server');baseUrl=`http://127.0.0.1:${address.port}`})
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))})
test('GET /api/health reports API status',async()=>{const response=await fetch(`${baseUrl}/api/health`);const body=await response.json() as {status:string;service:string};assert.equal(response.status,200);assert.equal(body.status,'ok');assert.equal(body.service,'smart-library-api')})

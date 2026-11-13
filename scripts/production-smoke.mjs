import assert from 'node:assert/strict'

const clientUrl=(process.env.CLIENT_URL??'').replace(/\/$/,'')
const apiUrl=(process.env.API_URL??'').replace(/\/$/,'')
if(!clientUrl||!apiUrl){console.error('Set CLIENT_URL and API_URL before running the production smoke test.');process.exit(2)}

async function request(url,options){const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15_000),...options});return response}
async function requestWithRetry(url,attempts=3){let lastError;for(let attempt=1;attempt<=attempts;attempt+=1){try{return await request(url)}catch(error){lastError=error;if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,2_000))}}throw lastError}
async function check(name,run){try{await run();console.log(`PASS ${name}`)}catch(error){console.error(`FAIL ${name}: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1}}

await check('API health and service identity',async()=>{const response=await requestWithRetry(`${apiUrl}/api/health`);assert.equal(response.status,200);const body=await response.json();assert.equal(body.status,'ok');assert.equal(body.service,'smart-library-api');assert.ok(response.headers.get('x-request-id'))})
await check('API security headers',async()=>{const response=await request(`${apiUrl}/api/health`);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('x-frame-options'),'DENY');assert.match(response.headers.get('content-security-policy')??'',/frame-ancestors 'none'/)})
await check('Protected API rejects anonymous access consistently',async()=>{const response=await request(`${apiUrl}/api/catalog`);assert.equal(response.status,401);const body=await response.json();assert.equal(body.error.code,'AUTH_REQUIRED');assert.ok(body.error.requestId)})
await check('Production CORS allows the deployed client',async()=>{const response=await request(`${apiUrl}/api/health`,{headers:{Origin:clientUrl}});assert.equal(response.headers.get('access-control-allow-origin'),clientUrl)})
for(const path of ['/login','/catalog','/analytics'])await check(`SPA fallback serves ${path}`,async()=>{const response=await request(`${clientUrl}${path}`);assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/text\/html/);const html=await response.text();assert.match(html,/<div id="root"><\/div>/)})

if(process.exitCode)process.exit(process.exitCode)
console.log('Production smoke test completed without mutating application data.')

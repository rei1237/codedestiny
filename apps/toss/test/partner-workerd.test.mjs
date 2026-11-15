import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {Miniflare} from 'miniflare';
import {fileURLToPath} from 'node:url';

test('partner login runs in Workers and rejects redirects without forwarding credentials',async()=>{
  const entry=fileURLToPath(new URL('../../../worker/toss/partner.js',import.meta.url));
  const script=buildSync({stdin:{contents:`import {loginIdentity} from ${JSON.stringify(entry)};
    export default {async fetch(request,env) {
      try {return Response.json(await loginIdentity(env,{authorizationCode:'mock-code',referrer:'DEFAULT'}));}
      catch(error) {return Response.json({code:error.code},{status:error.status||500});}
    }};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'}).outputFiles[0].text;
  let redirect=false;
  const calls=[];
  const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-01-01',
    bindings:{TOSS_MTLS_EXPIRES_AT:'2099-01-01'},
    outboundService:()=>{throw new Error('External network forbidden');},
    serviceBindings:{TOSS_MTLS:async request=>{
      calls.push(new URL(request.url).pathname);
      if(redirect)return new Response(null,{status:302,headers:{Location:'https://forbidden.invalid/'}});
      return Response.json({resultType:'SUCCESS',success:request.url.endsWith('generate-token')
        ?{accessToken:'mock-token'}:{userKey:123,email:null}});
    }}});
  try {
    const response=await mf.dispatchFetch('http://localhost/');
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{userKey:'123',referrer:'DEFAULT'});
    assert.equal(calls.length,2);
    redirect=true;
    const rejected=await mf.dispatchFetch('http://localhost/');
    assert.equal(rejected.status,502);
    assert.deepEqual(await rejected.json(),{code:'TOSS_PARTNER_UNAVAILABLE'});
    assert.equal(calls.length,3);
  } finally {await mf.dispose();}
});

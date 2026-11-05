import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {manageEditions,readIssueQueue} from '../../worker/routes/edition-studio.js';
import {readTestProof} from '../../worker/routes/edition-test-records.js';
import {readReleaseQueue} from './staging-queue.mjs';
import {publishStaging} from './publish-staging.mjs';
import {TEST_ORIGIN,TEST_PREFIX,TEST_RECORDS,TEST_ENVIRONMENT,testIssueUrl} from '../../lib/editions/production-test.mjs';

test('production test: isolated namespace, cap, replay pins, anonymous proofs and QR',async t=>{
  const objects=new Map(); let version=0,dispatches=0;
  const bucket={
    async get(key){const stored=objects.get(key);return stored?{etag:stored.etag,json:async()=>JSON.parse(stored.body),body:stored.body}:null;},
    async put(key,body,{onlyIf}={}) {
      const current=objects.get(key);
      if(onlyIf && (onlyIf instanceof Headers ? !!current : current?.etag!==onlyIf.etagMatches))return null;
      const entry={etag:String(++version),body};objects.set(key,entry);return entry;
    }
  };
  const env={NODE_ENV:'production',INSIGHT_IMAGES_BUCKET:bucket};
  const req=(body,origin=TEST_ORIGIN)=>new Request(origin+'/api/admin/editions',body?{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{});
  const dispatch=async()=>{dispatches++;};
  const post=body=>manageEditions(req(body),env,dispatch);
  const item={action:'add',id:crypto.randomUUID(),title:'연이 부적1',character:'yeoni',cap:2};
  for(const origin of ['https://staging.code-destiny.com','https://example.com']) await assert.rejects(manageEditions(req(item,origin),env,dispatch));
  await assert.rejects(manageEditions(req(item),{...env,APP_ENV:'staging'},dispatch));
  const race=await Promise.allSettled([post(item),post(item)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  await post(item);
  assert.equal(objects.size,1);
  assert.ok(objects.has(TEST_PREFIX+'products.json'));
  const mint={action:'mint',id:item.id,serial:1};
  const requests=await Promise.allSettled([post(mint),post(mint)]);
  assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);
  await post(mint); assert.equal(dispatches,1);
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'test-editions-'));
  t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  const fetcher=url=>url.endsWith('issue-queue')?readIssueQueue(new Request(url),env):readTestProof(new Request(url),env);
  const entries=await readReleaseQueue(fetcher,true);
  const catalog=await publishStaging({target:'production-test',origin:TEST_ORIGIN,directory:folder,stateRoot:folder,entries});
  const code=catalog[0].code;
  const proof=JSON.parse(await fs.readFile(path.join(folder,TEST_RECORDS,code+'.json'),'utf8'));
  assert.equal(proof.chainId,31337);
  assert.equal(proof.serial,1);assert.equal(proof.title,item.title);assert.equal(proof.environment,TEST_ENVIRONMENT);
  const pixels=await sharp(path.join(folder,TEST_RECORDS,code+'.png')).resize(220,220).ensureAlpha().raw().toBuffer();
  assert.equal(jsQR(new Uint8ClampedArray(pixels),220,220)?.data,testIssueUrl(code));
  await bucket.put(TEST_PREFIX+code+'.json',JSON.stringify(proof));
  assert.equal((await fetcher(TEST_ORIGIN+TEST_RECORDS+'/'+code+'.json')).status,404);
  await bucket.put(TEST_PREFIX+'index.json',JSON.stringify({environment:TEST_ENVIRONMENT,items:catalog}));
  const publicProof=await fetcher(TEST_ORIGIN+TEST_RECORDS+'/'+code+'.json');
  assert.equal(publicProof.status,200);
  assert.equal((await publicProof.json()).tx,proof.tx);
  assert.equal((await fetcher(TEST_ORIGIN+TEST_RECORDS+'/products.json')).status,404);
  assert.equal((await readTestProof(new Request(TEST_ORIGIN+TEST_RECORDS+'/'+code+'.json',{method:'POST'}),env)).status,405);
  await post({...mint,serial:2});
  const nextEntries=await readReleaseQueue(fetcher,true);
  const next=await publishStaging({target:'production-test',origin:TEST_ORIGIN,directory:folder,stateRoot:folder,entries:nextEntries});
  assert.deepEqual(next[0],catalog[0]); assert.equal(next.length,2);
  await assert.rejects(post({...mint,serial:3}),/한도/);
  nextEntries[0].pins[0]='0'.repeat(64);
  await assert.rejects(publishStaging({target:'production-test',origin:TEST_ORIGIN,directory:folder,stateRoot:folder,entries:nextEntries}),/불일치/);
  await assert.rejects(publishStaging({target:'mainnet',origin:TEST_ORIGIN,directory:folder,stateRoot:folder,entries}),/전용/);
});


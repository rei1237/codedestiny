import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import jsQR from 'jsqr';
import {manageEditions,readIssueQueue} from '../../worker/routes/edition-studio.js';
import {readReleaseQueue} from './staging-queue.mjs';
import {publishStaging} from './publish-staging.mjs';
import {STAGING_ORIGIN,RECORDS,issueUrl} from '../../lib/editions/staging.mjs';

test('named staging products survive reload, retries and releases; customer QR decodes at print size',async t=>{
  // Isolate the same conditional-write semantics used by the staging R2 binding.
  let version=0, stored, dispatches=0;
  const bucket={
    async get(){const value=stored;return value ? {etag:String(version),json:async()=>JSON.parse(value)} : null;},
    async put(key,body,{onlyIf}){
      if (version===0 ? onlyIf.etagDoesNotMatch!=='*' : onlyIf.etagMatches!==String(version)) return null;
      stored=body;version++;return {etag:String(version)};
    }
  };
  const env={APP_ENV:'staging',INSIGHT_IMAGES_BUCKET:bucket};
  const id=crypto.randomUUID();
  const request=body=>new Request(STAGING_ORIGIN+'/api/admin/editions',body?{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  const dispatch=async()=>{dispatches++;};
  const post=body=>manageEditions(request(body),env,dispatch);
  const product={action:'add',title:'달빛을 품은 영냥이',id,character:'cat',cap:2};
  await assert.rejects(manageEditions(request(product),{...env,APP_ENV:'production'},dispatch),/찾을 수/);
  await assert.rejects(post({...product,cap:0}),/한도/);
  await post(product);
  assert.equal((await (await post(product)).json()).products.length,1);
  assert.deepEqual((await (await readIssueQueue(request(),env)).json()).products,[]);
  const mint={action:'mint',id,serial:1};
  const race=await Promise.allSettled([post(mint),post(mint)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
  await post(mint);
  assert.equal(dispatches,1);
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'edition-qa-'));
  t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  let catalog=[];
  const fetchQueue=async url=>url.endsWith('index.json') ?
    Response.json({environment:'staging-rehearsal',items:catalog}) : readIssueQueue(request(),env);
  const release=async()=>publishStaging({target:'staging',origin:STAGING_ORIGIN,directory:folder,stateRoot:folder,
    entries:await readReleaseQueue(fetchQueue)});
  catalog=await release();
  assert.equal(catalog.length,1);
  assert.equal(catalog[0].title,product.title);
  const first={...catalog[0]};
  const pngPath=path.join(folder,RECORDS,first.code+'.png');
  const pixels=await sharp(pngPath).resize(220,220).ensureAlpha().raw().toBuffer();
  assert.equal(jsQR(new Uint8ClampedArray(pixels),220,220)?.data,issueUrl(first.code));
  const queued=await manageEditions(request({...mint,serial:2}),env,async()=>{throw Error('unavailable');});
  assert.match((await queued.json()).notice,/예약/);
  catalog=await release();
  assert.deepEqual(catalog[0],first);
  assert.equal(catalog.length,2);
  await assert.rejects(post({...mint,serial:3}),/한도/);
  catalog[0].pin='0'.repeat(64);
  await assert.rejects(release(),/불일치/);
});
